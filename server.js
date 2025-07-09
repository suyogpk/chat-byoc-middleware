
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require('./config');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// 🔐 Middleware to check for Bearer token
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized. Bearer token required.' });
    }
    next();
}

// ✅ Health check
app.get('/', (req, res) => {
    res.status(200).send('Chat BYOC Middleware is running!');
});

// ✅ Token endpoint for client_credentials grant type
app.post('/1.0/token', (req, res) => {
    const { grant_type, client_id, client_secret } = req.body;

    if (
        grant_type !== 'client_credentials' ||
        client_id !== CLIENT_ID ||
        client_secret !== CLIENT_SECRET
    ) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({
        access_token: uuidv4(),
        token_type: "bearer",
        expires_in: TOKEN_EXPIRY
    });
});

// 🔐 Protected - Agent replies
app.post('/outbound/reply', authenticate, (req, res) => {
    console.log('Agent message received:', req.body);
    return res.status(200).json({
        externalMessageId: 'external-' + Date.now()
    });
});

// 🔐 Protected - Outbound message
app.post('/2.0/channel/:channelId/outbound', authenticate, (req, res) => {
    const { thread, endUserRecipients } = req.body;

    return res.status(200).json({
        message: {
            idOnExternalPlatform: 'outbound-' + Date.now(),
            createdAtWithMilliseconds: new Date().toISOString(),
            url: 'https://example.com/message/' + Date.now()
        },
        thread: {
            idOnExternalPlatform: thread.idOnExternalPlatform
        },
        endUserIdentities: [
            {
                idOnExternalPlatform: endUserRecipients[0]?.idOnExternalPlatform || 'unknown',
                firstName: 'John',
                lastName: 'Doe',
                nickname: '@john',
                image: ''
            }
        ],
        recipients: endUserRecipients
    });
});

// 🔐 Protected - Recipient validation
app.post('/1.0/channel/:channelId/recipients/validation', authenticate, (req, res) => {
    const { endUserRecipients } = req.body;

    if (!endUserRecipients || !endUserRecipients.length || !endUserRecipients[0].idOnExternalPlatform) {
        return res.status(400).json({
            displayErrorMessage: "Invalid recipient format",
            errorCode: "outboundValidationFailed",
            errors: [
                {
                    path: ["idOnExternalPlatform"],
                    message: "Invalid recipient format"
                }
            ]
        });
    }

    return res.status(200).json({ status: "valid" });
});

// ✅ Optional admin flows
app.post('/add', (req, res) => res.status(200).json({ message: 'Add action completed successfully.' }));
app.post('/reconnect', (req, res) => res.status(200).json({ message: 'Reconnect action completed successfully.' }));
app.post('/remove', (req, res) => res.status(200).json({ message: 'Remove action completed successfully.' }));

// 404 catch-all
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Chat BYOC Middleware running on port ${PORT}`);
});
