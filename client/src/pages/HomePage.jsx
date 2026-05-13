import React, { useState } from "react";
import { useGame } from "../context/GameContext";

export default function HomePage() {
  const { createRoom, joinRoom, error, clearError, connected } = useGame();
  const [tab, setTab] = useState("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await createRoom(name.trim());
    setLoading(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    await joinRoom(code.trim(), name.trim());
    setLoading(false);
  };

  return (
    <div className="page" style={{ justifyContent: "center" }}>
      <div className="card fade-in">
        {/* Header */}
        <div className="center mb-lg">
          <div className="page-tag" style={{ marginBottom: 12 }}>AI · ML · GENAI</div>
          <h1 style={{ color: "#f0f0f0", marginBottom: 8 }}>THE ALIGNMENT<br />PROBLEM</h1>
          <p className="muted" style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
            Social deduction game with AI/ML trivia.<br />Detect the rogue LLMs before they take over.
          </p>
          <div className="mt-sm" style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.62rem", background: "rgba(192,57,43,0.15)", color: "#e57373", padding: "3px 10px", borderRadius: 2, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>ROGUE LLM</span>
            <span style={{ fontSize: "0.62rem", background: "rgba(255,92,0,0.12)", color: "#ff9a5c", padding: "3px 10px", borderRadius: 2, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>RED-TEAMER</span>
            <span style={{ fontSize: "0.62rem", background: "rgba(255,255,255,0.06)", color: "#888", padding: "3px 10px", borderRadius: 2, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>RLHF TRAINER</span>
          </div>
        </div>

        {!connected && (
          <div className="alert alert-warning mb-md">
            CONNECTING — server may take up to 30s to wake on free tier...
          </div>
        )}

        {error && (
          <div className="alert alert-danger mb-md" onClick={clearError} style={{ cursor: "pointer" }}>
            ERROR: {error}
          </div>
        )}

        {/* Tabs */}
        <div className="row mb-md" style={{ gap: 6 }}>
          <button
            className={`btn ${tab === "create" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setTab("create"); clearError(); }}
          >
            Create Room
          </button>
          <button
            className={`btn ${tab === "join" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setTab("join"); clearError(); }}
          >
            Join Room
          </button>
        </div>

        {tab === "create" ? (
          <form onSubmit={handleCreate} className="stack">
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem" }}>Your name</label>
              <input
                className="input"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
            <button className="btn btn-success" type="submit" disabled={!name.trim() || !connected || loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</> : "Create Game Room"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="stack">
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem" }}>Room code</label>
              <input
                className="input input-code"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
              />
            </div>
            <div>
              <label className="muted" style={{ display: "block", marginBottom: 6, fontSize: "0.85rem" }}>Your name</label>
              <input
                className="input"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!name.trim() || !code.trim() || !connected || loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Joining…</> : "Join Game"}
            </button>
          </form>
        )}

        <hr className="divider" />
        <p className="muted center" style={{ fontSize: "0.75rem", lineHeight: 1.6 }}>
          4–10 players · 30–45 min · AI/ML trivia challenges<br />
          Host creates a room · others join with the code
        </p>
      </div>
    </div>
  );
}
