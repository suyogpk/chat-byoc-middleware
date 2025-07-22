const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const { CLIENT_ID, CLIENT_SECRET } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic bearer token auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }
  next();
}

// Serve chat UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Channel setup for CXone Admin UI
app.get('/add', (req, res) => {
  const { userId, brandId, token, apiHost, backUrl } = req.query;

  if (!userId || !brandId || !token || !apiHost || !backUrl) {
    return res.status(400).send('Missing required query parameters.');
  }

  console.log('Add invoked with:', { userId, brandId, token, apiHost, backUrl });

  return res.redirect(backUrl);
});

// ✅ Outbound message relay to CXone
app.post('/2.0/channel/:channelId/outbound', authenticate, async (req, res) => {
  const {
    brand,
    thread,
    messageContent,
    endUserRecipients,
    replyToMessage,
    isReplyToSpecificMessage,
    attachments,
    forward
  } = req.body;

  const channelId = req.params.channelId;

  try {
    // Step 1: Get access token from CXone
    const tokenRes = await axios.post('https://api-de-na1.dev.niceincontact.com/auth/token', {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    const accessToken = tokenRes.data.access_token;

    // Step 2: Forward the outbound message to CXone
    const outboundPayload = {
      brand,
      thread,
      messageContent,
      endUserRecipients,
      replyToMessage,
      isReplyToSpecificMessage,
      attachments,
      forward
    };

    const cxoneRes = await axios.post(
      `https://api-de-na1.dev.niceincontact.com/dfo/3.0/channels/${channelId}/outbound`,
      outboundPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log('✅ Message sent to CXone:', cxoneRes.status);
    return res.status(200).json(cxoneRes.data);

  } catch (err) {
    console.error('❌ Error sending to CXone:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to send message to CXone' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
