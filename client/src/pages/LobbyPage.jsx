import React from "react";
import { useGame } from "../context/GameContext";

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

export default function LobbyPage() {
  const { roomCode, myId, players, isHost, startGame, error, clearError } = useGame();

  const canStart = players.length >= 4;

  return (
    <div className="page" style={{ justifyContent: "flex-start", paddingTop: 40 }}>
      <div className="card fade-in">
        {/* Room code */}
        <div className="center mb-lg">
          <p className="page-tag" style={{ marginBottom: 8 }}>Room Code</p>
          <div className="room-code">{roomCode}</div>
          <p className="muted mt-sm" style={{ fontSize: "0.8rem" }}>Share this code with your teammates</p>
        </div>

        <hr className="divider" />

        {/* Player list */}
        <div className="mb-md">
          <div className="row mb-sm" style={{ justifyContent: "space-between" }}>
            <h3>Players</h3>
            <span className="muted" style={{ fontSize: "0.85rem" }}>{players.length} / 10</span>
          </div>
          <div className="player-list">
            {players.map((p, i) => (
              <div key={p.id} className="player-item fade-in">
                <div className="player-avatar" style={{ background: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length] }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span className="player-name">{p.name}</span>
                {p.id === myId && <span className="badge badge-you">YOU</span>}
                {p.isHost && <span className="badge badge-host">HOST</span>}
              </div>
            ))}
          </div>
        </div>

        {!canStart && (
          <div className="alert alert-info mb-md">
            WAITING FOR PLAYERS — Need at least {4 - players.length} more.
          </div>
        )}

        {error && (
          <div className="alert alert-danger mb-md" onClick={clearError} style={{ cursor: "pointer" }}>
            ERROR: {error}
          </div>
        )}

        {isHost ? (
          <button className="btn btn-success" onClick={startGame} disabled={!canStart}>
            {canStart ? "Start Game" : `Waiting for ${4 - players.length} more players`}
          </button>
        ) : (
          <div className="alert alert-info center">
            Waiting for the host to start the game...
          </div>
        )}

        <hr className="divider" />

        {/* Role guide */}
        <div>
          <p className="muted mb-sm" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Roles in this game</p>
          <div className="stack" style={{ gap: 6 }}>
            {[
              { tag: "R", name: "Rogue LLM", desc: "Eliminate researchers each night", color: "#c0392b" },
              { tag: "T", name: "Red-Teamer", desc: "Probe players for rogue identity", color: "#ff5c00" },
              { tag: "F", name: "RLHF Trainer", desc: "Protect a player each night", color: "#ff9a5c" },
              { tag: "A", name: "Aligned Agent", desc: "Deduce and vote out the rogues", color: "#888" },
              { tag: "B", name: "Black Box", desc: "Win by getting voted out (8+ players)", color: "#555" },
            ].map((r) => (
              <div key={r.name} className="row" style={{ gap: 8 }}>
                <span style={{ fontFamily: "Consolas, monospace", fontWeight: 900, fontSize: "0.75rem", color: r.color, background: r.color + "22", padding: "2px 7px", borderRadius: 2, minWidth: 24, textAlign: "center" }}>{r.tag}</span>
                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: r.color }}>{r.name}</span>
                <span className="muted" style={{ fontSize: "0.78rem" }}>— {r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
