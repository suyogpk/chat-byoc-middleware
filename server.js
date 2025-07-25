const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// 🔐 Dummy Auth for /1.0/token
const VALID_CLIENT_ID = 'PU2RJE5MYKF3AXFP662MB6V5IQ3TEZDHGU4XIG4IV24EADPYMJWQ====';
const VALID_CLIENT_SECRET = 'VWGQWFQ33JLAXQE7PJ22XQCTIYMYX7GOBJAYVM6QJGPUFMI5XMVQ====';
const MOCKED_ACCESS_TOKEN = 'mocked-access-token-123456';

// 🔐 Token endpoint
app.post('/1.0/token', (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  if (
    grant_type === 'client_credentials' &&
    client_id === VALID_CLIENT_ID &&
    client_secret === VALID_CLIENT_SECRET
  ) {
    return res.status(200).json({
      access_token: MOCKED_ACCESS_TOKEN
    });
  }

  return res.status(401).json({ error: 'Invalid client credentials' });
});

// ✅ Outbound endpoint – responds with required CXone structure
app.post('/2.0/channel/:channelId/outbound', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== MOCKED_ACCESS_TOKEN) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const outboundPayload = req.body;
  console.log('📥 Outbound payload from CXone:', outboundPayload);

  const now = new Date().toISOString();
  const messageId = 'msg-' + Date.now();
  const threadId = outboundPayload.thread?.id || 'middleware-thread-' + Date.now();
  const cxThreadId = outboundPayload.thread?.idOnExternalPlatform || 'cx-thread-missing';
  const channelId = req.params.channelId;
  const recipients = outboundPayload.endUserRecipients || outboundPayload.recipients || [];

  const response = {
    consumerContact: {
      id: "contact-" + Date.now(),
      threadId: threadId,
      threadIdOnExternalPlatform: cxThreadId,
      channelId: channelId,
      interactionId: "interaction-" + Date.now(),
      consumerContactStorageId: threadId,
      contactId: "contact-id-" + Date.now(),
      customerContactId: "customer-contact-" + Date.now(),
      status: "pending",
      statusUpdatedAt: now,
      statusUpdatedAtWithMilliseconds: now,
      endUserRecipients: recipients,
      recipients: recipients,
      authorEndUserIdentity: {
        idOnExternalPlatform: recipients[0]?.idOnExternalPlatform || "user-unknown",
        firstName: "SimUser",
        lastName: "",
        nickname: "sim",
        image: ""
      },
      direction: "inbound",
      createdAt: now,
      preview: outboundPayload.messageContent?.payload?.text || "Message Preview",
      isOutboundAllowed: true,
    },
    message: {
      id: messageId,
      idOnExternalPlatform: messageId,
      postId: threadId,
      threadId: threadId,
      threadIdOnExternalPlatform: cxThreadId,
      messageContent: outboundPayload.messageContent,
      createdAt: now,
      createdAtWithMilliseconds: now,
      direction: "outbound",
      recipients: recipients
    }
  };

  console.log('✅ Responding with:', JSON.stringify(response, null, 2));
  return res.status(200).json(response);
});

// 🔁 Health check
app.get('/', (req, res) => {
  res.send('🟢 Middleware is up and running!');
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Middleware listening on port ${PORT}`);
});
