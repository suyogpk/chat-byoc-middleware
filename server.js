const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// 🔐 Valid credentials
const VALID_CLIENT_ID = 'PU2RJE5MYKF3AXFP662MB6V5IQ3TEZDHGU4XIG4IV24EADPYMJWQ====';
const VALID_CLIENT_SECRET = 'VWGQWFQ33JLAXQE7PJ22XQCTIYMYX7GOBJAYVM6QJGPUFMI5XMVQ====';
const MOCKED_ACCESS_TOKEN = 'mocked-access-token-123456';

// 🔐 Token Endpoint
app.post('/1.0/token', (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  if (
    grant_type === 'client_credentials' &&
    client_id === VALID_CLIENT_ID &&
    client_secret === VALID_CLIENT_SECRET
  ) {
    return res.status(200).json({ access_token: MOCKED_ACCESS_TOKEN });
  }

  return res.status(401).json({ error: 'Invalid client credentials' });
});

// utbound Endpoint (Dynamic 201-style response)
app.post('/2.0/channel/:channelId/outbound', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== MOCKED_ACCESS_TOKEN) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const payload = req.body;
  const channelId = req.params.channelId;
  const messageId = `msg-${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Extract from request (fallbacks are added)
  const threadId = payload.thread?.idOnExternalPlatform || 'fallback-thread';
  const text = payload.messageContent?.payload?.text || 'no-text';
  const recipients = payload.recipients || [];

  // Prepare recipient identities
  const endUserIdentities = recipients.map((r, i) => ({
    idOnExternalPlatform: r.idOnExternalPlatform || `user-${i}`,
    firstName: r.name?.split(' ')[0] || 'First',
    lastName: r.name?.split(' ')[1] || '',
    nickname: '@bot',
    image: null
  }));

  // Send dynamic 201-style response
  return res.status(200).json({
    consumerContact: {
      id: Date.now().toString(),
      threadId: threadId,
      threadIdOnExternalPlatform: threadId,
      channelId: channelId,
      interactionId: `int-${Date.now()}`,
      consumerContactStorageId: threadId,
      contactId: `c-${Date.now()}`,
      customerContactId: `cust-${Date.now()}`,
      status: 'pending',
      statusUpdatedAt: timestamp,
      statusUpdatedAtWithMilliseconds: timestamp,
      tags: [],
      routingQueueId: `queue-${Date.now()}`,
      routingQueuePriority: 0,
      inboxAssignee: null,
      inboxAssigneeLastAssignedAt: timestamp,
      inboxAssigneeUser: null,
      ownerAssigneeUser: {
        id: 1,
        incontactId: 'owner-id',
        agentId: 100,
        emailAddress: 'bot@example.com',
        loginUsername: 'bot',
        firstName: 'Bot',
        surname: 'User',
        nickname: '@bot',
        imageUrl: null,
        publicImageUrl: null,
        isBotUser: true,
        isSurveyUser: false
      },
      ownedBySystem: 'Digital',
      endUserRecipients: recipients,
      recipients: recipients,
      detailUrl: `https://your-domain.com/case/${threadId}`,
      authorEndUserIdentity: endUserIdentities[0] || null,
      direction: 'inbound',
      createdAt: timestamp,
      preview: text,
      isOutboundAllowed: true,
      contactNumber: Date.now().toString(),
      pointOfContactId: 1338,
      divisionNumber: 1,
      acceleration: 1,
      routingAttribute: 0
    },
    message: {
      id: `m-${Date.now()}`,
      idOnExternalPlatform: messageId,
      postId: threadId,
      threadId: threadId,
      threadIdOnExternalPlatform: threadId,
      messageContent: {
        text: text,
        type: payload.messageContent?.type || 'TEXT',
        payload: payload.messageContent?.payload || {},
        fallbackText: 'Unsupported message content',
        isAutoTranslated: false,
        parameters: {},
        postback: null
      },
      createdAt: timestamp,
      createdAtWithMilliseconds: timestamp,
      isMadeByUser: true,
      direction: 'outbound',
      recipients: recipients,
      sentiment: 'neutral',
      isRead: true,
      readAt: timestamp,
      contactNumber: Date.now().toString()
    }
  });
});

// Health check
app.get('/', (req, res) => {
  res.send('BYOC middleware is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Middleware server listening on port ${PORT}`);
});
