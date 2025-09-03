const express = require("express");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require("./config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory token store
const issuedTokens = new Map();

// ===== Token Endpoint =====
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

// ===== Token Middleware =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring(7);
  const tokenData = issuedTokens.get(token);

  if (!tokenData) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (Date.now() > tokenData.expiry) {
    issuedTokens.delete(token);
    return res.status(401).json({ error: "Token expired" });
  }

  next();
}

// ===== Outbound Endpoint =====
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
    endUserIdentities: [],
    recipients: []
  };

  console.log("Responding to outbound request with:", response);
  res.status(200).json(response);
});

// ===== Sender Actions Endpoint =====
app.post(
  "/1.0/channel/:channelId/thread/:threadIdOnExternalPlatform/sender-action",
  authenticateToken,
  (req, res) => {
    const { channelId, threadIdOnExternalPlatform } = req.params;
    const { brand, senderAction, authorUser } = req.body;

    console.log("Sender action received:", senderAction);

    // Broadcast sender action to UI via Socket.IO
    io.emit("sender-action", {
      channelId,
      threadIdOnExternalPlatform,
      brand,
      senderAction,
      authorUser,
    });

    res.status(204).send();
  }
);

// ===== Serve UI =====
app.use("/ui", express.static(path.join(__dirname, "public")));

// ===== Health Check =====
app.get("/", (req, res) => {
  res.send("BYOC Middleware running");
});

// ===== Start Server =====
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
