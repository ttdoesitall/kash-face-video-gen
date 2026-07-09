// Lightweight status check for a Higgsfield video job. generate-video kicks
// the job off without waiting (withPolling: false) and returns a jobId; the
// frontend calls this endpoint every few seconds until the video is ready.
// This request is always fast (a single status lookup), so it never risks
// the serverless-function timeout that a long blocking wait would hit.

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return Response.json({ error: 'jobId is required' }, { status: 400 });
    }

    if (!process.env.HF_API_KEY || !process.env.HF_API_SECRET) {
      return Response.json(
        { error: 'Higgsfield API credentials are not configured yet.' },
        { status: 501 }
      );
    }

    const res = await fetch(`https://platform.higgsfield.ai/v1/job-sets/${jobId}`, {
      headers: {
        'hf-api-key': process.env.HF_API_KEY,
        'hf-secret': process.env.HF_API_SECRET,
      },
    });

    if (!res.ok) {
      return Response.json(
        { error: 'Failed to check video status' },
        { status: 502 }
      );
    }

    const data = await res.json();
    const job = data.jobs && data.jobs[0];
    const status = job ? job.status : 'unknown';

    if (status === 'completed') {
      const videoUrl = job.results ? job.results.raw.url : null;
      if (!videoUrl) {
        return Response.json({ status: 'failed', error: 'No video was returned. Try again.' });
      }
      return Response.json({ status: 'completed', videoUrl });
    }

    if (status === 'failed') {
      return Response.json({
        status: 'failed',
        error: 'Video generation failed. Try again or adjust the movement prompt.',
      });
    }

    if (status === 'nsfw') {
      return Response.json({
        status: 'nsfw',
        error: 'The video was flagged by content moderation. Try adjusting the avatar image or prompt.',
      });
    }

    return Response.json({ status });
  } catch (error) {
    console.error('Video status check error:', error);
    return Response.json(
      { error: error.message || 'Video status check failed' },
      { status: 500 }
    );
  }
}
