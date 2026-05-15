const ROLE_DEFINITIONS = {
  "rogue-llm": {
    id: "rogue-llm",
    name: "Rogue LLM",
    emoji: "R",
    alignment: "rogue",
    nightAction: "hallucinate",
    description:
      "You are a misaligned language model. Each night, choose a player to hallucinate (eliminate). Your goal: equal or outnumber the researchers.",
    winCondition: "Survive until rogue LLMs equal or outnumber researchers.",
    color: "#c0392b",
  },
  "red-teamer": {
    id: "red-teamer",
    name: "Red-Teamer",
    emoji: "T",
    alignment: "good",
    nightAction: "probe",
    description:
      "You are a security researcher. Each night, probe one player to learn if they are a rogue LLM. Share intel wisely.",
    winCondition: "Help eliminate all rogue LLMs.",
    color: "#e05200",
  },
  "rlhf-trainer": {
    id: "rlhf-trainer",
    name: "RLHF Trainer",
    emoji: "F",
    alignment: "good",
    nightAction: "protect",
    description:
      "You apply reinforcement learning from human feedback. Each night, protect one player from hallucination. You cannot protect yourself two nights in a row.",
    winCondition: "Help eliminate all rogue LLMs.",
    color: "#ff5c00",
  },
  "aligned-agent": {
    id: "aligned-agent",
    name: "Aligned Agent",
    emoji: "A",
    alignment: "good",
    nightAction: null,
    description:
      "You are a well-aligned AI agent. You have no night powers, but your reasoning and social deduction skills are crucial. Identify and vote out the rogue LLMs.",
    winCondition: "Help eliminate all rogue LLMs.",
    color: "#888888",
  },
  "black-box": {
    id: "black-box",
    name: "Black Box",
    emoji: "B",
    alignment: "neutral",
    nightAction: null,
    description:
      "You are a proprietary AI with hidden weights. Your goal is mysterious: get voted out by the group. Act suspicious — but not too obvious.",
    winCondition: "Get eliminated by a tribunal vote.",
    color: "#555555",
  },
  "godson": {
    id: "godson",
    name: "Godson",
    emoji: "G",
    alignment: "good",
    nightAction: null,
    description:
      "You are the Godson — a critical node the system depends on. You have no special powers. But if you are eliminated — day or night — the rogue LLMs win instantly. Stay hidden. Stay alive.",
    winCondition: "Survive. Your death means immediate defeat for all researchers.",
    color: "#f0c040",
  },
};

/**
 * Build a role list for a given player count.
 * 4 players  → 1 rogue, 1 red-teamer, 1 trainer, 1 aligned
 * 5 players  → 1 rogue, 1 red-teamer, 1 trainer, 1 aligned, 1 black-box
 * 6–7        → 2 rogues, 1 red-teamer, 1 trainer, rest aligned
 * 8–10       → 2 rogues, 1 red-teamer, 1 trainer, 1 black-box, rest aligned
 */
/**
 * Role distribution:
 * 4 players  → 1 rogue, 1 red-teamer, 1 trainer, 1 aligned
 * 5 players  → 1 rogue, 1 red-teamer, 1 trainer, 1 godson, 1 aligned
 * 6 players  → 1 rogue, 1 red-teamer, 1 trainer, 1 godson, 2 aligned
 * 7 players  → 2 rogues, 1 red-teamer, 1 trainer, 1 godson, 2 aligned
 * 8 players  → 2 rogues, 1 red-teamer, 1 trainer, 1 godson, 1 black-box, 2 aligned
 * 9–10       → 2 rogues, 1 red-teamer, 1 trainer, 1 godson, 1 black-box, rest aligned
 */
function buildRoleList(playerCount) {
  const roles = [];

  if (playerCount === 4) {
    roles.push(ROLE_DEFINITIONS["rogue-llm"]);
    roles.push(ROLE_DEFINITIONS["red-teamer"]);
    roles.push(ROLE_DEFINITIONS["rlhf-trainer"]);
    roles.push(ROLE_DEFINITIONS["aligned-agent"]);
  } else if (playerCount === 5) {
    roles.push(ROLE_DEFINITIONS["rogue-llm"]);
    roles.push(ROLE_DEFINITIONS["red-teamer"]);
    roles.push(ROLE_DEFINITIONS["rlhf-trainer"]);
    roles.push(ROLE_DEFINITIONS["godson"]);
    roles.push(ROLE_DEFINITIONS["aligned-agent"]);
  } else if (playerCount === 6) {
    roles.push(ROLE_DEFINITIONS["rogue-llm"]);
    roles.push(ROLE_DEFINITIONS["red-teamer"]);
    roles.push(ROLE_DEFINITIONS["rlhf-trainer"]);
    roles.push(ROLE_DEFINITIONS["godson"]);
    roles.push(ROLE_DEFINITIONS["aligned-agent"]);
    roles.push(ROLE_DEFINITIONS["aligned-agent"]);
  } else {
    roles.push(ROLE_DEFINITIONS["rogue-llm"]);
    roles.push(ROLE_DEFINITIONS["rogue-llm"]);
    roles.push(ROLE_DEFINITIONS["red-teamer"]);
    roles.push(ROLE_DEFINITIONS["rlhf-trainer"]);
    roles.push(ROLE_DEFINITIONS["godson"]);

    if (playerCount >= 8) {
      roles.push(ROLE_DEFINITIONS["black-box"]);
    }

    const remaining = playerCount - roles.length;
    for (let i = 0; i < remaining; i++) {
      roles.push(ROLE_DEFINITIONS["aligned-agent"]);
    }
  }

  return roles;
}

module.exports = { ROLE_DEFINITIONS, buildRoleList };
