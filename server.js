const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const VALID_CLIENT_ID = 'RKUZE6BP5EC4CME7SOHP2FKLZX6HIQR4QJDWCZM257LBLAE4S42Q====';
const VALID_CLIENT_SECRET = '22D55ODDKZDJNUCGSERFD67MNHLDXCC5RVBUF3GJMRPKVNSSGHDQ====';
const ISSUED_TOKEN = 'mocked-access-token-123456'; // this is what CXone should use as Bearer

// Endpoint: /1.0/token
app.post('/1.0/token', (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  if (
    grant_type === 'client_credentials' &&
    client_id === VALID_CLIENT_ID &&
    client_secret === VALID_CLIENT_SECRET
  ) {
    return res.status(200).json({
      access_token: ISSUED_TOKEN,
    });
  }

  return res.status(401).json({ error: 'Invalid client credentials' });
});

// Endpoint: /2.0/channel/:channelId/outbound
app.post('/2.0/channel/:channelId/outbound', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${ISSUED_TOKEN}`) {
    return res.status(401).json({ error: 'Invalid or missing Bearer token' });
  }

  const { brand, thread, messageContent, endUserRecipients, authorEndUserIdentity } = req.body;

  // basic validation
  if (!thread?.idOnExternalPlatform || !messageContent?.payload?.text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const messageId = `msg-${Date.now()}`;
  const now = new Date().toISOString();

  return res.status(200).json({
    message: {
      idOnExternalPlatform: messageId,
      createdAtWithMilliseconds: now,
      url: `https://your-channel.example.com/messages/${messageId}`,
    },
    thread: {
      idOnExternalPlatform: thread.idOnExternalPlatform,
    },
    endUserIdentities: [
      {
        idOnExternalPlatform: authorEndUserIdentity?.idOnExternalPlatform || 'default-id',
        firstName: authorEndUserIdentity?.firstName || 'Jane',
        lastName: authorEndUserIdentity?.lastName || 'Bot',
        nickname: authorEndUserIdentity?.nickname || '@janebot',
        image: authorEndUserIdentity?.image || '',
      },
    ],
    recipients: endUserRecipients || [],
  });
});

app.listen(port, () => {
  console.log(`Middleware server running on port ${port}`);
});
