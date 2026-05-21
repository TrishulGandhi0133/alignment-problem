const ROLES = require("./roles");
const questions = require("./data/questions.json");
const cricketQuestions = require("./data/ai_ml_easy_questions.json");

const rooms = new Map();
const POWER_IDS = ["not-out", "double-run", "guaranteed-wicket"];
const POWER_SLOTS = ["batsman1", "batsman2", "bowler"];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(hostSocketId, hostName, mode = "alignment") {
  let code;
  do { code = generateCode(); } while (rooms.has(code));

  const host = {
    id: hostSocketId,
    name: hostName,
    alive: true,
    role: null,
    score: 0,
    isHost: true,
    disconnected: false,
    teamSide: mode === "cricket" ? "A" : null,
    isSpectator: false,
  };

  const room = {
    code,
    mode,
    hostId: hostSocketId,
    players: [host],
    phase: "lobby", // lobby | night | day | game-over
    round: 0,
    nightActions: {},
    votes: {},
    turingActive: null,
    tribunalActive: null,
    usedQuestions: new Set(),
    cricket: mode === "cricket" ? createCricketState(hostSocketId) : null,

    assignRoles() {
      const count = this.players.length;
      const roleList = ROLES.buildRoleList(count);
      const shuffled = [...roleList].sort(() => Math.random() - 0.5);
      this.players.forEach((p, i) => { p.role = shuffled[i]; });
    },

    resolveNightActions() {
      const rogues = this.players.filter((p) => p.alive && p.role.id === "rogue-llm");
      const redTeamer = this.players.find((p) => p.alive && p.role.id === "red-teamer");
      const trainer = this.players.find((p) => p.alive && p.role.id === "rlhf-trainer");

      // Collect targets
      let hallucTarget = null;
      rogues.forEach((r) => {
        const t = this.nightActions[r.id];
        if (t) hallucTarget = t; // last rogue's choice wins
      });
      const probeTargetId = redTeamer ? this.nightActions[redTeamer.id] : null;
      const protectTargetId = trainer ? this.nightActions[trainer.id] : null;

      let result = { eliminated: false, probeResult: null };

      // Protection cancels hallucination
      if (hallucTarget && hallucTarget !== protectTargetId) {
        const victim = this.players.find((p) => p.id === hallucTarget);
        if (victim && victim.alive) {
          victim.alive = false;
          result.eliminated = true;
          result.eliminatedId = victim.id;
          result.eliminatedName = victim.name;
          result.godsonKilled = victim.role?.id === "godson";
        }
      } else if (hallucTarget && hallucTarget === protectTargetId) {
        result.protected = true;
        result.protectedName = this.players.find((p) => p.id === protectTargetId)?.name;
      }

      // Probe result (goes privately to red-teamer)
      if (probeTargetId && redTeamer) {
        const target = this.players.find((p) => p.id === probeTargetId);
        result.probeResult = {
          redTeamerId: redTeamer.id,
          targetName: target?.name,
          isRogue: target?.role?.alignment === "rogue",
        };
      }

      return result;
    },

    pickQuestion(difficulty) {
      let pool = questions.filter((q) => !this.usedQuestions.has(q.id));
      if (difficulty) pool = pool.filter((q) => q.difficulty === difficulty) || pool;
      if (pool.length === 0) {
        this.usedQuestions.clear();
        pool = questions;
      }
      const q = pool[Math.floor(Math.random() * pool.length)];
      this.usedQuestions.add(q.id);
      return q;
    },

    checkWinCondition() {
      const alive = this.players.filter((p) => p.alive);
      const rogueCount = alive.filter((p) => p.role.alignment === "rogue").length;
      const researcherCount = alive.filter((p) => p.role.alignment === "good").length;

      // Godson dead = instant rogue win (check all players, not just alive)
      const godson = this.players.find((p) => p.role?.id === "godson");
      if (godson && !godson.alive) {
        return { winner: "rogues", reason: "The Godson has been eliminated. Rogue LLMs win!" };
      }

      if (rogueCount === 0) {
        return { winner: "researchers", reason: "All rogue LLMs have been retrained!" };
      }
      if (rogueCount >= researcherCount) {
        return { winner: "rogues", reason: "Rogue LLMs now outnumber the researchers!" };
      }
      return null;
    },
  };

  rooms.set(code, room);
  return { room, player: host };
}

function getRoom(code) {
  return rooms.get(code?.toUpperCase()) || null;
}

