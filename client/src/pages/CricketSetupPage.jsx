import React, { useMemo, useState } from "react";
import { useGame } from "../context/GameContext";

export default function CricketSetupPage() {
  const { players, myId, isHost, cricketState, submitCricketSetup, error } = useGame();
  const activePlayers = useMemo(() => players.filter((p) => !p.isSpectator), [players]);

  const [teamAName, setTeamAName] = useState(cricketState?.setup?.teamNames?.A || "Team A");
  const [teamBName, setTeamBName] = useState(cricketState?.setup?.teamNames?.B || "Team B");
  const [overs, setOvers] = useState(cricketState?.setup?.overs || 2);
  const [saving, setSaving] = useState(false);

  const me = players.find((p) => p.id === myId);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isHost || saving) return;
    setSaving(true);
    await submitCricketSetup({ teamAName, teamBName, overs: Number(overs) });
    setSaving(false);
  };

  return (
    <div className="page stadium-bg" style={{ justifyContent: "center" }}>
      <div className="card fade-in">
        <p className="page-tag">Cricket Setup</p>
        <h2 className="mb-md">Configure Match</h2>
        <div className="alert alert-info mb-md">
          2 active players required. Others join as spectators.
        </div>

        <div className="stack mb-md" style={{ gap: 6 }}>
          {activePlayers.map((p) => (
            <div key={p.id} className="player-item">
              <span className="player-name">{p.name}</span>
              <span className="badge badge-host">Team {p.teamSide}</span>
            </div>
          ))}
        </div>

        {isHost ? (
          <form className="stack" onSubmit={onSubmit}>
            <input className="input" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} placeholder="Team A name" maxLength={24} />
            <input className="input" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} placeholder="Team B name" maxLength={24} />
            <input className="input" type="number" min={1} max={20} value={overs} onChange={(e) => setOvers(e.target.value)} placeholder="Number of overs (1-20)" />
            <button className="btn btn-success" type="submit" disabled={saving || activePlayers.length !== 2}>
              {saving ? "Saving..." : "Lock Setup"}
            </button>
          </form>
        ) : (
          <div className="alert alert-info">Waiting for host to lock setup...</div>
        )}

        {error && <div className="alert alert-danger mt-md">{error}</div>}
        <p className="muted mt-md">You are {me?.isSpectator ? "a spectator" : `Team ${me?.teamSide}`}.</p>
      </div>
    </div>
  );
}
