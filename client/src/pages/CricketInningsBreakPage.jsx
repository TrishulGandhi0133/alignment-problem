import React from "react";
import { useGame } from "../context/GameContext";

export default function CricketInningsBreakPage() {
  const { isHost, cricketState, startCricketSecondInnings, error } = useGame();
  const first = cricketState?.inningsScores?.A && cricketState?.inningsScores?.B
    ? null
    : cricketState?.inningsScores?.A || cricketState?.inningsScores?.B;

  return (
    <div className="page stadium-bg" style={{ justifyContent: "center" }}>
      <div className="card center fade-in">
        <p className="page-tag">Innings Break</p>
        <h2 className="mb-md">Target Set</h2>
        <div className="alert alert-info mb-md">
          First innings: {first?.runs || 0}/{first?.wickets || 0} in {first?.balls || 0} balls
        </div>
        <div className="alert alert-success mb-md">Target: {cricketState?.innings?.target}</div>

        {isHost ? (
          <button className="btn btn-success" onClick={startCricketSecondInnings}>Start Second Innings</button>
        ) : (
          <div className="alert alert-info">Waiting for host to start second innings...</div>
        )}

        {error && <div className="alert alert-danger mt-md">{error}</div>}
      </div>
    </div>
  );
}