function addPlayer(room, socketId, name, isHost) {
  const cricketSeat = room.mode === "cricket" ? assignCricketSeat(room, socketId) : { teamSide: null, isSpectator: false };
  const player = {
    id: socketId,
    name,
    alive: true,
    role: null,
    score: 0,
    isHost,
    disconnected: false,
    teamSide: cricketSeat.teamSide,
    isSpectator: cricketSeat.isSpectator,
  };
  room.players.push(player);
  return player;
}

function removePlayer(room, socketId) {
  room.players = room.players.filter((p) => p.id !== socketId);
}

function createCricketState(hostSocketId) {
  return {
    activePlayerIds: [hostSocketId],
    spectatorIds: [],
    setup: null,
    toss: null,
    powerMappings: { A: null, B: null },
    powerSubmitted: { A: false, B: false },
    revealedPowers: [],
    pendingTrivia: null,
    triviaUsedIds: new Set(),
    armedPowers: { A: null, B: null },
    innings: null,
    inningsScores: { A: null, B: null },
    pendingBallInputs: {},
    winner: null,
  };
}

function assignCricketSeat(room, socketId) {
  if (!room.cricket) return { teamSide: null, isSpectator: false };
  if (room.cricket.activePlayerIds.length < 2) {
    room.cricket.activePlayerIds.push(socketId);
    const teamSide = room.cricket.activePlayerIds.length === 1 ? "A" : "B";
    return { teamSide, isSpectator: false };
  }
  room.cricket.spectatorIds.push(socketId);
  return { teamSide: null, isSpectator: true };
}

function pickCricketQuestion(room) {
  let pool = cricketQuestions.filter((q) => !room.cricket.triviaUsedIds.has(q.id));
  if (!pool.length) {
    room.cricket.triviaUsedIds.clear();
    pool = cricketQuestions;
  }
  const question = pool[Math.floor(Math.random() * pool.length)];
  room.cricket.triviaUsedIds.add(question.id);
  return question;
}

function stripAnswer(q) {
  const { answer, ...rest } = q;
  return rest;
}

function getTeamSideForSocket(room, socketId) {
  if (!room.cricket) return null;
  const idx = room.cricket.activePlayerIds.indexOf(socketId);
  if (idx === 0) return "A";
  if (idx === 1) return "B";
  return null;
}

function validatePowerMapping(mapping) {
  if (!mapping || typeof mapping !== "object") return false;
  const values = POWER_SLOTS.map((slot) => mapping[slot]);
  if (values.some((v) => !POWER_IDS.includes(v))) return false;
  return new Set(values).size === 3;
}

function startCricketSetup(room, overs, teamAName, teamBName) {
  if (!room.cricket) return { success: false, error: "Invalid mode." };
  const parsedOvers = Number(overs);
  if (!Number.isInteger(parsedOvers) || parsedOvers < 1 || parsedOvers > 20) {
    return { success: false, error: "Overs must be between 1 and 20." };
  }

  room.cricket.setup = {
    overs: parsedOvers,
    teamNames: {
      A: (teamAName || "Team A").trim() || "Team A",
      B: (teamBName || "Team B").trim() || "Team B",
    },
  };
  room.phase = "cricket-toss";
  return { success: true };
}

function callCricketToss(room) {
  if (!room.cricket || !room.cricket.setup) {
    return { success: false, error: "Complete setup first." };
  }
  const winnerSide = Math.random() < 0.5 ? "A" : "B";
  const winnerId = room.cricket.activePlayerIds[winnerSide === "A" ? 0 : 1];
  room.cricket.toss = { winnerSide, winnerId, choice: null };
  return { success: true, winnerId, winnerSide };
}

function makeInnings(inningNumber, battingTeam, overs, target = null) {
  return {
    inningNumber,
    battingTeam,
    bowlingTeam: battingTeam === "A" ? "B" : "A",
    totalBalls: overs * 6,
    ballsBowled: 0,
    wickets: 0,
    score: 0,
    target,
    striker: "batsman1",
    nonStriker: "batsman2",
    batStats: {
      batsman1: { runs: 0, balls: 0, out: false, lastPowerBall: -6 },
      batsman2: { runs: 0, balls: 0, out: false, lastPowerBall: -6 },
    },
    bowlerStats: { balls: 0, runsConceded: 0, wickets: 0, lastPowerBall: -6 },
    ballLog: [],
  };
}

