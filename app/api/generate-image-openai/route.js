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

// ChatGPT's image model can't reliably render real designer logos, and
// attempts often come out as garbled "imitation" branding. Swap known
// designer/brand names for generic style language before sending the
// prompt, so ChatGPT-generated images never show fake logos.
const BRAND_REPLACEMENTS = [
      [/louis\s*vuitton/gi, 'monogram-pattern designer-style'],
      [/\bLV\b/g, 'monogram-style'],
      [/gucci/gi, 'designer-style'],
      [/fendi/gi, 'logo-print designer-style'],
      [/\bFF\b/g, 'monogram'],
      [/prada/gi, 'minimalist designer-style'],
      [/versace/gi, 'bold designer-style'],
      [/supreme/gi, 'streetwear designer-style'],
      [/cartier/gi, 'fine jewelry-style'],
      [/chanel/gi, 'classic designer-style'],
      [/\bdior\b/gi, 'elegant designer-style'],
      [/balenciaga/gi, 'modern designer-style'],
      [/saint\s*laurent|\bYSL\b/gi, 'chic designer-style'],
      [/herm[eè]s/gi, 'luxury designer-style'],
      [/rolex/gi, 'luxury watch-style'],
      [/burberry/gi, 'classic check designer-style'],
    ];

function stripDesignerBrands(prompt) {
      let sanitized = prompt;
      for (const [pattern, replacement] of BRAND_REPLACEMENTS) {
              sanitized = sanitized.replace(pattern, replacement);
      }
      return sanitized;
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

        const sanitizedPrompt = stripDesignerBrands(avatarPrompt);

        const response = await openai.images.generate({
                  model: 'gpt-image-1',
                  prompt: sanitizedPrompt,
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
