const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/2.0/channel/:channelId/outbound", (req, res) => {
  const dynamicId = `msg-${Date.now()}`;

  const response = {
    message: {
      idOnExternalPlatform: dynamicId,
      createdAtWithMilliseconds: "2025-07-25T20:05:57.000+00:00",
      url: `https://your-channel.example.com/messages/${dynamicId}`
    },
    thread: {
      idOnExternalPlatform: "bcea2def-0835-47b6-a2b9-be625e0dc788"
    },
    endUserIdentities: [
      {
        idOnExternalPlatform: "26a80dbd-354c-49bd-8b30-6d5045cd92ba",
        firstName: "Jane",
        lastName: "Bot",
        nickname: "@janebot",
        image: null
      },
      {
        idOnExternalPlatform: "11f05180-b9dc-e290-a5b5-0242ac110002",
        firstName: "Jane",
        lastName: "Bot",
        nickname: "@janebot",
        image: null
      }
    ],
    recipients: [
      {
        idOnExternalPlatform: "26a80dbd-354c-49bd-8b30-6d5045cd92ba",
        name: "Swapnil Youtuber",
        isPrimary: true,
        isPrivate: false,
        anonymizedAt: null,
        anonymizedReason: null
      },
      {
        idOnExternalPlatform: "11f05180-b9dc-e290-a5b5-0242ac110002",
        name: "",
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

app.get("/", (req, res) => {
  res.send("CXone BYOC Middleware is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
