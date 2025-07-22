const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware: Authenticate Bearer token from CXone
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }
  next();
}

// ✅ Token endpoint - called by CXone DFO
app.post('/1.0/token', (req, res) => {
  const { client_id, client_secret, grant_type } = req.body;

  if (grant_type !== 'client_credentials') {
    return res.status(400).json({ error: 'Invalid grant_type' });
  }

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

// ✅ Outbound endpoint - called by CXone to send a message to your channel
app.post('/2.0/channel/:channelId/outbound', authenticate, async (req, res) => {
  try {
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

    const primaryRecipient = endUserRecipients?.[0];
    const now = new Date().toISOString();

    if (!primaryRecipient || !thread?.idOnExternalPlatform || !messageContent?.payload?.text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 🛠️ This is where you'd forward the message to your own channel if needed
    console.log('📤 Message from agent to customer:', messageContent.payload.text);

    // ✅ Send expected response back to CXone
    return res.status(200).json({
      message: {
        idOnExternalPlatform: 'msg-' + Date.now(),
        createdAtWithMilliseconds: now,
        url: `https://your-channel.example.com/messages/${Date.now()}`
      },
      thread: {
        idOnExternalPlatform: thread.idOnExternalPlatform
      },
      endUserIdentities: [
        {
          idOnExternalPlatform: primaryRecipient.idOnExternalPlatform,
          firstName: 'Jane',
          lastName: 'Bot',
          nickname: '@janebot',
          image: ''
        }
      ],
      recipients: endUserRecipients
    });

  } catch (err) {
    console.error('❌ Outbound error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

// Optional home route (can be removed in production)
app.get('/', (req, res) => {
  res.send('CXone BYOC Middleware is running.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Middleware server running at http://localhost:${PORT}`);
});
