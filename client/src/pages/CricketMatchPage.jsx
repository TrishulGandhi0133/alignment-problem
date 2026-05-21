import React, { useMemo, useState } from "react";
import { useGame } from "../context/GameContext";

const battingPowerById = {
  "not-out": "Not Out",
  "double-run": "Double Run",
};

export default function CricketMatchPage() {
  const {
    myId,
    players,
    cricketState,
    cricketPowerTrivia,
    cricketPowerResult,
    requestCricketPower,
    submitCricketPowerAnswer,
    playCricketBall,
    error,
  } = useGame();

  const me = players.find((p) => p.id === myId);
  const innings = cricketState?.innings;
  const [number, setNumber] = useState(1);
  const [answer, setAnswer] = useState(null);

  const myTeam = me?.teamSide;
  const isBatting = innings?.battingTeam === myTeam;
  const striker = innings?.striker;
  const myMapping = cricketState?.myPowerMapping;

  const balls = innings ? `${Math.floor(innings.ballsBowled / 6)}.${innings.ballsBowled % 6}` : "0.0";
  const currentBatPower = striker && myMapping ? battingPowerById[myMapping[striker]] : null;

  const submitBall = async () => {
    if (me?.isSpectator) return;
    await playCricketBall(number);
  };

  const requestPower = async (roleSlot) => {
    if (me?.isSpectator) return;
    await requestCricketPower(roleSlot);
    setAnswer(null);
  };

  const answerTrivia = async (optionIdx) => {
    setAnswer(optionIdx);
    await submitCricketPowerAnswer(optionIdx);
  };

  const canUseBowlingPower = !me?.isSpectator && innings?.bowlingTeam === myTeam;

  return (
    <div className="page stadium-bg">
      <div className="card card-wide fade-in">
        <p className="page-tag">Live Match</p>
        <h2 className="mb-md">Hand Cricket Arena</h2>

        <div className="stadium-scoreboard mb-md">
          <div>
            <div className="muted">Innings {innings?.inningNumber}</div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              {cricketState?.setup?.teamNames?.[innings?.battingTeam]} {innings?.score}/{innings?.wickets}
            </div>
            <div className="muted">Overs {balls}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="muted">Target</div>
            <div style={{ fontWeight: 800 }}>{innings?.target || "—"}</div>
            {innings?.target && (
              <div className="muted">
                Need {cricketState?.requiredRuns} from {cricketState?.ballsLeft} balls
              </div>
            )}
          </div>
        </div>

        {!me?.isSpectator && (
          <div className="stack mb-md">
            <label className="muted">Choose your number (1-6)</label>
            <div className="row" style={{ flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} className={`btn ${number === n ? "btn-primary" : "btn-ghost"}`} onClick={() => setNumber(n)}>{n}</button>
              ))}
            </div>
            <button className="btn btn-success" onClick={submitBall}>Submit Ball</button>
          </div>
        )}

        {!me?.isSpectator && (
          <div className="stack mb-md">
            <h3>Power Controls</h3>
            {isBatting && currentBatPower && (
              <button className="btn btn-ghost" onClick={() => requestPower(striker)}>
                Activate Striker Power: {currentBatPower}
              </button>
            )}
            {canUseBowlingPower && (
              <button className="btn btn-ghost" onClick={() => requestPower("bowler")}>
                Activate Bowler Power: Guaranteed Wicket
              </button>
            )}
          </div>
        )}

        {cricketPowerTrivia && (
          <div className="question-card mb-md">
            <p className="muted mb-sm">Answer in 15 seconds to activate power</p>
            <div className="question-text">{cricketPowerTrivia.question.question}</div>
            <div className="options-grid">
              {cricketPowerTrivia.question.options.map((opt, idx) => (
                <button
                  key={opt}
                  className={`option-btn ${answer === idx ? "selected" : ""}`}
                  onClick={() => answerTrivia(idx)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {cricketPowerResult && (
          <div className={`alert ${cricketPowerResult.activated ? "alert-success" : "alert-warning"} mb-md`}>
            {cricketPowerResult.activated ? "Power Activated" : "Power Not Activated"} — {cricketPowerResult.correct ? "correct answer" : "wrong answer"}
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <h3 className="mb-sm">Recent Balls</h3>
        <div className="scoreboard">
          {(innings?.ballLog || []).slice(-6).reverse().map((ball) => (
            <div key={ball.ballNumber} className="score-row">
              <div className="score-rank">#{ball.ballNumber}</div>
              <div className="score-name">Bat {ball.batInput} · Bowl {ball.bowlInput}</div>
              <div className="score-val">{ball.wicket ? "W" : ball.runs}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
