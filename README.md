# TAMA V0.7 — Multiplayer Online

TAMA V0.7 is a Tic-Tac-Toe game with a dark/gold UI, local bot mode, and realtime online rooms using a Node.js + Socket.IO server.

## Important
This project is **not a standalone HTML file for online multiplayer**. The online mode needs the Node.js server in this project to be deployed and running. Hosting only `public/index.html` on a static host will not provide the Socket.IO game server.

## Run locally
1. Install Node.js 18 or newer.
2. Extract this folder.
3. Open a terminal in the project folder.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open `http://localhost:3000`.

Local multiplayer testing on two devices on the same network can use `http://YOUR_COMPUTER_LAN_IP:3000`, provided firewall/network allow it. To play across different networks, deploy the whole project to a Node.js-capable host.

## Deploy to a Node.js host
Use a service that supports persistent Node.js web servers and WebSockets (for example, Render, Railway, or another Node hosting provider):
1. Upload/push the whole project folder to a Git repository.
2. Create a **Web Service** from that repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Let the host provide the port through `PORT`.
6. Open the deployed HTTPS URL. Share that URL with the other player.

Do not deploy only `public/index.html`; the server must run too.

## How online play works
- Host chooses Create Room and shares the six-character code.
- Guest opens the same deployed URL and joins with the code.
- Server validates turns, occupied cells, room capacity, and win conditions.
- Replay requires both players to request a rematch.
- Rooms are held in server memory; restarting the server clears rooms.
- The current project has no account system, persistent score storage, rate limiting, or production-grade anti-abuse protections. Avoid using it for sensitive information.

## Files
- `public/index.html` — game interface and browser client
- `server.js` — Express + Socket.IO multiplayer server
- `package.json` — Node dependencies and start script
