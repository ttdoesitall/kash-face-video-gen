import { uploadVideoToYouTube } from '../../../lib/youtube';

export const maxDuration = 300;

// Standalone endpoint for testing/manual uploads. The Approve & Save flow
// calls the shared uploadVideoToYouTube() helper directly instead of hitting
// this route, but this stays available for one-off re-uploads.
export async function POST(request) {
  try {
    const { videoUrl, title, description } = await request.json();

    if (!videoUrl || !title) {
      return Response.json(
        { error: 'videoUrl and title are required' },
        { status: 400 }
      );
    }

    const result = await uploadVideoToYouTube({ videoUrl, title, description });
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('YouTube upload error:', error);
    return Response.json(
      { error: error.message || 'YouTube upload failed' },
      { status: 500 }
    );
  }
}
