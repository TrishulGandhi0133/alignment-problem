import React from "react";
import { useGame } from "../context/GameContext";

const ROLE_COLORS = {
  "rogue-llm": "#c0392b",
  "red-teamer": "#ff5c00",
  "rlhf-trainer": "#ff9a5c",
  "aligned-agent": "#888888",
  "black-box": "#555555",
};

export default function GameOverPage() {
  const { gameOver } = useGame();

  if (!gameOver) return null;

  const { winner, reason, players, scores } = gameOver;
  const isResearcherWin = winner === "researchers";
  const isRogueWin = winner === "rogues";

  return (
    <div className="page" style={{ background: "#0d0d0d" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Win banner */}
        <div className="card center fade-in mb-md" style={{
          borderLeft: `4px solid ${isResearcherWin ? "#ff5c00" : isRogueWin ? "#c0392b" : "#555"}`,
        }}>
          <div className="page-tag" style={{ marginBottom: 8, color: isResearcherWin ? "#ff5c00" : isRogueWin ? "#c0392b" : "#888" }}>
            {isResearcherWin ? "Researchers Win" : isRogueWin ? "Rogue LLMs Win" : "Black Box Wins"}
          </div>
          <h1 style={{ color: isResearcherWin ? "#ff5c00" : isRogueWin ? "#c0392b" : "#888", marginBottom: 8 }}>
            {isResearcherWin ? "Aligned" : isRogueWin ? "Compromised" : "Undefined"}
          </h1>
          <p className="muted" style={{ fontSize: "0.85rem" }}>{reason}</p>
        </div>

        <div className="card mb-md fade-in">
          <h3 className="mb-md">Trivia Leaderboard</h3>
          <div className="scoreboard">
            {scores.map((s, i) => (
              <div key={s.id} className="score-row">
                <span className="score-rank" style={{ color: i === 0 ? "#ff5c00" : i === 1 ? "#888" : i === 2 ? "#c0392b" : undefined, fontFamily: "Consolas, monospace" }}>
                  {i === 0 ? "01" : i === 1 ? "02" : i === 2 ? "03" : `${String(i+1).padStart(2,"0")}`}
                </span>
                <span className="score-name">{s.name}</span>
                <span className="score-val">{s.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card fade-in">
          <h3 className="mb-md">Role Reveal</h3>
          <div className="player-list">
            {players.map((p) => {
              const MONO = { "rogue-llm": "R", "red-teamer": "T", "rlhf-trainer": "F", "aligned-agent": "A", "black-box": "B" };
              const mono = MONO[p.role?.id] || "?";
              const roleColor = ROLE_COLORS[p.role?.id] || "#888";
              return (
                <div key={p.id} className={`player-item ${!p.alive ? "player-dead" : ""}`}>
                  <div style={{ width: 32, height: 32, borderRadius: 3, background: roleColor + "22", color: roleColor, fontFamily: "Consolas, monospace", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{mono}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "0.75rem", color: roleColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {p.role?.name}
                    </div>
                  </div>
                  {!p.alive && <span className="badge badge-dead">OUT</span>}
                </div>
              );
            })}
          </div>
        </div>

        <button
          className="btn btn-primary mt-md"
          onClick={() => window.location.reload()}
        >
          Play Again
        </button>

        <p className="muted center mt-md" style={{ fontSize: "0.72rem" }}>
          Refresh the page to start a new game
        </p>
      </div>
    </div>
  );
}
