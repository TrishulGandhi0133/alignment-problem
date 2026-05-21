import React from "react";
import { useGame } from "../context/GameContext";

export default function CricketTossPage() {
  const { players, myId, isHost, cricketState, callCricketToss, chooseCricketToss, error } = useGame();
  const toss = cricketState?.toss;
  const me = players.find((p) => p.id === myId);

  return (
    <div className="page stadium-bg" style={{ justifyContent: "center" }}>
      <div className="card fade-in center">
        <p className="page-tag">Toss</p>
        <h2 className="mb-md">Coin Toss</h2>

        {!toss ? (
          isHost ? (
            <button className="btn btn-primary" onClick={callCricketToss}>Call Toss</button>
          ) : (
            <div className="alert alert-info">Waiting for host to call toss...</div>
          )
        ) : (
          <>
            <div className="alert alert-success mb-md">
              Toss won by {players.find((p) => p.id === toss.winnerId)?.name || "Unknown"} (Team {toss.winnerSide})
            </div>
            {toss.winnerId === myId ? (
              <div className="row">
                <button className="btn btn-success" onClick={() => chooseCricketToss("bat")}>Choose Bat</button>
                <button className="btn btn-ghost" onClick={() => chooseCricketToss("bowl")}>Choose Bowl</button>
              </div>
            ) : (
              <div className="alert alert-info">Waiting for toss winner to choose bat/bowl...</div>
            )}
          </>
        )}

        {error && <div className="alert alert-danger mt-md">{error}</div>}
        <p className="muted mt-md">You are {me?.isSpectator ? "a spectator" : `Team ${me?.teamSide}`}.</p>
      </div>
    </div>
  );
}
