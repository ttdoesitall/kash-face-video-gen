import { google } from 'googleapis';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avatar.ttdoesitall.ai';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const page = (bodyHtml) =>
    new Response(
      `<html><body style="font-family: sans-serif; max-width: 640px; margin: 60px auto; line-height: 1.6;">${bodyHtml}</body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );

  if (error) {
    return page(`<h2>YouTube connection failed</h2><p>${error}</p>`);
  }

  if (!code) {
    return page('<h2>Missing authorization code</h2><p>Try visiting /api/youtube/authorize again.</p>');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${SITE_URL}/api/youtube/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return page(`
        <h2>Connected, but no refresh token came back</h2>
        <p>Google only sends a refresh token the first time you approve, or after you
        revoke prior access. Go to
        <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>,
        remove access for this app, then visit <code>/api/youtube/authorize</code> again.</p>
      `);
    }

    return page(`
      <h2>YouTube connected</h2>
      <p>Copy the value below and add it to Vercel as an environment variable named
      <code>YOUTUBE_REFRESH_TOKEN</code>, then redeploy. This is a one-time setup step.</p>
      <textarea readonly style="width:100%;height:90px;font-size:14px;padding:8px;" onclick="this.select()">${tokens.refresh_token}</textarea>
    `);
  } catch (err) {
    console.error('YouTube OAuth callback error:', err);
    return page(`<h2>Something went wrong</h2><p>${err.message || 'Unknown error'}</p>`);
  }
}
