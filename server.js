const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// WebSocket endpoint ready for TikFinity / gift events later.
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

wss.on("connection", (socket) => {
  console.log("Game overlay connected");
  socket.send(JSON.stringify({ type: "connected" }));
});

// Simple HTTP endpoint for later testing:
// POST /gift  JSON: {"country":"السعودية","gift":"Love KSA"}
app.use(express.json());
app.post("/gift", (req, res) => {
  const country = req.body.country;
  const gift = req.body.gift || "Gift";

  if (!country) {
    return res.status(400).json({ ok: false, error: "country is required" });
  }

  // V19 rule: every accepted gift = exactly 1 step.
  broadcast({
    type: "gift",
    country,
    gift,
    points: 1
  });

  res.json({ ok: true, country, gift, points: 1 });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Flag Race V19 running on port ${PORT}`);
  console.log(`Local test: http://localhost:${PORT}`);
});