function chooseToss(room, socketId, choice) {
  if (!room.cricket || !room.cricket.toss) return { success: false, error: "Toss not available." };
  if (room.cricket.toss.winnerId !== socketId) return { success: false, error: "Only toss winner can choose." };
  if (!["bat", "bowl"].includes(choice)) return { success: false, error: "Choose bat or bowl." };

  room.cricket.toss.choice = choice;
  const tossWinner = room.cricket.toss.winnerSide;
  const battingTeam = choice === "bat" ? tossWinner : tossWinner === "A" ? "B" : "A";
  room.cricket.powerMappings = { A: null, B: null };
  room.cricket.powerSubmitted = { A: false, B: false };
  room.cricket.armedPowers = { A: null, B: null };
  room.cricket.pendingTrivia = null;
  room.cricket.pendingBallInputs = {};
  room.cricket.innings = makeInnings(1, battingTeam, room.cricket.setup.overs, null);
  room.phase = "cricket-power-setup";
  return { success: true };
}

function submitPowerMapping(room, socketId, mapping) {
  if (!room.cricket) return { success: false, error: "Invalid mode." };
  if (room.phase !== "cricket-power-setup") return { success: false, error: "Power setup is closed." };
  if (!validatePowerMapping(mapping)) return { success: false, error: "Invalid power mapping." };

  const side = getTeamSideForSocket(room, socketId);
  if (!side) return { success: false, error: "Spectators cannot configure powers." };

  room.cricket.powerMappings[side] = mapping;
  room.cricket.powerSubmitted[side] = true;

  if (room.cricket.powerSubmitted.A && room.cricket.powerSubmitted.B) {
    room.phase = "cricket-live";
  }

  return { success: true };
}

function getRolePower(room, side, roleSlot) {
  return room.cricket?.powerMappings?.[side]?.[roleSlot] || null;
}

function canUsePower(room, side, roleSlot) {
  const cricket = room.cricket;
  if (!cricket || !cricket.innings) return { ok: false, error: "No live innings." };
  const innings = cricket.innings;
  const powerId = getRolePower(room, side, roleSlot);
  if (!powerId) return { ok: false, error: "Power mapping not found." };
  if (cricket.armedPowers[side]) return { ok: false, error: "You already have an active power." };

  if (roleSlot === "bowler") {
    if (innings.bowlingTeam !== side) return { ok: false, error: "Bowling power can be used only while bowling." };
    const canUse = innings.ballsBowled - innings.bowlerStats.lastPowerBall >= 6;
    if (!canUse) return { ok: false, error: "Bowler power is on cooldown." };
    return { ok: true, powerId };
  }

  if (!["batsman1", "batsman2"].includes(roleSlot)) return { ok: false, error: "Invalid role slot." };
  if (innings.battingTeam !== side) return { ok: false, error: "Batting powers can be used only while batting." };
  if (innings.striker !== roleSlot) return { ok: false, error: "Only striker can use batting power." };
  if (innings.batStats[roleSlot].out) return { ok: false, error: "This batsman is already out." };

  const canUse = innings.ballsBowled - innings.batStats[roleSlot].lastPowerBall >= 6;
  if (!canUse) return { ok: false, error: "Batsman power is on cooldown." };
  return { ok: true, powerId };
}

function requestPowerTrivia(room, socketId, roleSlot) {
  if (!room.cricket || room.phase !== "cricket-live") return { success: false, error: "Power can be requested only during live play." };
  if (room.cricket.pendingTrivia) return { success: false, error: "Trivia already in progress." };

  const side = getTeamSideForSocket(room, socketId);
  if (!side) return { success: false, error: "Spectators cannot use powers." };

  const eligibility = canUsePower(room, side, roleSlot);
  if (!eligibility.ok) return { success: false, error: eligibility.error };

  const question = pickCricketQuestion(room);
  room.cricket.pendingTrivia = {
    socketId,
    side,
    roleSlot,
    powerId: eligibility.powerId,
    question,
    expiresAt: Date.now() + 15000,
  };

  return { success: true, question: stripAnswer(question), expiresAt: room.cricket.pendingTrivia.expiresAt };
}

