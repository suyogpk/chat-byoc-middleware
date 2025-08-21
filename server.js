const express = require("express");
const crypto = require("crypto");
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require("./config");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory token store
const issuedTokens = new Map();

/**
 * POST /1.0/token
 * Request:
 * {
 *   "grant_type": "client_credentials",
 *   "client_id": "xxx",
 *   "client_secret": "xxx",
 *   "expires_in": 3600
 * }
 * Response:
 * {
 *   "access_token": "randomtoken..."
 * }
 */
app.post("/1.0/token", (req, res) => {
  const { grant_type, client_id, client_secret, expires_in } = req.body;

  // Validate grant type
  if (grant_type !== "client_credentials") {
    return res.status(400).json({ error: "Unsupported grant_type" });
  }

  // Validate credentials
  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
    return res.status(401).json({ error: "Invalid client credentials" });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expiryTime = Date.now() + ((expires_in || TOKEN_EXPIRY) * 1000);

  issuedTokens.set(token, { expiry: expiryTime });

  // Respond with access token
  res.json({ access_token: token, expires_in: (expires_in || TOKEN_EXPIRY) });
});

// Middleware to validate Bearer token
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

// Outbound endpoint
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
    endUserIdentities: [
      {
        idOnExternalPlatform: "26a80dbd-354c-49bd-8b30-6d5045cd92ba",
        firstName: "suyogQA",
        lastName: "Kawley",
        nickname: "@suyogk",
        image: null
      },
      {
        idOnExternalPlatform: "11f05180-b9dc-e290-a5b5-0242ac110002",
        firstName: "SuyogQA",
        lastName: "Kawley",
        nickname: "@suyogk",
        image: null
      }
    ],
    recipients: [
      {
        idOnExternalPlatform: "26a80dbd-354c-49bd-8b30-6d5045cd92ba",
        name: "Suyog NiCEer",
        isPrimary: true,
        isPrivate: false,
        anonymizedAt: null,
        anonymizedReason: null
      },
      {
        idOnExternalPlatform: "11f05180-b9dc-e290-a5b5-0242ac110002",
        name: "SaurabhJain",
        isPrimary: true,
        isPrivate: false,
        anonymizedAt: null,
        anonymizedReason: null
      }
    ]
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

    console.log("Sender action received:");
    console.log("Channel ID:", channelId);
    console.log("Thread ID:", threadIdOnExternalPlatform);
    console.log("Brand:", brand);
    console.log("Sender Action:", senderAction);
    console.log("Author User:", authorUser);

    // In a real integration, send the senderAction to the external platform here
    res.status(204).send();
  }
);

// ===== Health Check =====
app.get("/", (req, res) => {
  res.send("BYOC Middleware running");
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});