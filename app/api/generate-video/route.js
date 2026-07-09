import { HiggsfieldClient } from '@higgsfield/client';

const client = new HiggsfieldClient({
  apiKey: process.env.HF_API_KEY,
  apiSecret: process.env.HF_API_SECRET,
});

export async function POST(request) {
  try {
    const { imageBase64, movementPrompt } = await request.json();

    if (!imageBase64 || !movementPrompt) {
      return Response.json(
        { error: 'Image and movement prompt are required' },
        { status: 400 }
      );
    }

    if (!process.env.HF_API_KEY || !process.env.HF_API_SECRET) {
      return Response.json(
        {
          error:
            'Higgsfield API credentials are not configured yet. Add HF_API_KEY and HF_API_SECRET in Vercel to enable video generation.',
        },
        { status: 501 }
      );
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imageUrl = await client.uploadImage(imageBuffer, 'jpeg');

    // Higgsfield's dop-turbo model only accepts a single reference image, so
    // the outfit-reference image (used for wardrobe consistency elsewhere)
    // is intentionally not included here.
    const inputImages = [{ type: 'image_url', image_url: imageUrl }];

    // withPolling: false -- Higgsfield can take 3-5+ minutes to render a
    // clip, longer than a serverless function can safely hold a request
    // open. Submit the job and return its id immediately; the frontend
    // polls /api/video-status with this id until the video is ready.
    const jobSet = await client.generate(
      '/v1/image2video/dop',
      {
        model: 'dop-turbo',
        prompt: movementPrompt,
        input_images: inputImages,
      },
      { withPolling: false }
    );

    return Response.json({ success: true, jobId: jobSet.id });
  } catch (error) {
    console.error('Video generation error:', error);
    return Response.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
