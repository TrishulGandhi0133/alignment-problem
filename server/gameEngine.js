const ROLES = require("./roles");
const questions = require("./data/questions.json");

const rooms = new Map();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(hostSocketId, hostName) {
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
  };

  const room = {
    code,
    hostId: hostSocketId,
    players: [host],
    phase: "lobby", // lobby | night | day | game-over
    round: 0,
    nightActions: {},
    votes: {},
    turingActive: null,
    tribunalActive: null,
    usedQuestions: new Set(),

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
  const player = { id: socketId, name, alive: true, role: null, score: 0, isHost, disconnected: false };
  room.players.push(player);
  return player;
}

function removePlayer(room, socketId) {
  room.players = room.players.filter((p) => p.id !== socketId);
}

function getAllRooms() {
  return Array.from(rooms.values());
}

module.exports = { createRoom, getRoom, addPlayer, removePlayer, getAllRooms };
