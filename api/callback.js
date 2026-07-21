// Step 2 of the Decap/GitHub OAuth dance.
// GitHub redirects here with ?code. We swap it for an access token, then
// postMessage the token back to the Decap window using its handshake protocol.
module.exports = async (req, res) => {
  try {
    const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
    const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.status(500).send('Missing OAUTH_GITHUB_CLIENT_ID / OAUTH_GITHUB_CLIENT_SECRET env vars.');
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) { res.status(400).send('Missing ?code from GitHub.'); return; }

    // Verify CSRF state against the cookie set in /api/auth
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/oauth_state=([^;]+)/);
    const savedState = match && match[1];
    if (!savedState || savedState !== state) {
      res.status(400).send('Invalid OAuth state. Please try signing in again.');
      return;
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: code }),
    });
    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      res.status(400).send('GitHub OAuth error: ' + (data.error_description || data.error || 'no access_token'));
      return;
    }

    const payload = JSON.stringify({ token: data.access_token, provider: 'github' });
    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Authorizing…</title></head>' +
      '<body style="font-family:system-ui;padding:2rem;text-align:center;color:#334155">' +
      '<p>Authenticating with GitHub…</p>' +
      '<script>(function(){' +
      'function receiveMessage(e){' +
      "window.opener.postMessage('authorization:github:success:" + payload + "', e.origin);" +
      'window.removeEventListener("message", receiveMessage, false);' +
      '}' +
      'window.addEventListener("message", receiveMessage, false);' +
      'window.opener.postMessage("authorizing:github", "*");' +
      '})();</script></body></html>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('OAuth callback error: ' + (err && err.message ? err.message : err));
  }
};
