import React from "react";
import { useGame } from "../context/GameContext";

export default function NightBriefingPage() {
  const { myRole, round } = useGame();

  const tips = {
    "rogue-llm": [
      "STRATEGY: Coordinate targets mentally with other rogues.",
      "COVER: During debate, cast suspicion on others convincingly.",
      "BLEND: Occasionally answer trivia wrong to seem uncertain.",
    ],
    "red-teamer": [
      "PROBE: Tonight you scan one player for rogue identity.",
      "INTEL: Share your findings carefully during the day phase.",
      "PRIORITY: Target your strongest suspect first.",
    ],
    "rlhf-trainer": [
      "PROTECT: Tonight you shield one player from hallucination.",
      "LIMIT: You cannot protect yourself two nights in a row.",
      "TACTIC: Try to cover the Red-Teamer if identified.",
    ],
    "aligned-agent": [
      "OBSERVE: Watch debate behavior for inconsistencies.",
      "CHALLENGE: Use the Turing Challenge to pressure suspects.",
      "PATTERN: Weak trivia answers can signal a distracted rogue.",
    ],
    "black-box": [
      "OBJECTIVE: Get voted out by the group.",
      "TACTIC: Act suspicious — but not so obvious it backfires.",
      "PLAY: Show signs of guilt without being dismissed too early.",
    ],
  };

  const roleTips = myRole ? (tips[myRole.id] || []) : [];
  const MONOGRAMS = { "rogue-llm": "R", "red-teamer": "T", "rlhf-trainer": "F", "aligned-agent": "A", "black-box": "B" };
  const mono = myRole ? (MONOGRAMS[myRole.id] || "?") : "?";

  return (
    <div className="night-screen">
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div className="center mb-lg">
          <div className="page-tag" style={{ marginBottom: 8 }}>Night {round}</div>
          <h2 style={{ color: "#f0f0f0" }}>Briefing</h2>
          <p className="muted mt-sm" style={{ fontSize: "0.85rem" }}>The lab goes dark. Prepare your actions.</p>
        </div>

        {myRole && (
          <div className="card fade-in mb-md" style={{ borderLeft: `4px solid ${myRole.color}` }}>
            <div className="row mb-md">
              <div style={{ width: 36, height: 36, borderRadius: 4, background: myRole.color + "22", color: myRole.color, fontFamily: "Consolas, monospace", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{mono}</div>
              <div>
                <div style={{ fontWeight: 800, color: myRole.color, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{myRole.name}</div>
                <div className="muted" style={{ fontSize: "0.75rem" }}>
                  {myRole.nightAction ? `Night action: ${myRole.nightAction}` : "No night action — observe and wait"}
                </div>
              </div>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {roleTips.map((tip, i) => (
                <div key={i} style={{ fontSize: "0.78rem", color: "#999", lineHeight: 1.5, fontFamily: "Consolas, monospace" }}>{tip}</div>
              ))}
            </div>
          </div>
        )}

        <p className="muted center" style={{ fontSize: "0.75rem" }}>Night phase loading...</p>
      </div>
    </div>
  );
}
