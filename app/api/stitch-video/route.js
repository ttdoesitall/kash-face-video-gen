import { HiggsfieldClient } from '@higgsfield/client';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new HiggsfieldClient({
  apiKey: process.env.HF_API_KEY,
  apiSecret: process.env.HF_API_SECRET,
});

// Combines the per-chunk lip-sync clips (from generate-video + video-status)
// into a single final video, in order, using ffmpeg's concat demuxer. All
// chunks come from the same Higgsfield model so codecs match and this can be
// a fast stream copy -- no re-encoding needed.
export const maxDuration = 120;

export async function POST(request) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stitch-'));

  try {
    const { videoUrls } = await request.json();

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return Response.json(
        { error: 'videoUrls (array) is required' },
        { status: 400 }
      );
    }

    if (videoUrls.length === 1) {
      // Nothing to stitch -- just return the single clip as-is.
      return Response.json({ success: true, videoUrl: videoUrls[0] });
    }

    const chunkPaths = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const res = await fetch(videoUrls[i]);
      if (!res.ok) {
        throw new Error(`Failed to download chunk ${i + 1} of ${videoUrls.length}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const chunkPath = path.join(workDir, `chunk-${i}.mp4`);
      await fs.writeFile(chunkPath, buffer);
      chunkPaths.push(chunkPath);
    }

    const listPath = path.join(workDir, 'list.txt');
    const listContent = chunkPaths.map((p) => `file '${p}'`).join('\n');
    await fs.writeFile(listPath, listContent);

    const outputPath = path.join(workDir, 'final.mp4');

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    const finalBuffer = await fs.readFile(outputPath);
    const finalUrl = await client.upload(finalBuffer, 'video/mp4');

    return Response.json({ success: true, videoUrl: finalUrl });
  } catch (error) {
    console.error('Video stitching error:', error);
    return Response.json(
      { error: error.message || 'Video stitching failed' },
      { status: 500 }
    );
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
