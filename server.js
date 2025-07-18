const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple token auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
  }
  next();
}

// Serve HTML UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ Handle Add Channel Setup from CXone
app.get('/add', (req, res) => {
  const { userId, brandId, token, apiHost, backUrl } = req.query;

  if (!userId || !brandId || !token || !apiHost || !backUrl) {
    return res.status(400).send('Missing required query parameters.');
  }

  console.log('✅ /add called with:', { userId, brandId, token, apiHost, backUrl });

  // Optionally save these values or trigger setup here

  return res.redirect(backUrl);
});

// Handle outbound message (e.g., from agent or chat UI)
app.post('/2.0/channel/:channelId/outbound', authenticate, async (req, res) => {
  const { thread, messageContent, endUserRecipients } = req.body;
  const userId = endUserRecipients?.[0]?.idOnExternalPlatform || 'unknown';
  const message = messageContent?.payload?.text || 'Hello?';

  try {
    let replyText = 'Sorry, I didn’t get that.';
    if (/help|support/i.test(message)) {
      replyText = 'Sure! How can I assist you today?';
    } else if (/hi|hello/i.test(message)) {
      replyText = 'Hello there! 👋';
    }

    return res.status(200).json({
      message: {
        idOnExternalPlatform: 'bot-msg-' + Date.now(),
        createdAtWithMilliseconds: new Date().toISOString(),
        url: 'https://bot.example.com/reply/' + Date.now(),
        reply: replyText
      },
      thread: {
        idOnExternalPlatform: thread.idOnExternalPlatform
      },
      messageContent: {
        payload: {
          text: replyText
        }
      },
      endUserIdentities: [
        {
          idOnExternalPlatform: userId,
          firstName: 'Bot',
          lastName: 'Responder',
          nickname: '@cxbot'
        }
      ],
      recipients: endUserRecipients
    });

  } catch (err) {
    console.error('❌ Chatbot error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Bot failed to reply.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
