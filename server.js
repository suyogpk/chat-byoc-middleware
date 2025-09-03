// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import AWS from "aws-sdk";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());

// Serve static files from public/
app.use(express.static("public"));

// Default route → load index.html
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

// Manual test endpoint (POST /sender-action)
app.post("/sender-action", (req, res) => {
  const action = req.body.senderAction?.action;

  if (!action) {
    return res.status(400).json({ error: "Missing senderAction.action" });
  }

  console.log("🔔 Sender action received:", action);

  // Broadcast to UI
  io.emit("sender-action", req.body);

  res.json({ status: "ok" });
});

// -----------------------------
// 🔹 SQS Listener for senderActionJob
// -----------------------------
const sqs = new AWS.SQS({
  region: "us-west-2",
  apiVersion: "2012-11-05",
});

// replace with your actual queue URL from logs
const queueUrl =
  "https://sqs-fips.us-west-2.amazonaws.com/265671366761/to-de-platform-sender-actions";

// Poll SQS for senderAction jobs
async function pollSQS() {
  try {
    const data = await sqs
      .receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 10,
      })
      .promise();

    if (data.Messages && data.Messages.length > 0) {
      for (const msg of data.Messages) {
        console.log("📩 SQS Message:", msg.Body);

        try {
          const parsed = JSON.parse(msg.Body);

          // Check if this is a senderActionJob
          if (parsed?.event?.senderAction) {
            console.log("✅ Broadcasting sender action:", parsed.event.senderAction);
            io.emit("sender-action", { senderAction: parsed.event.senderAction });
          }
        } catch (err) {
          console.error("❌ Error parsing SQS message:", err);
        }

        // Delete processed message
        await sqs
          .deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          })
          .promise();
      }
    }
  } catch (err) {
    console.error("❌ Error polling SQS:", err);
  }

  // keep polling
  setTimeout(pollSQS, 5000);
}

// Start polling SQS
pollSQS();

// -----------------------------
// Socket.io connection
// -----------------------------
io.on("connection", (socket) => {
  console.log("🟢 Client connected");
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected");
  });
});

// -----------------------------
// Start server
// -----------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
