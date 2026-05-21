import React from "react";
import { GameProvider, useGame } from "./context/GameContext";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import RolePage from "./pages/RolePage";
import NightBriefingPage from "./pages/NightBriefingPage";
import NightPage from "./pages/NightPage";
import DayPage from "./pages/DayPage";
import TribunalPage from "./pages/TribunalPage";
import AwaitingNightPage from "./pages/AwaitingNightPage";
import GameOverPage from "./pages/GameOverPage";
import CricketSetupPage from "./pages/CricketSetupPage";
import CricketTossPage from "./pages/CricketTossPage";
import CricketPowerSetupPage from "./pages/CricketPowerSetupPage";
import CricketMatchPage from "./pages/CricketMatchPage";
import CricketInningsBreakPage from "./pages/CricketInningsBreakPage";
import CricketResultPage from "./pages/CricketResultPage";
import "./styles.css";

function GameRouter() {
  const { phase } = useGame();

  switch (phase) {
    case "home":            return <HomePage />;
    case "lobby":           return <LobbyPage />;
    case "role":            return <RolePage />;
    case "night-briefing":  return <NightBriefingPage />;
    case "night":           return <NightPage />;
    case "day":             return <DayPage />;
    case "tribunal":        return <TribunalPage />;
    case "awaiting-next-night": return <AwaitingNightPage />;
    case "gameover":        return <GameOverPage />;
    case "cricket-setup": return <CricketSetupPage />;
    case "cricket-toss": return <CricketTossPage />;
    case "cricket-power-setup": return <CricketPowerSetupPage />;
    case "cricket-live": return <CricketMatchPage />;
    case "cricket-innings-break": return <CricketInningsBreakPage />;
    case "cricket-result": return <CricketResultPage />;
    default:                return <HomePage />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
