// Checks status of one or more Higgsfield Speak jobs (one per script chunk).
// generate-video submits all chunk jobs and returns immediately; the
// frontend polls this endpoint with the full jobId list until every chunk
// is done, then calls /api/stitch-video to combine them into one clip.

async function checkOneJob(jobId) {
  const res = await fetch(`https://platform.higgsfield.ai/v1/job-sets/${jobId}`, {
    headers: {
      'hf-api-key': process.env.HF_API_KEY,
      'hf-secret': process.env.HF_API_SECRET,
    },
  });

  if (!res.ok) {
    return { jobId, status: 'error', error: 'Failed to check status' };
  }

  const data = await res.json();
  const job = data.jobs && data.jobs[0];
  const status = job ? job.status : 'unknown';

  if (status === 'completed') {
    const videoUrl = job.results ? job.results.raw.url : null;
    if (!videoUrl) {
      return { jobId, status: 'failed', error: 'No video was returned for this chunk.' };
    }
    return { jobId, status: 'completed', videoUrl };
  }

  return { jobId, status };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobIdsParam = searchParams.get('jobIds') || searchParams.get('jobId');

    if (!jobIdsParam) {
      return Response.json({ error: 'jobIds is required' }, { status: 400 });
    }

    if (!process.env.HF_API_KEY || !process.env.HF_API_SECRET) {
      return Response.json(
        { error: 'Higgsfield API credentials are not configured yet.' },
        { status: 501 }
      );
    }

    const jobIds = jobIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const results = await Promise.all(jobIds.map(checkOneJob));

    const failed = results.find((r) => r.status === 'failed' || r.status === 'nsfw' || r.status === 'error');
    if (failed) {
      return Response.json({
        status: failed.status === 'error' ? 'failed' : failed.status,
        error: failed.error || 'One of the video chunks failed to generate.',
      });
    }

    const allCompleted = results.every((r) => r.status === 'completed');
    if (allCompleted) {
      // Preserve original chunk order for stitching.
      const videoUrls = jobIds.map((id) => results.find((r) => r.jobId === id).videoUrl);
      return Response.json({ status: 'completed', videoUrls });
    }

    const anyInProgress = results.some((r) => r.status === 'in_progress');
    return Response.json({
      status: anyInProgress ? 'in_progress' : 'queued',
      completedCount: results.filter((r) => r.status === 'completed').length,
      totalCount: results.length,
    });
  } catch (error) {
    console.error('Video status check error:', error);
    return Response.json(
      { error: error.message || 'Video status check failed' },
      { status: 500 }
    );
  }
}
