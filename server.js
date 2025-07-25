const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const VALID_CLIENT_ID = 'RKUZE6BP5EC4CME7SOHP2FKLZX6HIQR4QJDWCZM257LBLAE4S42Q====';
const VALID_CLIENT_SECRET = '22D55ODDKZDJNUCGSERFD67MNHLDXCC5RVBUF3GJMRPKVNSSGHDQ====';
const STATIC_TOKEN = 'middleware-static-token-123'; // Use this as the token for auth

// /1.0/token: CXone will call this to fetch the token from your middleware
app.post('/1.0/token', (req, res) => {
    const { grant_type, client_id, client_secret } = req.body;

    if (
        grant_type !== 'client_credentials' ||
        client_id !== VALID_CLIENT_ID ||
        client_secret !== VALID_CLIENT_SECRET
    ) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({ access_token: STATIC_TOKEN });
});

// Middleware to validate Bearer token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== STATIC_TOKEN) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }

    next();
};

// /2.0/channel/:channelId/outbound: Receives outbound message from CXone
app.post('/2.0/channel/:channelId/outbound', authenticateToken, (req, res) => {
    const channelId = req.params.channelId;
    const payload = req.body;

    console.log(`[✅ RECEIVED OUTBOUND] Channel ID: ${channelId}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Simulate a successful response back to CXone
    return res.status(200).json({
        message: {
            idOnExternalPlatform: `msg-${Date.now()}`,
            createdAtWithMilliseconds: new Date().toISOString(),
            url: `https://your-channel.example.com/messages/${Date.now()}`
        },
        thread: {
            idOnExternalPlatform: payload.thread?.idOnExternalPlatform || `thread-${Date.now()}`
        },
        endUserIdentities: [
            {
                idOnExternalPlatform: payload.endUserRecipients?.[0]?.idOnExternalPlatform || '',
                firstName: payload.authorEndUserIdentity?.firstName || 'John',
                lastName: payload.authorEndUserIdentity?.lastName || 'Doe',
                nickname: payload.authorEndUserIdentity?.nickname || '',
                image: ''
            }
        ],
        recipients: payload.endUserRecipients || []
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Middleware running on port ${PORT}`);
});
