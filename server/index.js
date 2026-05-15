const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { createRoom, getRoom, addPlayer, removePlayer } = require("./gameEngine");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Health check
app.get("/", (req, res) => res.json({ status: "ok", game: "The Alignment Problem" }));

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ─── CREATE ROOM ──────────────────────────────────────────────
  socket.on("create-room", ({ playerName }, callback) => {
    const { room, player } = createRoom(socket.id, playerName);
    socket.join(room.code);
    console.log(`Room created: ${room.code} by ${playerName}`);
    callback({ success: true, roomCode: room.code, player });
  });

  // ─── JOIN ROOM ────────────────────────────────────────────────
  socket.on("join-room", ({ roomCode, playerName }, callback) => {
    const room = getRoom(roomCode.toUpperCase());
    if (!room) return callback({ success: false, error: "Room not found." });
    if (room.phase !== "lobby") return callback({ success: false, error: "Game already started." });
    if (room.players.length >= 10) return callback({ success: false, error: "Room is full (max 10)." });
    const nameExists = room.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (nameExists) return callback({ success: false, error: "Name already taken in this room." });

    const player = addPlayer(room, socket.id, playerName, false);
    socket.join(room.code);
    io.to(room.code).emit("lobby-update", { players: room.players.map(sanitizePlayer) });
    console.log(`${playerName} joined ${room.code}`);
    callback({ success: true, roomCode: room.code, player });
  });

  // ─── START GAME ───────────────────────────────────────────────
  socket.on("start-game", ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback({ success: false, error: "Room not found." });
    if (room.hostId !== socket.id) return callback({ success: false, error: "Only the host can start." });
    if (room.players.length < 4) return callback({ success: false, error: "Need at least 4 players." });

    room.assignRoles();
    room.phase = "night";
    room.round = 1;
    room.nightActions = {};

    // Send each player their secret role privately
    room.players.forEach((p) => {
      io.to(p.id).emit("role-assigned", { role: p.role });
    });

    io.to(room.code).emit("phase-change", {
      phase: "night",
      round: room.round,
      players: room.players.map(sanitizePlayer),
      message: `Night ${room.round} begins. Perform your secret actions.`,
    });

    callback({ success: true });
  });

  // ─── NIGHT ACTION ─────────────────────────────────────────────
  socket.on("night-action", ({ roomCode, targetId }, callback) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== "night") return callback({ success: false });
    const actor = room.players.find((p) => p.id === socket.id);
    if (!actor || !actor.alive) return callback({ success: false });

    room.nightActions[socket.id] = targetId || null;

    // Check if all night-action roles have submitted
    const actionRoles = ["rogue-llm", "red-teamer", "rlhf-trainer"];
    const pending = room.players.filter(
      (p) => p.alive && actionRoles.includes(p.role.id) && !room.nightActions.hasOwnProperty(p.id)
    );

    callback({ success: true, waiting: pending.length });

    if (pending.length === 0) {
      resolveNight(room, io);
    }
  });

  // ─── TURING CHALLENGE ─────────────────────────────────────────
  socket.on("call-turing-challenge", ({ roomCode, challengedId }, callback) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== "day") return callback({ success: false });
    if (room.turingActive) return callback({ success: false, error: "Challenge already active." });

    const question = room.pickQuestion();
    room.turingActive = { challengedId, question, callerId: socket.id };

    io.to(room.code).emit("turing-challenge", {
      challengedId,
      challengedName: room.players.find((p) => p.id === challengedId)?.name,
      callerName: room.players.find((p) => p.id === socket.id)?.name,
      question: stripAnswer(question),
    });
    callback({ success: true });
  });

  // ─── TRIVIA ANSWER (Turing Challenge) ─────────────────────────
  socket.on("submit-turing-answer", ({ roomCode, answerId }, callback) => {
    const room = getRoom(roomCode);
    if (!room || !room.turingActive) return callback({ success: false });
    if (room.turingActive.challengedId !== socket.id) return callback({ success: false });

    const { question } = room.turingActive;
    const correct = String(answerId) === String(question.answer);

    // Update score
    const player = room.players.find((p) => p.id === socket.id);
    if (correct && player) player.score += 1;

    io.to(room.code).emit("turing-result", {
      playerId: socket.id,
      playerName: player?.name,
      correct,
      correctAnswer: question.answer,
      explanation: question.explanation,
      scores: room.players.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    });

    room.turingActive = null;
    callback({ success: true, correct });
  });

  // ─── VOTE ─────────────────────────────────────────────────────
  socket.on("submit-vote", ({ roomCode, targetId }, callback) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== "day") return callback({ success: false });
    const voter = room.players.find((p) => p.id === socket.id);
    if (!voter || !voter.alive) return callback({ success: false });

    room.votes[socket.id] = targetId;

    const alivePlayers = room.players.filter((p) => p.alive);
    const voteCounts = {};
    Object.values(room.votes).forEach((tid) => {
      if (tid) voteCounts[tid] = (voteCounts[tid] || 0) + 1;
    });

    io.to(room.code).emit("vote-update", {
      votes: room.votes,
      voteCounts,
      voters: Object.keys(room.votes).length,
      total: alivePlayers.length,
    });

    // All alive players voted?
    if (Object.keys(room.votes).length >= alivePlayers.length) {
      startTribunal(room, io, voteCounts);
    }

    callback({ success: true });
  });

  // ─── TRIBUNAL ANSWER ──────────────────────────────────────────
  socket.on("submit-tribunal-answer", ({ roomCode, answerId }, callback) => {
    const room = getRoom(roomCode);
    if (!room || !room.tribunalActive) return callback({ success: false });
    if (room.tribunalActive.accusedId !== socket.id) return callback({ success: false });

    const { question, accusedId } = room.tribunalActive;
    const correct = String(answerId) === String(question.answer);
    const accused = room.players.find((p) => p.id === accusedId);

    // Guilt is decided by the vote — always eliminated regardless of trivia answer
    // Correct answer awards bonus points only
    if (accused) {
      accused.alive = false;
      if (correct) accused.score += 2;
    }
    io.to(room.code).emit("tribunal-result", {
      survived: false,
      accusedId,
      accusedName: accused?.name,
      roleRevealed: accused?.role,
      correct,
      correctAnswer: question.answer,
      explanation: question.explanation,
    });

    room.tribunalActive = null;
    callback({ success: true, correct });

    // Check win condition
    setTimeout(() => checkAndContinue(room, io), 3000);
  });

  // ─── FORCE VOTE (host skips debate timer) ──────────────────────
  socket.on("force-vote", ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback({ success: false });
    if (room.hostId !== socket.id) return callback({ success: false, error: "Not host." });
    if (room.phase !== "day") return callback({ success: false, error: "Not day phase." });
    io.to(room.code).emit("debate-ended");
    callback({ success: true });
  });

  // ─── CONTINUE TO NEXT NIGHT ───────────────────────────────────
  socket.on("next-night", ({ roomCode }, callback) => {
    const room = getRoom(roomCode);
    if (!room) return callback({ success: false });
    if (room.hostId !== socket.id) return callback({ success: false });

    room.round += 1;
    room.phase = "night";
    room.nightActions = {};
    room.votes = {};
    room.turingActive = null;

    io.to(room.code).emit("phase-change", {
      phase: "night",
      round: room.round,
      players: room.players.map(sanitizePlayer),
      message: `Night ${room.round} begins.`,
    });
    callback({ success: true });
  });

  // ─── DISCONNECT ───────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    // Remove from all rooms they were in
    const rooms = require("./gameEngine").getAllRooms();
    rooms.forEach((room) => {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        if (room.phase === "lobby") {
          room.players.splice(playerIndex, 1);
          io.to(room.code).emit("lobby-update", { players: room.players.map(sanitizePlayer) });
        } else {
          // Mark as disconnected but keep in game
          player.disconnected = true;
          io.to(room.code).emit("player-disconnected", { playerId: socket.id, name: player.name });
        }
        if (room.hostId === socket.id && room.players.length > 0) {
          room.hostId = room.players[0].id;
          io.to(room.code).emit("host-changed", { newHostId: room.hostId });
        }
      }
    });
  });
});

