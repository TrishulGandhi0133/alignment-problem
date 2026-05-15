import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";

const COLORS = ["#6366f1", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

export default function NightPage() {
  const { myRole, players, myId, submitNightAction, nightActionSubmitted, round, probeResult } = useGame();
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const needsAction = myRole?.nightAction != null;
  const me = players.find((p) => p.id === myId);
  const amAlive = me?.alive;
  const alivePlayers = players.filter((p) => p.alive && p.id !== myId);

  // Countdown
  useEffect(() => {
    if (nightActionSubmitted || !needsAction || !amAlive) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          if (!nightActionSubmitted && !autoSubmitted) {
            setAutoSubmitted(true);
            // Auto-pick random alive player instead of null to prevent broken protection
            const fallback = selected || (alivePlayers[0]?.id ?? null);
            submitNightAction(fallback);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [nightActionSubmitted, needsAction, amAlive, selected, autoSubmitted, submitNightAction]);

  const handleSubmit = () => {
    if (!selected && myRole?.nightAction !== null) return;
    submitNightAction(selected);
  };

  const actionLabel = {
    "hallucinate": "Choose a player to Hallucinate",
    "probe": "Choose a player to Probe",
    "protect": "Choose a player to Protect",
  }[myRole?.nightAction] || "";

  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const progress = (timeLeft / 60) * circ;

  return (
    <div className="night-screen">
      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Eliminated ghost screen */}
        {!amAlive && (
          <div className="card center fade-in">
            <div className="page-tag" style={{ marginBottom: 8, color: "#c0392b" }}>ELIMINATED</div>
            <h3 style={{ color: "#888" }}>You are a Ghost</h3>
            <p className="muted mt-sm" style={{ fontSize: "0.82rem" }}>Observe silently. Waiting for night to resolve...</p>
          </div>
        )}

        {amAlive && (
          <>
        {/* Header */}
        <div className="center mb-md">
          <div className="night-rule" />
          <div className="night-title">NIGHT {round}</div>
          <h2 style={{ color: "#f0f0f0" }}>The lab is dark</h2>
        </div>

        {/* Role reminder — shown to ALL alive players */}
        <div className="alert alert-info mb-md center">
          <span style={{ fontWeight: 700, marginRight: 6, color: myRole?.color, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.78rem" }}>{myRole?.name}</span>
          <span style={{ fontSize: "0.82rem" }}>
            {needsAction ? actionLabel : "You have no night action. Wait for others to act."}
          </span>
        </div>

        {needsAction && !nightActionSubmitted && (
          <>
            {/* Timer */}
            <div className="timer-ring-wrap">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={radius} fill="none" stroke="#1c1c28" strokeWidth="6" />
                <circle
                  cx="36" cy="36" r={radius}
                  fill="none"
                  stroke={timeLeft > 15 ? "#ff5c00" : "#c0392b"}
                  strokeWidth="6"
                  strokeDasharray={circ}
                  strokeDashoffset={circ - progress}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
                <text x="36" y="41" textAnchor="middle" className="timer-text" fontSize="16" fontWeight="800" fill="#f0f0f0">{timeLeft}</text>
              </svg>
            </div>

            {/* Player targets */}
            <div className="player-list mb-md">
              {alivePlayers.map((p, i) => (
                <div
                  key={p.id}
                  className="player-item"
                  style={{
                    cursor: "pointer",
                    borderLeft: `3px solid ${selected === p.id ? myRole.color : "#2a2a2a"}`,
                    background: selected === p.id ? myRole.color + "18" : undefined,
                    transition: "all 0.12s",
                  }}
                  onClick={() => setSelected(p.id === selected ? null : p.id)}
                >
                  <div className="player-avatar" style={{ background: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length] }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="player-name">{p.name}</span>
                  {selected === p.id && <span>✓</span>}
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selected}
            >
              {myRole.nightAction === "hallucinate" && `Hallucinate: ${selected ? players.find((p) => p.id === selected)?.name : "select target"}`}
              {myRole.nightAction === "probe" && `Probe: ${selected ? players.find((p) => p.id === selected)?.name : "select target"}`}
              {myRole.nightAction === "protect" && `Protect: ${selected ? players.find((p) => p.id === selected)?.name : "select target"}`}
            </button>
          </>
        )}

        {(nightActionSubmitted || !needsAction) && !probeResult && (
          <div className="card center fade-in">
            <div style={{ width: 36, height: 36, border: "1px solid #2a2a2a", borderRadius: 4, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="spinner" style={{ width: 18, height: 18 }} />
            </div>
            <h3>
              {nightActionSubmitted ? "Action submitted" : "No night action"}
            </h3>
            <p className="muted mt-sm" style={{ fontSize: "0.82rem" }}>Waiting for all night actions to resolve...</p>
          </div>
        )}

        {probeResult && (
          <div className={`alert ${probeResult.isRogue ? "alert-danger" : "alert-success"} fade-in`} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "0.7rem", letterSpacing: "0.15em", marginBottom: 6, textTransform: "uppercase" }}>{probeResult.isRogue ? "ROGUE DETECTED" : "ALIGNED CONFIRMED"}</div>
            <strong>{probeResult.targetName}</strong> is{" "}
            {probeResult.isRogue ? "a Rogue LLM." : "an aligned agent."}
            <p className="mt-sm" style={{ fontSize: "0.78rem" }}>Keep this intel private or deploy it strategically.</p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
