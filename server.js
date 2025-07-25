const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// 🔐 CXone credentials for /1.0/token
const VALID_CLIENT_ID = 'RKUZE6BP5EC4CME7SOHP2FKLZX6HIQR4QJDWCZM257LBLAE4S42Q====';
const VALID_CLIENT_SECRET = '22D55ODDKZDJNUCGSERFD67MNHLDXCC5RVBUF3GJMRPKVNSSGHDQ====';
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

// ✅ Outbound endpoint – just validates token and responds to confirm integration
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
  console.log('✅ Outbound message received from CXone:', outboundPayload);

  // Simulate successful delivery back to CXone
  const messageId = 'msg-' + Date.now();

  return res.status(200).json({
    message: {
      idOnExternalPlatform: messageId,
      createdAtWithMilliseconds: new Date().toISOString(),
      url: `https://your-channel.example.com/messages/${messageId}`
    },
    thread: {
      idOnExternalPlatform: outboundPayload.thread?.idOnExternalPlatform || 'unknown-thread-id'
    },
    endUserIdentities: outboundPayload.endUserRecipients?.map(r => ({
      idOnExternalPlatform: r.idOnExternalPlatform,
      firstName: 'Jane',
      lastName: 'Bot',
      nickname: '@janebot',
      image: ''
    })) || [],
    recipients: outboundPayload.endUserRecipients || []
  });
});

// 🔁 Health check
app.get('/', (req, res) => {
  res.send('BYOC middleware is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Middleware server listening on port ${PORT}`);
});
