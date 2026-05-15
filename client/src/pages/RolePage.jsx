import React, { useState } from "react";
import { useGame } from "../context/GameContext";

export default function RolePage() {
  const { myRole, myName, acknowledgeRole } = useGame();
  const [revealed, setRevealed] = useState(false);

  const MONOGRAMS = { "rogue-llm": "R", "red-teamer": "T", "rlhf-trainer": "F", "aligned-agent": "A", "black-box": "B", "godson": "G" };
  const mono = myRole ? MONOGRAMS[myRole.id] || "?" : "?";

  if (!myRole) return null;

  return (
    <div className="page" style={{ justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 16px" }}>
        {!revealed ? (
          <div className="card center fade-in" style={{ cursor: "pointer" }} onClick={() => setRevealed(true)}>
            <div style={{ width: 64, height: 64, background: "#1e1e1e", border: "1px solid #2a2a2a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "Consolas, monospace", fontWeight: 900, fontSize: "1.8rem", color: "#333" }}>?</div>
            <h2>Your Role Card</h2>
            <p className="muted mt-sm" style={{ fontSize: "0.85rem" }}>Tap to reveal — keep it secret</p>
            <button className="btn btn-primary mt-md">Reveal My Role</button>
          </div>
        ) : (
          <div className={`role-card ${myRole.id} fade-in`}>
            <div className="role-monogram" style={{ background: myRole.color + "22", color: myRole.color }}>{mono}</div>
            <div className="role-name" style={{ color: myRole.color }}>{myRole.name}</div>
            <p className="muted mt-sm" style={{ fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>{myName}</p>
            <hr className="divider" />
            <p className="role-desc">{myRole.description}</p>
            <div className="role-win">
              Win condition: {myRole.winCondition}
            </div>
            {myRole.nightAction && (
              <div className="mt-sm" style={{ fontSize: "0.78rem", color: myRole.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Night power: {myRole.nightAction.charAt(0).toUpperCase() + myRole.nightAction.slice(1)}
              </div>
            )}
            <button className="btn btn-primary mt-md" onClick={acknowledgeRole}>
              Ready — Start Night Phase
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
