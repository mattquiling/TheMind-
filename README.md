# The Mind - Real-Time Multiplayer (React + Socket.IO)

A full-stack cooperative card game inspired by The Mind. Players must play cards in ascending order without communication, relying only on timing.

## Stack

- Client: React + Vite + Socket.IO client
- Server: Node.js + Express + Socket.IO

## Features Implemented

- Lobby creation with unique 5-character room code
- Join by room code with player name (max 10 players)
- Host designation and host-only start button
- Real-time rounds 1-12 with shuffled deck 1-100
- Server-authoritative validation for all card plays
- Enforced rule: player must play their own lowest card first
- Global lowest-card validation across all players
- Lives system with mistake burn/reveal flow and forced focus phase
- Focus phase with all-player READY gate before every round/resume
- Manual STOP by any player to return to focus phase
- Throwing star vote and consensus discard of lowest card per player
- Round rewards and caps:
  - Round 2, 5, 8: +1 star (cap 3)
  - Round 3, 6, 9: +1 life (cap 5)
- Win/Lose conditions:
  - Win after round 12
  - Lose at 0 lives

## Project Structure

```
TheMind-/
	client/
	server/
	package.json
```

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start both server and client:

```bash
npm run dev
```

3. Open the client URL shown by Vite (typically http://localhost:5173).

Server runs on http://localhost:4000 by default.

## Socket Events

Client -> Server:

- createRoom
- joinRoom
- startGame
- ready
- playCard
- suggestStar
- confirmStar
- stopRound (manual STOP action)

Server -> Client:

- roomUpdate
- gameStart
- gameUpdate
- focusPhase
- cardPlayed
- lifeLost
- roundComplete
- gameEnd

## Deploy For Friends (Netlify + Render)

Netlify can host the React client, but Socket.IO multiplayer needs a persistent Node server, so deploy backend separately.

### 1) Deploy Backend (Render)

This repository includes `render.yaml` for one-click setup.

1. Push this project to GitHub.
2. In Render, create a new Blueprint from your GitHub repo.
3. Render will create `themind-server` using `render.yaml`.
4. After deploy, copy the backend URL, for example:

- `https://themind-server.onrender.com`

5. Verify health endpoint:

- `https://themind-server.onrender.com/health`

### 2) Deploy Frontend (Netlify)

This repository includes `netlify.toml` configured for the client app.

1. In Netlify, import your GitHub repo.
2. Keep default build settings from `netlify.toml`.
3. Add environment variable in Netlify site settings:

- Key: `VITE_SERVER_URL`
- Value: your Render backend URL (for example `https://themind-server.onrender.com`)

4. Deploy site.

### 3) Test With Friends

1. Open the Netlify URL on phone and desktop.
2. One player creates lobby and shares room code.
3. Friends join from their own devices.

## Mobile Notes

- UI is responsive for phone widths with smaller cards, compact top bar, and optimized seat layout.
- Card play works on mobile by tapping cards (drag is optional on touch devices).
