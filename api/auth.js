// Step 1 of the Decap/GitHub OAuth dance.
// Decap opens this endpoint in a popup; we redirect to GitHub's authorize URL.
const crypto = require('crypto');

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing OAUTH_GITHUB_CLIENT_ID env var. Set it in the Vercel project settings.');
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = proto + '://' + host + '/api/callback';

  // CSRF state, verified in the callback via cookie
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',           // 'repo' works for private + public repos
    state: state,
    allow_signup: 'false',
  });

  res.setHeader('Set-Cookie',
    'oauth_state=' + state + '; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600');
  res.writeHead(302, { Location: 'https://github.com/login/oauth/authorize?' + params.toString() });
  res.end();
};
