import React from "react";
import { useGame } from "../context/GameContext";

export default function AwaitingNightPage() {
  const { round, players, isHost, startNextNight, scores } = useGame();

  return (
    <div className="page" style={{ justifyContent: "center" }}>
      <div className="card fade-in">
        <div className="center mb-lg">
          <div className="page-tag" style={{ marginBottom: 8 }}>End of Day {round}</div>
          <h2>Intermission</h2>
          <p className="muted mt-sm" style={{ fontSize: "0.85rem" }}>Day phase complete. Night approaches.</p>
        </div>

        {/* Current player status */}
        <div className="mb-md">
          <h3 className="mb-sm">Survivors</h3>
          <div className="player-list">
            {players.map((p) => (
              <div key={p.id} className={`player-item ${!p.alive ? "player-dead" : ""}`}>
                <span style={{ fontSize: "1.1rem" }}>{p.alive ? "🟢" : "☠️"}</span>
                <span className="player-name">{p.name}</span>
                {!p.alive && <span className="badge badge-dead">Eliminated</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Scores */}
        {scores.length > 0 && (
          <div className="mb-md">
            <h3 className="mb-sm">Trivia Scores</h3>
            <div className="scoreboard">
              {[...scores].sort((a, b) => b.score - a.score).map((s, i) => (
                <div key={s.id} className="score-row">
                  <span className="score-rank">#{i + 1}</span>
                  <span className="score-name">{s.name}</span>
                  <span className="score-val">{s.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isHost ? (
          <button className="btn btn-primary" onClick={startNextNight}>
            Begin Night {round + 1}
          </button>
        ) : (
          <div className="alert alert-info center">
            Waiting for the host to start Night {round + 1}...
          </div>
        )}
      </div>
    </div>
  );
}
