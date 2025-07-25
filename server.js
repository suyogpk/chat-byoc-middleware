const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Valid credentials for CXone BYOC auth
const VALID_CLIENT_ID = 'PU2RJE5MYKF3AXFP662MB6V5IQ3TEZDHGU4XIG4IV24EADPYMJWQ====';
const VALID_CLIENT_SECRET = 'VWGQWFQ33JLAXQE7PJ22XQCTIYMYX7GOBJAYVM6QJGPUFMI5XMVQ====';
const MOCKED_ACCESS_TOKEN = 'mocked-access-token-123456';

// Middleware to parse JSON
app.use(bodyParser.json());

// 🔐 Token endpoint to validate CXone Mpower token exchange
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

// ✅ Outbound endpoint: receives message from CXone, validates token, sends expected payload back
app.post('/2.0/channel/:channelId/outbound', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!authHeader || !authHeader.startsWith('Bearer ') || token !== MOCKED_ACCESS_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  const messageId = 'msg-' + Date.now();
  const threadId = payload.thread?.id || 'default-thread';
  const threadIdOnExternalPlatform = payload.thread?.idOnExternalPlatform || 'external-thread-id';
  const channelId = req.params.channelId;

  console.log('✅ Outbound received:', JSON.stringify(payload, null, 2));

  const response = {
    consumerContact: {
      id: "1749798712389111",
      threadId,
      threadIdOnExternalPlatform,
      channelId,
      interactionId: "19465cc0-c493-4e2f-b051-bd1d1b94d63a",
      customerContactId: "16a72821-8bf1-4398-966c-9512bdef7f67",
      status: "pending",
      statusUpdatedAt: new Date().toISOString(),
      statusUpdatedAtWithMilliseconds: new Date().toISOString(),
      detailUrl: "https://example.com/chat/detail",
      ownerAssigneeUser: {
        id: 116618,
        incontactId: "11f05180-b9dc-e290-a5b5-0242ac110002",
        agentId: 1062,
        emailAddress: "suyog.kawley@nice.com",
        loginUsername: "suyog.kawley@11eec1b2-d135-af80-88ae-0242ac110002.do34.com",
        firstName: "suyog",
        surname: "kawley",
        imageUrl: "https://assets-de-na1.dev.niceincontact.com/platform/static/public/img/user/s.png",
        publicImageUrl: "https://assets-de-na1.dev.niceincontact.com/platform/static/public/img/user/s.png",
        isBotUser: true,
        isSurveyUser: false
      },
      endUserRecipients: payload.endUserRecipients || [],
      recipients: payload.endUserRecipients || [],
      createdAt: new Date().toISOString(),
      isOutboundAllowed: true
    },
    message: {
      id: messageId,
      idOnExternalPlatform: "e9cb3db8-e10b-47d5-bm73-9566ee0f5909",
      postId: threadId,
      threadId,
      threadIdOnExternalPlatform,
      messageContent: payload.messageContent || {
        type: "TEXT",
        payload: { text: "Default message" }
      },
      createdAt: new Date().toISOString(),
      createdAtWithMilliseconds: new Date().toISOString(),
      isMadeByUser: true,
      direction: "outbound",
      isRead: true,
      recipients: payload.endUserRecipients || [],
      authorRecipients: [],
      channel: { id: channelId },
      isReplyAllowed: false
    }
  };

  res.status(200).json(response);
});

// 🔁 Health check
app.get('/', (req, res) => {
  res.send('✅ BYOC middleware is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
