const express = require("express");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require("./config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory token store
const issuedTokens = new Map();

// ====== Token Endpoint ======
app.post("/1.0/token", (req, res) => {
  const { grant_type, client_id, client_secret, expires_in } = req.body;

  if (grant_type !== "client_credentials") {
    return res.status(400).json({ error: "Unsupported grant_type" });
  }
  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
    return res.status(401).json({ error: "Invalid client credentials" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiryTime = Date.now() + ((expires_in || TOKEN_EXPIRY) * 1000);
  issuedTokens.set(token, { expiry: expiryTime });

  res.json({ access_token: token, expires_in: (expires_in || TOKEN_EXPIRY) });
});

// ====== Auth Middleware ======
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring(7);
  const tokenData = issuedTokens.get(token);

  if (!tokenData) return res.status(401).json({ error: "Invalid or expired token" });
  if (Date.now() > tokenData.expiry) {
    issuedTokens.delete(token);
    return res.status(401).json({ error: "Token expired" });
  }
  next();
}

// ====== Outbound Endpoint ======
app.post("/2.0/channel/:channelId/outbound", authenticateToken, (req, res) => {
  const dynamicId = `msg-${Date.now()}`;
  const response = {
    message: {
      idOnExternalPlatform: dynamicId,
      createdAtWithMilliseconds: new Date().toISOString(),
      url: `https://your-channel.example.com/messages/${dynamicId}`
    },
    thread: {
      idOnExternalPlatform: req.body.thread?.idOnExternalPlatform || "default-thread-id"
    },
    recipients: req.body.endUserRecipients || []
  };
  console.log("📨 Outbound response:", response);
  res.status(200).json(response);
});

// ====== Sender Actions Endpoint ======
app.post("/1.0/channel/:channelId/thread/:threadIdOnExternalPlatform/sender-action",
  authenticateToken,
  (req, res) => {
    const { channelId, threadIdOnExternalPlatform } = req.params;
    const { brand, senderAction, authorUser } = req.body;

    console.log("✍️ Sender action received:", { channelId, threadIdOnExternalPlatform, senderAction });

    // Broadcast to UI
    io.emit("sender-action", { channelId, threadIdOnExternalPlatform, senderAction, authorUser });
    res.status(204).send();
  }
);

// ====== Health Check ======
app.get("/", (req, res) => {
  res.send(`✅ BYOC Middleware running<br>Check <a href="/ui">/ui</a> for typing indicator`);
});

// ====== Simple UI for Typing Indicator ======
app.get("/ui", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Typing Indicator</title>
      <script src="/socket.io/socket.io.js"></script>
    </head>
    <body>
      <h3>Typing Indicator Test</h3>
      <div id="indicator">Waiting...</div>
      <script>
        const socket = io();
        socket.on("sender-action", (data) => {
          if (data.senderAction?.action === "isTypingOn") {
            document.getElementById("indicator").innerText = "💬 Agent is typing...";
          } else if (data.senderAction?.action === "isTypingOff") {
            document.getElementById("indicator").innerText = "✅ Agent stopped typing";
          } else {
            document.getElementById("indicator").innerText = JSON.stringify(data);
          }
        });
      </script>
    </body>
    </html>
  `);
});

// ====== Socket.IO ======
io.on("connection", (socket) => {
  console.log("🟢 UI connected");
  socket.on("disconnect", () => console.log("🔴 UI disconnected"));
});

// ====== Start ======
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
