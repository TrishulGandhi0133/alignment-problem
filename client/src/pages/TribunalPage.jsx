import React, { useState } from "react";
import { useGame } from "../context/GameContext";

export default function TribunalPage() {
  const { tribunal, tribunalResult, submitTribunalAnswer, myId, scores } = useGame();
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);

  if (!tribunal) return null;

  const isAccused = tribunal.accusedId === myId;

  const handleAnswer = async (optId) => {
    if (answered || !isAccused) return;
    setSelectedAnswer(optId);
    setAnswered(true);
    await submitTribunalAnswer(optId);
  };

  const getOptClass = (optId) => {
    if (!tribunalResult) return selectedAnswer === optId ? "selected" : "";
    const correctId = String(tribunal.question.answer);
    if (String(optId) === correctId) return "correct";
    if (selectedAnswer === optId) return "wrong";
    return "";
  };

  return (
    <div className="page" style={{ background: "#0d0d0d" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div className="center mb-md fade-in">
          <div className="page-tag" style={{ marginBottom: 8 }}>Tribunal</div>
          <h2 style={{ color: "#e57373" }}>On Trial</h2>
          <p className="muted mt-sm">
            <strong style={{ color: "#ff9a5c" }}>{tribunal.accusedName}</strong> received {tribunal.votes} vote{tribunal.votes !== 1 ? "s" : ""}.
          </p>
          <p className="muted" style={{ fontSize: "0.82rem", marginTop: 4 }}>
            The group has voted. Answer the trivia question — correct answer earns +2 pts, but the verdict is already decided.
          </p>
        </div>

        {isAccused && !tribunalResult && (
          <div className="alert alert-danger center mb-md fade-in">
            <strong>YOU ARE ON TRIAL.</strong> The group voted you out. Answer correctly for +2 pts.
          </div>
        )}

        {!isAccused && !tribunalResult && (
          <div className="alert alert-info center mb-md fade-in">
            Observe — <strong>{tribunal.accusedName}</strong> must answer now.
          </div>
        )}

        {/* Question */}
        <div className="question-card fade-in">
          <span className="category-chip">{tribunal.question.category}</span>
          <span className={`diff-chip diff-${tribunal.question.difficulty}`}>{tribunal.question.difficulty}</span>
          <p className="question-text">{tribunal.question.question}</p>
          <div className="options-grid">
            {tribunal.question.options.map((opt, idx) => {
              const optId = tribunal.question.type === "boolean" ? opt : opt.split(")")[0].trim();
              return (
                <button
                  key={idx}
                  className={`option-btn ${getOptClass(optId)}`}
                  onClick={() => handleAnswer(optId)}
                  disabled={answered || !isAccused || !!tribunalResult}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {!isAccused && !answered && !tribunalResult && (
          <p className="muted center mt-sm" style={{ fontSize: "0.85rem" }}>
            Waiting for {tribunal.accusedName} to answer...
            <span className="spinner" style={{ marginLeft: 10 }} />
          </p>
        )}

        {/* Tribunal result */}
        {tribunalResult && (
          <div className="card fade-in mt-md"
            style={{ borderLeft: `4px solid #c0392b` }}>
            <div className="center">
              <div className="page-tag" style={{ marginBottom: 8, color: "#c0392b" }}>
                ELIMINATED
              </div>
              <h2 style={{ color: "#c0392b" }}>Verdict: Retrained</h2>
              <p className="mt-sm" style={{ fontSize: "0.88rem" }}>
                <strong>{tribunalResult.accusedName}</strong> has been eliminated by the group's vote.
              </p>
              <div className="alert mt-sm" style={{ background: tribunalResult.correct ? "#1a2a1a" : "#2a1a1a", borderLeft: `3px solid ${tribunalResult.correct ? "#ff5c00" : "#c0392b"}` }}>
                {tribunalResult.correct
                  ? <><strong style={{ color: "#ff5c00" }}>CORRECT ANSWER</strong> — +2 pts awarded</>
                  : <><strong style={{ color: "#c0392b" }}>WRONG ANSWER</strong> — no points</>}
              </div>
              {!tribunalResult.survived && tribunalResult.roleRevealed && (
                <div className="alert alert-warning mt-md">
                  Role revealed: <strong>{tribunalResult.roleRevealed.name}</strong>
                </div>
              )}
              <div className="explanation">{tribunalResult.explanation}</div>

              {/* Updated scores */}
              {scores.length > 0 && (
                <div className="mt-md" style={{ textAlign: "left", width: "100%" }}>
                  <h3 className="mb-sm">Scores</h3>
                  <div className="scoreboard">
                    {scores.map((s, i) => (
                      <div key={s.id} className="score-row">
                        <span className="score-rank">#{i + 1}</span>
                        <span className="score-name">{s.name}</span>
                        <span className="score-val">{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="muted mt-md" style={{ fontSize: "0.8rem" }}>
                {tribunalResult.survived
                  ? "Game continues — next night phase coming up..."
                  : "Waiting for the host to continue..."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
