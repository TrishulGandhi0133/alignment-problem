import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // ── Core state ──────────────────────────────────────────────────
  const [roomCode, setRoomCode] = useState(null);
  const [gameMode, setGameMode] = useState("alignment");
  const [myId, setMyId] = useState(null);
  const [myName, setMyName] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [debateForced, setDebateForced] = useState(false);
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

  // ── Cricket ──────────────────────────────────────────────────────
  const [cricketState, setCricketState] = useState(null);
  const [cricketPowerTrivia, setCricketPowerTrivia] = useState(null);
  const [cricketPowerResult, setCricketPowerResult] = useState(null);

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
      if (typeof r === "number") setRound(r);
      setPlayers(pl);
      setNightActionSubmitted(false);
      setMyVote(null);
      setVotes({});
      setVoteCounts({});
      setTuringChallenge(null);
      setTuringResult(null);
      setTribunal(null);
      setTribunalResult(null);
      setCricketPowerTrivia(null);
      setCricketPowerResult(null);
      if (p === "night") {
        setPhase("night");
        setNightMessage(message);
        setNightResult(null);
      } else if (p === "day") {
        setNightResult(nr || null);
        setDayMessage(message);
        setDebateForced(false);
        setPhase("day");
      } else {
        setPhase(p);
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
    socket.on("debate-ended", () => setDebateForced(true));

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

    // Cricket
    socket.on("cricket-state", ({ state }) => {
      setCricketState(state);
    });
    socket.on("cricket-power-trivia", (data) => {
      setCricketPowerResult(null);
      setCricketPowerTrivia(data);
    });
    socket.on("cricket-power-result", (data) => {
      setCricketPowerResult(data);
      setCricketPowerTrivia(null);
    });

    return () => socket.disconnect();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────

  const emit = useCallback((event, data) => {
    return new Promise((resolve) => {
      socketRef.current?.emit(event, data, resolve);
    });
  }, []);

  const createRoom = useCallback(async (name, selectedMode = "alignment") => {
    setError(null);
    const res = await emit("create-room", { playerName: name, gameMode: selectedMode });
    if (res.success) {
      setRoomCode(res.roomCode);
      setGameMode(res.gameMode || selectedMode);
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
      setGameMode(res.gameMode || "alignment");
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

  const forceVote = useCallback(async () => {
    return await emit("force-vote", { roomCode });
  }, [emit, roomCode]);

  // Cricket actions
  const submitCricketSetup = useCallback(async ({ teamAName, teamBName, overs }) => {
    return await emit("cricket-setup", { roomCode, teamAName, teamBName, overs });
  }, [emit, roomCode]);

  const callCricketToss = useCallback(async () => {
    return await emit("cricket-call-toss", { roomCode });
  }, [emit, roomCode]);

  const chooseCricketToss = useCallback(async (choice) => {
    return await emit("cricket-choose-toss", { roomCode, choice });
  }, [emit, roomCode]);

  const submitCricketPowers = useCallback(async (mapping) => {
    return await emit("cricket-submit-powers", { roomCode, mapping });
  }, [emit, roomCode]);

  const requestCricketPower = useCallback(async (roleSlot) => {
    return await emit("cricket-request-power", { roomCode, roleSlot });
  }, [emit, roomCode]);

  const submitCricketPowerAnswer = useCallback(async (answerId) => {
    return await emit("cricket-submit-power-answer", { roomCode, answerId });
  }, [emit, roomCode]);

  const playCricketBall = useCallback(async (number) => {
    return await emit("cricket-play-ball", { roomCode, number });
  }, [emit, roomCode]);

  const startCricketSecondInnings = useCallback(async () => {
    return await emit("cricket-start-second-innings", { roomCode });
  }, [emit, roomCode]);

  const clearError = useCallback(() => setError(null), []);
  const clearNotice = useCallback(() => setNotice(null), []);

  const acknowledgeRole = useCallback(() => {
    setPhase("night-briefing");
  }, []);

  return (
    <GameContext.Provider value={{
      connected, roomCode, gameMode, myId, myName, isHost, debateForced, players, phase, round,
      myRole, nightMessage, nightResult, probeResult, nightActionSubmitted,
      votes, voteCounts, myVote, dayMessage,
      turingChallenge, turingResult, tribunal, tribunalResult,
      gameOver, scores, cricketState, cricketPowerTrivia, cricketPowerResult, error, notice,
      createRoom, joinRoom, startGame,
      submitNightAction, callTuringChallenge, submitTuringAnswer,
      submitVote, submitTribunalAnswer, startNextNight, forceVote,
      submitCricketSetup, callCricketToss, chooseCricketToss,
      submitCricketPowers, requestCricketPower, submitCricketPowerAnswer,
      playCricketBall, startCricketSecondInnings,
      acknowledgeRole, clearError, clearNotice,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
