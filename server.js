const express = require('express');
const app = express();
const crypto = require('crypto');

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Helper function to generate timestamps like "2025-07-25T20:05:57.000+00:00"
function getFormattedTimestamp() {
  const now = new Date();
  const iso = now.toISOString(); // e.g., "2025-07-25T20:05:57.123Z"
  const [date, timeWithMs] = iso.split('T');
  const [time, rest] = timeWithMs.split('.');
  const ms = (rest || '000').slice(0, 3); // force 3-digit ms
  return `${date}T${time}.${ms}+00:00`;
}

app.post('/2.0/channel/:channelId/outbound', (req, res) => {
  const externalMessageId = `msg-${Date.now()}`;

  const now = getFormattedTimestamp();

  const responsePayload = {
    consumerContact: {
      id: "1749798712389111",
      threadId: "c0cbeb1d-a2b2-411a-8e2f-c379b7658761",
      threadIdOnExternalPlatform: "22368683-3794-4ae0-acce-8561ebe0473b",
      channelId: "chat_21ca141d-0ad7-4459-aba0-f67a252ae650",
      interactionId: "19465cc0-c493-4e2f-b051-bd1d1b94d63a",
      consumerContactStorageId: "c0cbeb1d-a2b2-411a-8e2f-c379b7658761",
      contactId: "b6beb179-9170-4b03-ad30-26372900ce91",
      customerContactId: "16a72821-8bf1-4398-966c-9512bdef7f67",
      status: "resolved",
      statusUpdatedAt: now,
      statusUpdatedAtWithMilliseconds: now,
      // ... (no other fields changed)
    },
    message: {
      id: "0c4af3f8-dab5-4612-82f1-c1b3b835ab08",
      idOnExternalPlatform: externalMessageId,
      postId: "c0cbeb1d-a2b2-411a-8e2f-c379b7658761",
      threadId: "c0cbeb1d-a2b2-411a-8e2f-c379b7658761",
      threadIdOnExternalPlatform: "22368683-3794-4ae0-acce-8561ebe0473b",
      messageContent: {
        text: "hello suyog",
        type: "TEXT",
        payload: {
          text: "hello suyog",
          postback: "",
          elements: []
        },
        fallbackText: "Unsupported message content",
        isAutoTranslated: false,
        parameters: {},
        postback: null
      },
      createdAt: now,
      createdAtWithMilliseconds: now,
      // ... (no other fields changed)
    }
  };

  res.status(200).json(responsePayload);
});

app.listen(PORT, () => {
  console.log(`Middleware server listening on port ${PORT}`);
});
