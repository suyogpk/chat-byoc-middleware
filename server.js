const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require('./config');

const app = express();
app.use(bodyParser.json());

// ✅ Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ✅ Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Body:', req.body);
    next();
});

// ✅ Health Check
app.get('/', (req, res) => {
    res.status(200).send('Chat BYOC Middleware is running!');
});

// ✅ Token Endpoint
app.post('/1.0/token', (req, res) => {
    const { client_id, client_secret } = req.body;

    if (client_id === CLIENT_ID && client_secret === CLIENT_SECRET) {
        return res.status(200).json({
            access_token: uuidv4(),
            token_type: "bearer",
            expires_in: TOKEN_EXPIRY
        });
    }

    return res.status(401).json({ error: "Unauthorized" });
});

// ✅ Outbound Reply Endpoint (Old CXone flow)
app.post('/outbound/reply', (req, res) => {
    console.log('Agent message received:', req.body);

    return res.status(200).json({
        externalMessageId: 'external-' + Date.now()
    });
});

// ✅ New Outbound Endpoint (CXone requirement)
app.post('/2.0/channel/:channelId/outbound', (req, res) => {
    console.log('Outbound message received:', req.body);

    const { channelId } = req.params;
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

// ✅ Recipient Validation Endpoint (Required for manual outbound)
app.post('/1.0/channel/:channelId/recipients/validation', (req, res) => {
    console.log('Recipient validation request received:', req.body);

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

    return res.status(200).json({
        status: "valid"
    });
});

// ✅ Add Action URL
app.post('/add', (req, res) => {
    console.log('Add Action triggered');
    res.status(200).json({ message: 'Add action completed successfully.' });
});

// ✅ Reconnect Action URL
app.post('/reconnect', (req, res) => {
    console.log('Reconnect Action triggered');
    res.status(200).json({ message: 'Reconnect action completed successfully.' });
});

// ✅ Remove Action URL
app.post('/remove', (req, res) => {
    console.log('Remove Action triggered');
    res.status(200).json({ message: 'Remove action completed successfully.' });
});

// ✅ Catch-all 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`Chat BYOC Middleware running on port ${PORT}`);
});
