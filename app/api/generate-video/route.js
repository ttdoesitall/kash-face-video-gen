import { HiggsfieldClient } from '@higgsfield/client';
import { InputImage, DoPModel } from '@higgsfield/client/helpers';

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

      const jobSet = await client.generate('/v1/image2video/dop', {
              model: DoPModel.TURBO,
              prompt: movementPrompt,
              input_images: [InputImage.fromUrl(imageUrl)],
      });

      if (jobSet.isFailed) {
              return Response.json(
                {
                            error:
                                          'Video generation failed. Try again or adjust the movement prompt.',
                },
                { status: 502 }
                      );
      }

      if (jobSet.isNsfw) {
              return Response.json(
                {
                            error:
                                          'The video was flagged by content moderation. Try adjusting the avatar image or prompt.',
                },
                { status: 422 }
                      );
      }

      const job = jobSet.jobs[0];
          const videoUrl = job && job.results ? job.results.raw.url : null;

      if (!videoUrl) {
              return Response.json(
                { error: 'No video was returned. Try again.' },
                { status: 502 }
                      );
      }

      return Response.json({ success: true, videoUrl });
    } catch (error) {
          console.error('Video generation error:', error);
          return Response.json(
            { error: error.message || 'Video generation failed' },
            { status: 500 }
                );
    }
}
