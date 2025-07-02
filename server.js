const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { CLIENT_ID, CLIENT_SECRET, TOKEN_EXPIRY } = require('./config');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Body:', req.body);
    next();
});

// Token Endpoint
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

// Outbound Reply Endpoint
app.post('/outbound/reply', (req, res) => {
    console.log('Agent message received:', req.body);

    return res.status(200).json({
        externalMessageId: 'external-' + Date.now()
    });
});

// Add Action URL
app.post('/', (req, res) => {
    console.log('Add Action triggered');
    res.status(200).json({ message: 'Add action completed successfully.' });
});

// Reconnect Action URL
app.post('/reconnect', (req, res) => {
    console.log('Reconnect Action triggered');
    res.status(200).json({ message: 'Reconnect action completed successfully.' });
});

// Remove Action URL
app.post('/remove', (req, res) => {
    console.log('Remove Action triggered');
    res.status(200).json({ message: 'Remove action completed successfully.' });
});

app.listen(PORT, () => {
    console.log(`Chat BYOC Middleware running on port ${PORT}`);
});
