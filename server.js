const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Optional security key.
// On Render you can later set BRIDGE_KEY as an Environment Variable.
const BRIDGE_KEY = process.env.BRIDGE_KEY || "";

app.use(express.json({ limit: "64kb" }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    version: "V24",
    overlayClients: wss.clients.size
  });
});

const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

wss.on("connection", (socket) => {
  console.log("Overlay connected");
  socket.send(JSON.stringify({ type: "connected", version: "V24" }));
});

function bridgeAuthorized(req) {
  if (!BRIDGE_KEY) return true;
  return req.header("x-bridge-key") === BRIDGE_KEY;
}

// Receives a normalized gift from bridge.js running beside TikFinity.
app.post("/gift", (req, res) => {
  if (!bridgeAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const country = String(req.body.country || "").trim();
  const gift = String(req.body.gift || "Gift").trim();
  const username = String(req.body.username || "").trim();

  if (!country) {
    return res.status(400).json({ ok: false, error: "country is required" });
  }

  // IMPORTANT: V24 always broadcasts ONE step only.
  const event = {
    type: "gift",
    country,
    gift,
    username,
    points: 1,
    timestamp: Date.now()
  };

  broadcast(event);
  console.log(`Gift -> ${country} | ${gift} | ${username || "viewer"} | +1`);

  res.json({
    ok: true,
    country,
    gift,
    points: 1,
    overlayClients: wss.clients.size
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Flag Race V24 running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
