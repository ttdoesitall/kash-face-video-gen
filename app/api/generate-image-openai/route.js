import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function sizeForAspectRatio(aspectRatio) {
    switch (aspectRatio) {
      case '9:16':
      case '4:5':
              return '1024x1536';
      case '1:1':
              return '1024x1024';
      case '16:9':
      default:
              return '1536x1024';
    }
}

export async function POST(request) {
    try {
          const { avatarPrompt, aspectRatio } = await request.json();

      if (!avatarPrompt || avatarPrompt.trim().length === 0) {
              return Response.json(
                { error: 'Avatar prompt is required' },
                { status: 400 }
                      );
      }

      const response = await openai.images.generate({
              model: 'gpt-image-1',
              prompt: avatarPrompt,
              size: sizeForAspectRatio(aspectRatio),
              n: 1,
      });

      const imageBase64 = response.data && response.data[0] ? response.data[0].b64_json : null;

      if (!imageBase64) {
              return Response.json(
                { error: 'ChatGPT did not return an image. Try adjusting the avatar prompt.' },
                { status: 502 }
                      );
      }

      return Response.json({ success: true, imageBase64, mimeType: 'image/png' });
    } catch (error) {
          console.error('OpenAI image generation error:', error);
          return Response.json(
            { error: error.message || 'Image generation failed' },
            { status: 500 }
                );
    }
}
