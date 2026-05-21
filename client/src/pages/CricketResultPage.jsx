import React from "react";
import { useGame } from "../context/GameContext";

export default function CricketResultPage() {
  const { cricketState, players, myId } = useGame();
  const winnerSide = cricketState?.winner?.team;
  const winnerName = winnerSide ? cricketState?.setup?.teamNames?.[winnerSide] : "Unknown";
  const me = players.find((p) => p.id === myId);
  const iWon = me?.teamSide && me?.teamSide === winnerSide;
  const iLost = me?.teamSide && me?.teamSide !== winnerSide;

  return (
    <div className="page stadium-bg" style={{ justifyContent: "center" }}>
      <div className={`card center fade-in ${iWon ? "victory-card" : iLost ? "loss-card" : ""}`}>
        <p className="page-tag">Match Result</p>
        <h1 className="mb-md">{winnerName} Wins</h1>
        {iWon && <div className="alert alert-success mb-md victory-banner">Victory</div>}
        {iLost && <div className="alert alert-danger mb-md loss-banner">Defeat</div>}
        <div className="alert alert-success mb-md">Victory type: {cricketState?.winner?.by}</div>

        <div className="scoreboard">
          {Object.entries(cricketState?.inningsScores || {}).map(([team, score]) => (
            <div key={team} className="score-row">
              <div className="score-name">{cricketState?.setup?.teamNames?.[team]}</div>
              <div className="score-val">{score ? `${score.runs}/${score.wickets}` : "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
