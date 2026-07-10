import { google } from 'googleapis';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avatar.ttdoesitall.ai';

// One-time setup step: visiting this URL sends you to Google's consent
// screen. After you approve, Google redirects to /api/youtube/callback with
// a refresh token to save in Vercel. Only needs to be run once (unless the
// refresh token ever gets revoked).
export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${SITE_URL}/api/youtube/callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
  });

  return Response.redirect(url);
}