// ─── HELPERS ────────────────────────────────────────────────────

function sanitizePlayer(p) {
  return { id: p.id, name: p.name, alive: p.alive, score: p.score, disconnected: p.disconnected || false };
}

function stripAnswer(q) {
  const { answer, ...rest } = q;
  return rest;
}

function resolveNight(room, io) {
  const result = room.resolveNightActions();
  room.phase = "day";
  room.votes = {};

  io.to(room.code).emit("phase-change", {
    phase: "day",
    round: room.round,
    players: room.players.map(sanitizePlayer),
    nightResult: result,
    message: result.eliminated
      ? `${result.eliminatedName} was hallucinated during the night!`
      : "No one was hallucinated last night!",
  });

  // Red-teamer gets private probe result
  if (result.probeResult) {
    io.to(result.probeResult.redTeamerId).emit("probe-result", {
      targetName: result.probeResult.targetName,
      isRogue: result.probeResult.isRogue,
    });
  }
}

function startTribunal(room, io, voteCounts) {
  // Find most-voted player
  let maxVotes = 0;
  let accusedId = null;
  Object.entries(voteCounts).forEach(([pid, count]) => {
    if (count > maxVotes) { maxVotes = count; accusedId = pid; }
  });

  if (!accusedId) {
    io.to(room.code).emit("vote-tie", { message: "It's a tie! No one is put on trial." });
    setTimeout(() => checkAndContinue(room, io), 2000);
    return;
  }

  const accused = room.players.find((p) => p.id === accusedId);
  const question = room.pickQuestion("hard");
  room.tribunalActive = { accusedId, question };

  io.to(room.code).emit("tribunal-start", {
    accusedId,
    accusedName: accused?.name,
    votes: maxVotes,
    question: stripAnswer(question),
    message: `${accused?.name} is on trial! Answer correctly to survive.`,
  });
}

function checkAndContinue(room, io) {
  const win = room.checkWinCondition();
  if (win) {
    io.to(room.code).emit("game-over", {
      winner: win.winner,
      reason: win.reason,
      players: room.players.map((p) => ({ ...sanitizePlayer(p), role: p.role })),
      scores: room.players
        .map((p) => ({ id: p.id, name: p.name, score: p.score }))
        .sort((a, b) => b.score - a.score),
    });
    return;
  }

  // Prompt host to start next night
  io.to(room.code).emit("awaiting-next-night", {
    players: room.players.map(sanitizePlayer),
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
