const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// ✅ Token config
const VALID_CLIENT_ID = 'PU2RJE5MYKF3AXFP662MB6V5IQ3TEZDHGU4XIG4IV24EADPYMJWQ====';
const VALID_CLIENT_SECRET = 'VWGQWFQ33JLAXQE7PJ22XQCTIYMYX7GOBJAYVM6QJGPUFMI5XMVQ====';
const MOCKED_ACCESS_TOKEN = 'mocked-access-token-123456';

// 🔐 Token generation endpoint
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

// ✅ Outbound handler
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
  console.log('✅ Outbound message received from CXone:\n', JSON.stringify(payload, null, 2));

  const messageId = 'msg-' + Date.now();
  const now = new Date().toISOString();
  const threadId = payload?.thread?.idOnExternalPlatform || 'unknown-thread-id';
  const recipients = payload?.endUserRecipients || [];

  // 🧠 Default author if not provided
  const identities = recipients.map(r => ({
    idOnExternalPlatform: r.idOnExternalPlatform,
    firstName: r.name?.split(' ')[0] || 'Jane',
    lastName: r.name?.split(' ')[1] || 'Bot',
    nickname: '@bot',
    image: ''
  }));

  return res.status(200).json({
    message: {
      idOnExternalPlatform: messageId,
      createdAtWithMilliseconds: now,
      url: `https://your-channel.example.com/messages/${messageId}`
    },
    thread: {
      idOnExternalPlatform: threadId
    },
    recipients: recipients.map(r => ({
      idOnExternalPlatform: r.idOnExternalPlatform
    })),
    endUserIdentities: identities
  });
});

// 🟢 Health check
app.get('/', (req, res) => {
  res.send('BYOC middleware is running');
});

app.listen(PORT, () => {
  console.log(`🚀 Middleware server listening on port ${PORT}`);
});
