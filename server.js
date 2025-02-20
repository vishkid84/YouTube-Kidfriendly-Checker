import fetch from 'node-fetch';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Replace these with your actual Client ID and Client Secret
const CLIENT_ID = '915378739390-o9hfmifregvhr1s8lnpj4rdp2b6csast.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

// The same redirect URI you registered in the Google Cloud Console
const REDIRECT_URI = 'http://127.0.0.1:5500/oauth2callback';

// Serve static files (including index.html)
app.use(express.static(path.join(__dirname)));

app.get('/test', (req, res) => {
    res.send('Test route works');
});

  
// This route handles the OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send('No code found in the query params.');
  }

  // Exchange the authorization code for an access token
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);
  params.append('redirect_uri', REDIRECT_URI);
  params.append('grant_type', 'authorization_code');

  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      // We have an access token! Let's fetch the subscriptions
      const subscriptionsUrl = 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50';
      const subsResponse = await fetch(subscriptionsUrl, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      const subsData = await subsResponse.json();

      // For now, just display the raw data
      return res.send(`<pre>${JSON.stringify(subsData, null, 2)}</pre>`);
    } else {
      return res.send(`Error getting token: ${JSON.stringify(tokenData)}`);
    }
  } catch (error) {
    console.error(error);
    return res.send('Error exchanging code for token.');
  }
});

// Start the server on port 5500
console.log('Starting server...');
app.listen(5500, () => {
  console.log('Server running at http://127.0.0.1:5500');
});
