import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // ── Core state ──────────────────────────────────────────────────
  const [roomCode, setRoomCode] = useState(null);
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState("home"); // home | lobby | role | night | day | vote | trivia | result | gameover
  const [round, setRound] = useState(0);
  const [myRole, setMyRole] = useState(null);

  // ── Night ────────────────────────────────────────────────────────
  const [nightMessage, setNightMessage] = useState(null);
  const [nightResult, setNightResult] = useState(null);
  const [probeResult, setProbeResult] = useState(null);
  const [nightActionSubmitted, setNightActionSubmitted] = useState(false);

  // ── Day / Vote ───────────────────────────────────────────────────
  const [votes, setVotes] = useState({});
  const [voteCounts, setVoteCounts] = useState({});
  const [myVote, setMyVote] = useState(null);
  const [dayMessage, setDayMessage] = useState(null);

  // ── Turing Challenge ─────────────────────────────────────────────
  const [turingChallenge, setTuringChallenge] = useState(null); // {challengedId, challengedName, callerName, question}
  const [turingResult, setTuringResult] = useState(null);

  // ── Tribunal ─────────────────────────────────────────────────────
  const [tribunal, setTribunal] = useState(null); // {accusedId, accusedName, votes, question}
  const [tribunalResult, setTribunalResult] = useState(null);

  // ── Game Over ────────────────────────────────────────────────────
  const [gameOver, setGameOver] = useState(null);

  // ── Scores ───────────────────────────────────────────────────────
  const [scores, setScores] = useState([]);

  // ── Error / Notice ───────────────────────────────────────────────
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // ── Init socket ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => { setConnected(true); setMyId(socket.id); });
    socket.on("disconnect", () => setConnected(false));

    // Lobby
    socket.on("lobby-update", ({ players }) => setPlayers(players));
    socket.on("host-changed", ({ newHostId }) => {
      if (socket.id === newHostId) setIsHost(true);
    });
    socket.on("player-disconnected", ({ name }) => setNotice(`${name} disconnected.`));

    // Game start — role assigned privately
    socket.on("role-assigned", ({ role }) => {
      setMyRole(role);
      setPhase("role");
    });

    // Phase changes
    socket.on("phase-change", ({ phase: p, round: r, players: pl, nightResult: nr, message }) => {
      setRound(r);
      setPlayers(pl);
      setNightActionSubmitted(false);
      setMyVote(null);
      setVotes({});
      setVoteCounts({});
      setTuringChallenge(null);
      setTuringResult(null);
      setTribunal(null);
      setTribunalResult(null);
      if (p === "night") {
        setPhase("night");
        setNightMessage(message);
        setNightResult(null);
      } else if (p === "day") {
        setNightResult(nr || null);
        setDayMessage(message);
        setPhase("day");
      }
    });

    // Probe result (red-teamer only)
    socket.on("probe-result", ({ targetName, isRogue }) => {
      setProbeResult({ targetName, isRogue });
    });

    // Turing Challenge
    socket.on("turing-challenge", (data) => setTuringChallenge(data));
    socket.on("turing-result", (data) => {
      setTuringResult(data);
      setScores(data.scores || []);
    });

    // Vote
    socket.on("vote-update", ({ votes: v, voteCounts: vc }) => {
      setVotes(v);
      setVoteCounts(vc);
    });
    socket.on("vote-tie", ({ message }) => setNotice(message));

    // Tribunal
    socket.on("tribunal-start", (data) => {
      setTribunal(data);
      setPhase("tribunal");
    });
    socket.on("tribunal-result", (data) => {
      setTribunalResult(data);
      setPlayers((prev) =>
        prev.map((p) => p.id === data.accusedId ? { ...p, alive: data.survived } : p)
      );
    });

    // Awaiting next night (host button)
    socket.on("awaiting-next-night", ({ players: pl }) => {
      setPlayers(pl);
      setPhase("awaiting-next-night");
    });

    // Game Over
    socket.on("game-over", (data) => {
      setGameOver(data);
      setPlayers(data.players);
      setPhase("gameover");
    });

    return () => socket.disconnect();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────

  const emit = useCallback((event, data) => {
    return new Promise((resolve) => {
      socketRef.current?.emit(event, data, resolve);
    });
  }, []);

  const createRoom = useCallback(async (name) => {
    setError(null);
    const res = await emit("create-room", { playerName: name });
    if (res.success) {
      setRoomCode(res.roomCode);
      setMyName(name);
      setIsHost(true);
      setPlayers([res.player]);
      setPhase("lobby");
    } else setError(res.error);
    return res;
  }, [emit]);

  const joinRoom = useCallback(async (code, name) => {
    setError(null);
    const res = await emit("join-room", { roomCode: code, playerName: name });
    if (res.success) {
      setRoomCode(res.roomCode);
      setMyName(name);
      setIsHost(false);
      setPhase("lobby");
    } else setError(res.error);
    return res;
  }, [emit]);

  const startGame = useCallback(async () => {
    setError(null);
    const res = await emit("start-game", { roomCode });
    if (!res.success) setError(res.error);
    return res;
  }, [emit, roomCode]);

  const submitNightAction = useCallback(async (targetId) => {
    const res = await emit("night-action", { roomCode, targetId });
    if (res.success) setNightActionSubmitted(true);
    return res;
  }, [emit, roomCode]);

  const callTuringChallenge = useCallback(async (challengedId) => {
    return await emit("call-turing-challenge", { roomCode, challengedId });
  }, [emit, roomCode]);

  const submitTuringAnswer = useCallback(async (answerId) => {
    return await emit("submit-turing-answer", { roomCode, answerId });
  }, [emit, roomCode]);

  const submitVote = useCallback(async (targetId) => {
    setMyVote(targetId);
    return await emit("submit-vote", { roomCode, targetId });
  }, [emit, roomCode]);

  const submitTribunalAnswer = useCallback(async (answerId) => {
    return await emit("submit-tribunal-answer", { roomCode, answerId });
  }, [emit, roomCode]);

  const startNextNight = useCallback(async () => {
    return await emit("next-night", { roomCode });
  }, [emit, roomCode]);

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const acknowledgeRole = useCallback(() => {
    setPhase("night-briefing");
  }, []);

  return (
    <GameContext.Provider value={{
      connected, roomCode, myId, myName, isHost, players, phase, round,
      myRole, nightMessage, nightResult, probeResult, nightActionSubmitted,
      votes, voteCounts, myVote, dayMessage,
      turingChallenge, turingResult, tribunal, tribunalResult,
      gameOver, scores, error, notice,
      createRoom, joinRoom, startGame,
      submitNightAction, callTuringChallenge, submitTuringAnswer,
      submitVote, submitTribunalAnswer, startNextNight,
      acknowledgeRole, clearError, clearNotice,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