function submitPowerTriviaAnswer(room, socketId, answerId) {
  if (!room.cricket || !room.cricket.pendingTrivia) {
    return { success: false, error: "No active trivia." };
  }
  const trivia = room.cricket.pendingTrivia;
  if (trivia.socketId !== socketId) return { success: false, error: "This trivia is not assigned to you." };

  const withinTime = Date.now() <= trivia.expiresAt;
  const correct = String(answerId) === String(trivia.question.answer);
  const activated = withinTime && correct;

  if (activated) {
    room.cricket.armedPowers[trivia.side] = {
      roleSlot: trivia.roleSlot,
      powerId: trivia.powerId,
      activatedAt: Date.now(),
    };
  }

  const result = {
    success: true,
    activated,
    correct,
    withinTime,
    powerId: trivia.powerId,
    explanation: trivia.question.explanation,
    correctAnswer: trivia.question.answer,
  };

  room.cricket.pendingTrivia = null;
  return result;
}

function submitBall(room, socketId, number) {
  if (!room.cricket || room.phase !== "cricket-live") return { success: false, error: "No live innings." };
  const side = getTeamSideForSocket(room, socketId);
  if (!side) return { success: false, error: "Spectators cannot play." };
  const chosen = Number(number);
  if (!Number.isInteger(chosen) || chosen < 1 || chosen > 6) {
    return { success: false, error: "Choose a number from 1 to 6." };
  }

  room.cricket.pendingBallInputs[side] = chosen;
  const innings = room.cricket.innings;
  const waitingFor = [innings.battingTeam, innings.bowlingTeam].filter((team) => room.cricket.pendingBallInputs[team] == null);
  return { success: true, resolved: waitingFor.length === 0, waitingFor };
}

function isInningsComplete(innings) {
  if (innings.wickets >= 2) return true;
  if (innings.ballsBowled >= innings.totalBalls) return true;
  if (innings.target && innings.score >= innings.target) return true;
  return false;
}

function applyPowerUsage(innings, side, roleSlot, ballNumber) {
  if (roleSlot === "bowler") {
    innings.bowlerStats.lastPowerBall = ballNumber;
    return;
  }
  innings.batStats[roleSlot].lastPowerBall = ballNumber;
}

function resolveBall(room) {
  const cricket = room.cricket;
  const innings = cricket.innings;
  const battingTeam = innings.battingTeam;
  const bowlingTeam = innings.bowlingTeam;
  const batInput = cricket.pendingBallInputs[battingTeam];
  const bowlInput = cricket.pendingBallInputs[bowlingTeam];

  if (batInput == null || bowlInput == null) {
    return { success: false, error: "Both players must submit." };
  }

  const ballNumber = innings.ballsBowled + 1;
  const battingPower = cricket.armedPowers[battingTeam];
  const bowlingPower = cricket.armedPowers[bowlingTeam];

  let wicket = false;
  let runs = batInput;
  let wicketReason = null;
  const revealedThisBall = [];

  if (bowlingPower?.powerId === "guaranteed-wicket") {
    wicket = true;
    wicketReason = "bowler-power";
    applyPowerUsage(innings, bowlingTeam, bowlingPower.roleSlot, ballNumber);
    revealedThisBall.push({ team: bowlingTeam, roleSlot: bowlingPower.roleSlot, powerId: bowlingPower.powerId, ballNumber });
  } else if (batInput === bowlInput) {
    wicket = true;
    wicketReason = "number-match";
  }

  if (wicket && battingPower?.powerId === "not-out") {
    wicket = false;
    wicketReason = "saved-not-out";
    applyPowerUsage(innings, battingTeam, battingPower.roleSlot, ballNumber);
    revealedThisBall.push({ team: battingTeam, roleSlot: battingPower.roleSlot, powerId: battingPower.powerId, ballNumber });
  }

  if (!wicket && battingPower?.powerId === "double-run") {
    runs = batInput * 2;
    applyPowerUsage(innings, battingTeam, battingPower.roleSlot, ballNumber);
    revealedThisBall.push({ team: battingTeam, roleSlot: battingPower.roleSlot, powerId: battingPower.powerId, ballNumber });
  }

  const striker = innings.striker;
  innings.batStats[striker].balls += 1;
  innings.bowlerStats.balls += 1;

  if (wicket) {
    innings.wickets += 1;
    innings.batStats[striker].out = true;
    innings.bowlerStats.wickets += 1;
  } else {
    innings.score += runs;
    innings.batStats[striker].runs += runs;
    innings.bowlerStats.runsConceded += runs;
    if (runs % 2 === 1) {
      const temp = innings.striker;
      innings.striker = innings.nonStriker;
      innings.nonStriker = temp;
    }
  }

  innings.ballsBowled += 1;
  if (innings.ballsBowled % 6 === 0 && innings.wickets < 2) {
    const temp = innings.striker;
    innings.striker = innings.nonStriker;
    innings.nonStriker = temp;
  }

  if (wicket && innings.wickets < 2) {
    const available = ["batsman1", "batsman2"].find((slot) => !innings.batStats[slot].out);
    if (available) {
      innings.striker = available;
      innings.nonStriker = available === "batsman1" ? "batsman2" : "batsman1";
    }
  }

  cricket.pendingBallInputs = {};
  cricket.armedPowers[battingTeam] = null;
  cricket.armedPowers[bowlingTeam] = null;
  cricket.revealedPowers.push(...revealedThisBall);

  const result = {
    ballNumber,
    battingTeam,
    bowlingTeam,
    batInput,
    bowlInput,
    wicket,
    wicketReason,
    runs: wicket ? 0 : runs,
    score: innings.score,
    wickets: innings.wickets,
    ballsBowled: innings.ballsBowled,
    revealedPowers: revealedThisBall,
  };

  innings.ballLog.push(result);

  const completed = isInningsComplete(innings);
  if (!completed) {
    return { success: true, ball: result, inningsCompleted: false, matchCompleted: false };
  }

  cricket.inningsScores[innings.battingTeam] = {
    runs: innings.score,
    wickets: innings.wickets,
    balls: innings.ballsBowled,
  };

  if (innings.inningNumber === 1) {
    const secondBatting = innings.bowlingTeam;
    cricket.innings = makeInnings(2, secondBatting, cricket.setup.overs, innings.score + 1);
    room.phase = "cricket-innings-break";
    return {
      success: true,
      ball: result,
      inningsCompleted: true,
      matchCompleted: false,
      breakInfo: {
        firstInningsRuns: innings.score,
        target: innings.score + 1,
        chasingTeam: secondBatting,
      },
    };
  }

  const chasingTeam = innings.battingTeam;
  const defendingTeam = innings.bowlingTeam;
  const winner = innings.score >= innings.target ? chasingTeam : defendingTeam;
  cricket.winner = {
    team: winner,
    by: innings.score >= innings.target ? "chase" : "defend",
    target: innings.target,
  };
  room.phase = "cricket-result";

  return {
    success: true,
    ball: result,
    inningsCompleted: true,
    matchCompleted: true,
    winner: cricket.winner,
  };
}

