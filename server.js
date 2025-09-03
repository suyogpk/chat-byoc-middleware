// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import bodyParser from "body-parser";
import { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } from "./config.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());

// ======================
// 🔹 In-memory token store
// ======================
const issuedTokens = new Map();

// ===== Generate Token =====
app.post("/1.0/token", (req, res) => {
  const { grant_type, client_id, client_secret, expires_in } = req.body;

  if (grant_type !== "client_credentials") {
    return res.status(400).json({ error: "Unsupported grant_type" });
  }
  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
    return res.status(401).json({ error: "Invalid client credentials" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiryTime = Date.now() + (expires_in || TOKEN_EXPIRY) * 1000;

  issuedTokens.set(token, { expiry: expiryTime });

  res.json({ access_token: token, expires_in: expires_in || TOKEN_EXPIRY });
});

// ===== Middleware: Bearer token validation =====
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

// ======================
// 🔹 Outbound Message Endpoint
// ======================
app.post("/2.0/channel/:channelId/outbound", authenticateToken, (req, res) => {
  const dynamicId = `msg-${Date.now()}`;

  const response = {
    message: {
      idOnExternalPlatform: dynamicId,
      createdAtWithMilliseconds: new Date().toISOString(),
      url: `https://your-channel.example.com/messages/${dynamicId}`,
    },
    thread: {
      idOnExternalPlatform: req.body.thread?.idOnExternalPlatform || "default-thread-id",
    },
    recipients: req.body.endUserRecipients || [],
  };

  console.log("📩 Outbound message received, responding with:", response);
  res.status(200).json(response);
});

// ======================
// 🔹 Sender Actions Endpoint (Typing events)
// ======================
app.post(
  "/1.0/channel/:channelId/thread/:threadIdOnExternalPlatform/sender-action",
  authenticateToken,
  (req, res) => {
    const { channelId, threadIdOnExternalPlatform } = req.params;
    const { brand, senderAction, authorUser } = req.body;

    console.log("✍️ Sender action received:");
    console.log("Channel ID:", channelId);
    console.log("Thread ID:", threadIdOnExternalPlatform);
    console.log("Brand:", brand?.friendlyName);
    console.log("Sender Action:", senderAction);
    console.log("Author User:", authorUser?.firstName);

    // 🔹 Broadcast to UI
    io.emit("sender-action", { senderAction, authorUser });

    res.status(204).send();
  }
);

// ======================
// 🔹 Health Check + UI
// ======================
app.get("/", (req, res) => {
  res.send(`
    <h2>BYOC Middleware running 🚀</h2>
    <p>Check typing indicator below:</p>
    <div id="typing-status" style="font-weight:bold;color:green;"></div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      socket.on("sender-action", (data) => {
        const statusBox = document.getElementById("typing-status");
        if (data.senderAction?.action === "isTypingOn") {
          statusBox.innerText = data.authorUser?.firstName + " is typing...";
        } else if (data.senderAction?.action === "isTypingOff") {
          statusBox.innerText = "";
        }
      });
    </script>
  `);
});

// ======================
// 🔹 Socket.io connection
// ======================
io.on("connection", (socket) => {
  console.log("🟢 Client connected to UI");
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected");
  });
});

// ======================
// 🔹 Start server
// ======================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
