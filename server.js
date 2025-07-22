const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check Bearer token
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }
  next();
}

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add handler (not relevant to CXone logic but kept as-is)
app.get('/add', (req, res) => {
  const { userId, brandId, token, apiHost, backUrl } = req.query;

  if (!userId || !brandId || !token || !apiHost || !backUrl) {
    return res.status(400).send('Missing required query parameters.');
  }

  console.log('Add invoked with:', { userId, brandId, token, apiHost, backUrl });
  return res.redirect(backUrl);
});

// ✅ Middleware token generator for Postman
app.post('/1.0/token', (req, res) => {
  const { client_id, client_secret } = req.body;

  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
    return res.status(401).json({ error: 'Invalid client credentials' });
  }

  const token = Buffer.from(`${Date.now()}`).toString('base64');
  res.json({
    access_token: token,
    token_type: 'bearer',
    expires_in: TOKEN_EXPIRY
  });
});

// ✅ Receives message and FORWARDS it to CXone /dfo/3.0/channels/{channelId}/messages
app.post('/2.0/channel/:channelId/outbound', authenticate, async (req, res) => {
  const { channelId } = req.params;
  const {
    thread,
    messageContent,
    endUserRecipients,
    createdAtWithMilliseconds,
    authorEndUserIdentity
  } = req.body;

  if (!thread || !messageContent || !endUserRecipients || !authorEndUserIdentity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiHost = req.headers['x-api-host'];
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!apiHost || !token) {
    return res.status(400).json({ error: 'Missing x-api-host or Authorization header' });
  }

  const payload = {
    idOnExternalPlatform: 'msg-' + Date.now(),
    thread: {
      idOnExternalPlatform: thread.idOnExternalPlatform
    },
    messageContent,
    createdAtWithMilliseconds: createdAtWithMilliseconds || new Date().toISOString(),
    direction: 'inbound',
    authorEndUserIdentity
  };

  try {
    const cxRes = await axios.post(
      `${apiHost}/dfo/3.0/channels/${channelId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({
      status: 'Message forwarded to CXone',
      cxoneResponse: cxRes.data
    });

  } catch (err) {
    console.error('Error forwarding to CXone:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send message to CXone' });
  }
});

// ✅ Optional: Simulate a reply if CXone replies to your callback endpoint
app.post('/outbound/reply', authenticate, (req, res) => {
  const {
    brand,
    post,
    messageContent,
    recipients,
    author
  } = req.body;

  const responseText = messageContent?.payload?.text || 'No message provided';

  res.json({
    message: {
      idOnExternalPlatform: 'reply-' + Date.now(),
      createdAtWithMilliseconds: new Date().toISOString(),
      url: 'https://bot.example.com/reply/' + Date.now(),
      reply: responseText
    },
    thread: {
      idOnExternalPlatform: post?.idOnExternalPlatform || 'unknown-thread'
    },
    recipients
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
