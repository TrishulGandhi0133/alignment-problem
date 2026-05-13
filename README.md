# The Alignment Problem

> **AI Mafia** — A social deduction party game for tech teams. Detect the rogue LLMs before they outnumber the researchers. Survive tribunal questions. Trust no one.

---

## How to Play

### Roles
| Role | Count | Description |
|---|---|---|
| 🔴 **Rogue LLM** | 1–2 | Eliminate researchers each night |
| 🔍 **Red-Teamer** | 1 | Probe a player each night — learn if they're rogue |
| 🛡️ **RLHF Trainer** | 1 | Protect a player from elimination each night |
| 🤖 **Aligned Agent** | Rest | Deduce and vote out the rogues |
| ⬛ **Black Box** | 1 (8+ players) | Win by getting voted out |

### Game Flow
1. **Night Phase** — Rogues hallucinate, trainer protects, red-teamer probes (all secret)
2. **Dawn** — Elimination (or protection) revealed
3. **Day Debate** — 5 min discussion; anyone can issue a Turing Challenge
4. **Turing Challenge** — Challenge a suspect: answer an AI trivia question or face suspicion
5. **Vote** — Group votes to retrain (eliminate) the most suspected player
6. **Tribunal** — Most-voted player answers a trivia question to survive or be eliminated
7. Repeat until win condition met

### Win Conditions
- 🏆 **Researchers win** — all rogue LLMs eliminated
- 🔴 **Rogues win** — equal/outnumber researchers
- ⬛ **Black Box wins** — gets voted out by tribunal

---

## Running Locally

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Server
```bash
cd server
npm install
node index.js        # runs on http://localhost:3001
# or for dev:
npx nodemon index.js
```

### 2. Client
```bash
cd client
npm install
# create .env file:
echo "VITE_SERVER_URL=http://localhost:3001" > .env
npm run dev          # runs on http://localhost:5173
```

Open two browser tabs to test as two players.

---

## Deploying for Free (Render + Vercel)

### Step 1 — Push to GitHub
```
GitHub repo structure (can be one repo):
alignment-problem/
  server/
  client/
```

### Step 2 — Deploy Server to Render (free tier)

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `node index.js`
   - **Plan:** Free
4. Note your Render URL: `https://your-app.onrender.com`

> ⚠️ Free tier sleeps after 15 min inactivity. First request takes ~30s. Open the app 1 min before playing.

### Step 3 — Deploy Client to Vercel (free tier)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Settings:
   - **Root directory:** `client`
   - **Framework:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. **Environment Variables:** Add `VITE_SERVER_URL` = your Render URL (e.g. `https://your-app.onrender.com`)
5. Deploy → get your Vercel URL

### Step 4 — Share with your team!
Send the Vercel URL. Make a QR code. Put it on the office TV. Play!

---

## Project Structure

```
alignment-problem/
├── server/
│   ├── index.js           # Express + Socket.io server
│   ├── gameEngine.js      # Room management, role assignment, game logic
│   ├── roles.js           # Role definitions
│   ├── package.json
│   └── data/
│       └── questions.json # 60 AI/ML trivia questions (6 categories)
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles.css
        ├── context/
        │   └── GameContext.jsx   # All Socket.io state & actions
        └── pages/
            ├── HomePage.jsx       # Create/Join room
            ├── LobbyPage.jsx      # Waiting room + player list
            ├── RolePage.jsx       # Secret role reveal
            ├── NightBriefingPage.jsx
            ├── NightPage.jsx      # Night action selector + timer
            ├── DayPage.jsx        # Debate + Turing Challenge + Vote
            ├── TribunalPage.jsx   # Trivia survival question
            ├── AwaitingNightPage.jsx
            └── GameOverPage.jsx   # Winner + full leaderboard
```

---

## Question Categories

| Category | Count | Type |
|---|---|---|
| Buzzword or Bull | 15 | True/False |
| Model or Movie | 10 | True/False |
| Who Said This / Paper | 10 | MCQ |
| Finish the Formula | 10 | MCQ |
| GenAI Scenario | 10 | MCQ |
| Debug the Prompt | 5 | MCQ |

All questions are in `server/data/questions.json` — easily editable!

---

## Customizing Questions

Edit `server/data/questions.json`. Each question follows this schema:

```json
{
  "id": "q99",
  "category": "Buzzword or Bull",
  "difficulty": "easy",
  "question": "Is X a real concept?",
  "type": "boolean",
  "options": ["True", "False"],
  "answer": "True",
  "explanation": "Yes, because..."
}
```

For MCQ questions, set `"type": "mcq"` and format options as `["A) ...", "B) ...", "C) ...", "D) ..."]` with `"answer": "A"`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Pure CSS (no framework) |
| Real-time | Socket.io |
| Backend | Node.js + Express |
| State | React Context |
| Hosting | Vercel (client) + Render (server) |
| Data | JSON flat file (no DB needed) |
