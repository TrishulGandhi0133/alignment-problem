import React, { useMemo, useState } from "react";
import { useGame } from "../context/GameContext";

const POWER_OPTIONS = [
  { id: "not-out", label: "Not Out (batting)" },
  { id: "double-run", label: "Double Run (batting)" },
  { id: "guaranteed-wicket", label: "Guaranteed Wicket (bowling)" },
];

export default function CricketPowerSetupPage() {
  const { myId, players, cricketState, submitCricketPowers, error } = useGame();
  const me = players.find((p) => p.id === myId);
  const myMapping = cricketState?.myPowerMapping;

  const [mapping, setMapping] = useState(myMapping || {
    batsman1: "not-out",
    batsman2: "double-run",
    bowler: "guaranteed-wicket",
  });

  const duplicate = useMemo(() => new Set(Object.values(mapping)).size !== 3, [mapping]);

  const onSubmit = async () => {
    if (me?.isSpectator || duplicate) return;
    await submitCricketPowers(mapping);
  };

  if (me?.isSpectator) {
    return (
      <div className="page stadium-bg" style={{ justifyContent: "center" }}>
        <div className="card center">
          <h2>Power Setup</h2>
          <div className="alert alert-info mt-md">Spectators are waiting for both teams to configure powers.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page stadium-bg" style={{ justifyContent: "center" }}>
      <div className="card fade-in">
        <p className="page-tag">Power Mapping</p>
        <h2 className="mb-md">Team {me?.teamSide} Secret Powers</h2>
        <p className="muted mb-md">Assign each role a unique power. Opponents cannot see this until used.</p>

        {[
          { slot: "batsman1", label: "Batsman 1" },
          { slot: "batsman2", label: "Batsman 2" },
          { slot: "bowler", label: "Bowler" },
        ].map((item) => (
          <div key={item.slot} className="mb-md">
            <label className="muted" style={{ display: "block", marginBottom: 6 }}>{item.label}</label>
            <select className="input" value={mapping[item.slot]} onChange={(e) => setMapping((prev) => ({ ...prev, [item.slot]: e.target.value }))}>
              {POWER_OPTIONS.map((power) => (
                <option key={power.id} value={power.id}>{power.label}</option>
              ))}
            </select>
          </div>
        ))}

        {duplicate && <div className="alert alert-warning">Each role must use a different power.</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <button className="btn btn-success" onClick={onSubmit} disabled={duplicate}>Submit Secret Mapping</button>
      </div>
    </div>
  );
}
