import { google } from 'googleapis';
import { Readable } from 'stream';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://avatar.ttdoesitall.ai';

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${SITE_URL}/api/youtube/callback`
  );
  oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return oauth2Client;
}

// Downloads the finished video and uploads it straight to YouTube with the
// title/description already filled in. Best-effort: if YouTube isn't
// connected yet (no refresh token saved), this just skips instead of
// throwing, so it never blocks the Approve & Save flow.
export async function uploadVideoToYouTube({ videoUrl, title, description }) {
  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    console.warn('YOUTUBE_REFRESH_TOKEN not set -- skipping YouTube upload.');
    return { skipped: true, reason: 'YouTube not connected yet' };
  }

  const auth = getOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    throw new Error(`Failed to download video for YouTube upload: ${videoRes.status}`);
  }
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  const stream = Readable.from(buffer);

  const uploadRes = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: (title || 'Kash Face Academy').slice(0, 100),
        description: description || '',
        categoryId: '26', // Howto & Style
      },
      status: {
        // Private on upload -- she reviews on YouTube Studio and flips it to
        // Public herself when she's ready. Change to 'public' later if she
        // wants it to go live automatically instead.
        privacyStatus: 'private',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: stream,
    },
  });

  const videoId = uploadRes.data.id;
  return {
    videoId,
    url: videoId ? `https://youtube.com/watch?v=${videoId}` : null,
  };
}
