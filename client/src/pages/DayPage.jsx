import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";

const COLORS = ["#ff5c00", "#c0392b", "#e05200", "#ff3b1f", "#994400", "#cc3300", "#ff7043", "#b71c1c", "#e64a19", "#ff6d00"];

export default function DayPage() {
  const {
    players, myId, myRole, nightResult, dayMessage, round,
    votes, voteCounts, myVote, submitVote,
    callTuringChallenge, submitTuringAnswer,
    turingChallenge, turingResult,
    notice, clearNotice,
    isHost, debateForced, forceVote,
  } = useGame();

  const [debateTime, setDebateTime] = useState(300); // 5 min debate
  const [debateEnded, setDebateEnded] = useState(false);

  const debateOver = debateEnded || debateForced || debateTime <= 0;
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);

  const alivePlayers = players.filter((p) => p.alive);
  const me = players.find((p) => p.id === myId);
  const amAlive = me?.alive;

  // Debate countdown
  useEffect(() => {
    if (debateEnded || debateForced) return;
    const t = setInterval(() => {
      setDebateTime((prev) => {
        if (prev <= 1) { clearInterval(t); setDebateEnded(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [debateEnded, debateForced]);

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleTuringAnswer = async (optId) => {
    if (answered) return;
    setSelectedAnswer(optId);
    setAnswered(true);
    await submitTuringAnswer(optId);
  };

  const isMe = (id) => id === myId;

  return (
    <div className="day-screen">
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Header */}
        <div className="center mb-md">
          <div className="page-tag" style={{ marginBottom: 6 }}>Day {round}</div>
          <h2>Debate Phase</h2>
          <p className="muted mt-sm" style={{ fontSize: "0.82rem" }}>{dayMessage}</p>
        </div>

        {/* Night result banner */}
        {nightResult && (
          <div className={`alert ${nightResult.eliminated ? "alert-danger" : "alert-success"} mb-md fade-in`}>
            {nightResult.eliminated ? (
              <><strong>[HALLUCINATED]</strong> {nightResult.eliminatedName} was eliminated during the night.</>
            ) : nightResult.protected ? (
              <><strong>[PROTECTED]</strong> {nightResult.protectedName} was shielded by the RLHF Trainer.</>
            ) : (
              <><strong>[CLEAR]</strong> No one was hallucinated last night.</>
            )}
          </div>
        )}

        {notice && (
          <div className="alert alert-warning mb-md" onClick={clearNotice} style={{ cursor: "pointer" }}>
            {notice}
          </div>
        )}

        {/* Debate timer */}
        <div className="card mb-md" style={{ padding: "14px 18px" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Debate Timer</div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>Discuss, accuse, and reason aloud</div>
            </div>
            <div style={{
              fontSize: "1.4rem", fontWeight: 900, fontFamily: "Consolas, monospace",
              color: debateTime > 60 ? "#ff5c00" : debateTime > 20 ? "#ff3b1f" : "#c0392b"
            }}>
              {fmtTime(debateTime)}
            </div>
          </div>
          <div style={{
            height: 3, marginTop: 10,
            background: `linear-gradient(to right, #ff5c00 ${(debateTime / 300) * 100}%, #1e1e1e 0%)`
          }} />
          {isHost && !debateOver && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12, width: "100%", fontSize: "0.72rem", letterSpacing: "0.1em" }}
              onClick={forceVote}
            >
              SKIP TO VOTE
            </button>
          )}
        </div>

        {/* Players + Turing Challenge buttons */}
        <div className="mb-md">
          <h3 className="mb-sm">Players</h3>
          <div className="player-list">
            {players.map((p, i) => (
              <div key={p.id} className={`player-item ${!p.alive ? "player-dead" : ""}`}>
                <div
                  className="player-avatar"
                  style={{ background: COLORS[i % COLORS.length] + "33", color: COLORS[i % COLORS.length] }}
                >
                  {p.name[0].toUpperCase()}
                </div>
                <span className="player-name">{p.name}</span>
                {isMe(p.id) && <span className="badge badge-you">YOU</span>}
                {!p.alive && <span className="badge badge-dead">GHOST</span>}
                {voteCounts[p.id] > 0 && (
                  <span style={{ fontSize: "0.72rem", color: "#ff3b1f", fontWeight: 800, fontFamily: "Consolas, monospace" }}>
                    {voteCounts[p.id]}v
                  </span>
                )}
                {amAlive && p.alive && !isMe(p.id) && !turingChallenge && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 10px", fontSize: "0.65rem" }}
                    onClick={() => callTuringChallenge(p.id)}
                  >
                    Challenge
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {turingChallenge && !turingResult && (
          <div className="card mb-md fade-in" style={{ borderLeft: "4px solid #ff3b1f" }}>
            <div className="center mb-sm">
              <div className="page-tag" style={{ marginBottom: 6 }}>Turing Challenge</div>
              <h3 style={{ color: "#ff3b1f" }}>Active Challenge</h3>
              <p className="muted" style={{ fontSize: "0.82rem" }}>
                <strong>{turingChallenge.callerName}</strong> challenges <strong>{turingChallenge.challengedName}</strong>
              </p>
            </div>
            <div className="question-card">
              <span className="category-chip">{turingChallenge.question.category}</span>
              <span className={`diff-chip diff-${turingChallenge.question.difficulty}`}>{turingChallenge.question.difficulty}</span>
              <p className="question-text">{turingChallenge.question.question}</p>
              <div className="options-grid">
                {turingChallenge.question.options.map((opt, idx) => {
                  const optId = turingChallenge.question.type === "boolean" ? opt : opt.split(")")[0].trim();
                  const isSelected = selectedAnswer === optId;
                  const showResult = answered && turingResult;
                  const cls = showResult
                    ? (String(optId) === String(turingChallenge.question.correctAnswer) ? "correct" : isSelected ? "wrong" : "")
                    : isSelected ? "selected" : "";

                  if (turingChallenge.challengedId === myId) {
                    // I'm being challenged
                    return (
                      <button
                        key={idx}
                        className={`option-btn ${cls}`}
                        onClick={() => handleTuringAnswer(optId)}
                        disabled={answered}
                      >
                        {opt}
                      </button>
                    );
                  } else {
                    // Observer
                    return (
                      <div
                        key={idx}
                        className={`option-btn ${cls}`}
                        style={{ cursor: "default" }}
                      >
                        {opt}
                      </div>
                    );
                  }
                })}
              </div>
            </div>
            {turingChallenge.challengedId === myId && !answered && (
              <div className="alert alert-warning center">You are being challenged — answer now!</div>
            )}
            {turingChallenge.challengedId !== myId && !answered && (
              <p className="muted center" style={{ fontSize: "0.82rem" }}>Waiting for {turingChallenge.challengedName} to answer...</p>
            )}
          </div>
        )}

        {turingResult && (
          <div className={`alert ${turingResult.correct ? "alert-success" : "alert-danger"} mb-md fade-in`}>
            <strong>[{turingResult.correct ? "CORRECT" : "INCORRECT"}]</strong> {turingResult.playerName} answered{" "}
            {turingResult.correct ? "correctly." : "incorrectly."}
            <div className="explanation">{turingResult.explanation}</div>
          </div>
        )}

        {debateOver && amAlive && !myVote && (
          <div className="card fade-in" style={{ borderLeft: "4px solid #ff3b1f" }}>
            <h3 className="mb-md center" style={{ color: "#ff3b1f" }}>Vote to Retrain</h3>
            <p className="muted mb-md center" style={{ fontSize: "0.82rem" }}>Who is the rogue LLM? Most votes triggers a tribunal.</p>
            <div className="vote-grid">
              {alivePlayers.filter((p) => p.id !== myId).map((p, i) => (
                <button
                  key={p.id}
                  className={`vote-target ${myVote === p.id ? "voted" : ""}`}
                  onClick={() => submitVote(p.id)}
                  disabled={!!myVote}
                >
                  <div className="vote-count">
                    {voteCounts[p.id] || 0}
                  </div>
                  <div className="vote-name">{p.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {myVote && (
          <div className="alert alert-info center fade-in">
            Voted for <strong>{players.find((p) => p.id === myVote)?.name}</strong>. Waiting for others...
            <div className="mt-sm"><span className="spinner" /></div>
          </div>
        )}

        {!amAlive && (
          <div className="alert alert-warning center">
            GHOST MODE — You have been eliminated. Observe silently.
          </div>
        )}
      </div>
    </div>
  );
}