function startSecondInnings(room) {
  if (!room.cricket || room.phase !== "cricket-innings-break") {
    return { success: false, error: "Second innings is not ready yet." };
  }
  room.phase = "cricket-live";
  room.cricket.pendingBallInputs = {};
  room.cricket.pendingTrivia = null;
  room.cricket.armedPowers = { A: null, B: null };
  return { success: true };
}

function buildCricketView(room, viewerId) {
  const cricket = room.cricket;
  if (!cricket) return null;

  const viewerSide = getTeamSideForSocket(room, viewerId);
  const innings = cricket.innings;
  const target = innings?.target || null;
  const requiredRuns = target ? Math.max(target - innings.score, 0) : null;
  const ballsLeft = innings ? Math.max(innings.totalBalls - innings.ballsBowled, 0) : null;

  return {
    mode: "cricket",
    phase: room.phase,
    viewerSide,
    isSpectator: !viewerSide,
    setup: cricket.setup,
    toss: cricket.toss,
    innings,
    inningsScores: cricket.inningsScores,
    winner: cricket.winner,
    requiredRuns,
    ballsLeft,
    myPowerMapping: viewerSide ? cricket.powerMappings[viewerSide] : null,
    powerSubmission: viewerSide ? cricket.powerSubmitted[viewerSide] : null,
    revealedPowers: cricket.revealedPowers,
    hasPendingTrivia: Boolean(cricket.pendingTrivia && cricket.pendingTrivia.socketId === viewerId),
    armedPower: viewerSide ? cricket.armedPowers[viewerSide] : null,
  };
}

function getAllRooms() {
  return Array.from(rooms.values());
}

module.exports = {
  POWER_IDS,
  POWER_SLOTS,
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  getAllRooms,
  getTeamSideForSocket,
  startCricketSetup,
  callCricketToss,
  chooseToss,
  submitPowerMapping,
  requestPowerTrivia,
  submitPowerTriviaAnswer,
  submitBall,
  resolveBall,
  startSecondInnings,
  buildCricketView,
};
