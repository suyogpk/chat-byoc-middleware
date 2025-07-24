const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/2.0/channel/:channelId/outbound', async (req, res) => {
    const channelId = req.params.channelId;
    const bearerHeader = req.headers['authorization'];

    if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Bearer token in Authorization header' });
    }

    const cxoneToken = bearerHeader.split(' ')[1];

    const {
        thread,
        messageContent,
        brand,
        endUserRecipients,
        authorEndUserIdentity
    } = req.body;

    try {
        const idOnExternalPlatform = `msg-${Date.now()}`;
        const createdAtWithMilliseconds = new Date().toISOString();

        const cxonePayload = {
            idOnExternalPlatform,
            thread: {
                idOnExternalPlatform: thread?.idOnExternalPlatform || `thread-${Date.now()}`
            },
            messageContent,
            createdAtWithMilliseconds,
            direction: "outbound",
            authorEndUserIdentity: {
                idOnExternalPlatform: authorEndUserIdentity?.idOnExternalPlatform || "unknown-author"
            },
            recipients: (endUserRecipients || []).map(user => ({
                idOnExternalPlatform: user.idOnExternalPlatform,
                name: user.name,
                isPrimary: user.isPrimary,
                isPrivate: user.isPrivate
            }))
        };

        const cxoneResponse = await axios.post(
            `https://api-de-na1.dev.niceincontact.com/dfo/3.0/channels/${channelId}/messages`,
            cxonePayload,
            {
                headers: {
                    Authorization: `Bearer ${cxoneToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Respond to DFO with expected structure
        const responsePayload = {
            message: {
                idOnExternalPlatform,
                createdAtWithMilliseconds,
                url: `https://your-channel.example.com/messages/${idOnExternalPlatform}`
            },
            thread: {
                idOnExternalPlatform: thread?.idOnExternalPlatform
            },
            endUserIdentities: [
                {
                    idOnExternalPlatform: authorEndUserIdentity?.idOnExternalPlatform || "unknown-author",
                    firstName: authorEndUserIdentity?.firstName || "John",
                    lastName: authorEndUserIdentity?.lastName || "Doe",
                    nickname: authorEndUserIdentity?.nickname || "@john",
                    image: authorEndUserIdentity?.image || ""
                }
            ],
            recipients: endUserRecipients || []
        };

        res.status(200).json(responsePayload);
    } catch (error) {
        console.error('Error calling CXone API:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to forward message to CXone',
            details: error.response?.data || error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Middleware server is running on port ${port}`);
});
