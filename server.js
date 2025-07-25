const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// CXone Token Endpoint - Auth
app.post('/1.0/token', (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  // Validate credentials (replace with actual secrets in production)
  if (
    grant_type === 'client_credentials' &&
    client_id === 'RKUZE6BP5EC4CME7SOHP2FKLZX6HIQR4QJDWCZM257LBLAE4S42Q====' &&
    client_secret === '22D55ODDKZDJNUCGSERFD67MNHLDXCC5RVBUF3GJMRPKVNSSGHDQ===='
  ) {
    return res.status(200).json({
      access_token: uuidv4(),
      token_type: 'bearer',
      expires_in: 3600
    });
  }

  return res.status(401).json({
    error: 'Invalid client credentials'
  });
});

// Middleware Auth Validator
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // In real use: validate the token properly
  const token = authHeader.split(' ')[1];
  if (!token || token.length < 10) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
};

// Outbound Endpoint (used by CXone Mpower)
app.post('/2.0/channel/:channelId/outbound', authenticate, (req, res) => {
  const payload = req.body;

  console.log('Received outbound payload from CXone:', JSON.stringify(payload, null, 2));

  const responsePayload = {
    messageId: `msg-${Date.now()}`, // Or use uuidv4()
    timestamp: new Date().toISOString(),
    status: 'DELIVERED'
  };

  console.log('Responding to CXone with:', responsePayload);
  return res.status(200).json(responsePayload);
});

app.listen(port, () => {
  console.log(`BYOC Middleware running on port ${port}`);
});
