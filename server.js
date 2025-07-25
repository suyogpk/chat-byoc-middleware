const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// 🔐 CXone credentials for /1.0/token
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

// ✅ Outbound endpoint – validates token and returns CXone-compatible structure
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
  console.log('✅ Outbound message received from CXone:', JSON.stringify(payload, null, 2));

  const messageId = 'msg-' + Date.now();
  const threadId = payload?.thread?.idOnExternalPlatform || 'unknown-thread-id';

  // Build recipients array
  const recipients = (payload.endUserRecipients || []).map((r) => ({
    idOnExternalPlatform: r.idOnExternalPlatform
  }));

  // Build identities array
  const endUserIdentities = (payload.endUserRecipients || []).map((r) => ({
    idOnExternalPlatform: r.idOnExternalPlatform,
    firstName: r.name?.split(' ')[0] || 'User',
    lastName: r.name?.split(' ')[1] || '',
    nickname: '@bot',
    image: ''
  }));

  const responseBody = {
    message: {
      idOnExternalPlatform: messageId,
      createdAtWithMilliseconds: new Date().toISOString(),
      url: `https://your-channel.example.com/messages/${messageId}`
    },
    thread: {
      idOnExternalPlatform: threadId
    },
    recipients,
    endUserIdentities
  };

  return res.status(200).json(responseBody);
});

// 🔁 Health check
app.get('/', (req, res) => {
  res.send('🟢 BYOC middleware is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Middleware server listening on port ${PORT}`);
});
