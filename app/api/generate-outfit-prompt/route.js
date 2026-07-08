—import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const OUTFIT_SYSTEM_PROMPT = `You turn an avatar image prompt into a separate "clothing reference" image prompt. Read the avatar prompt and pull out only the wardrobe and accessories described (top, bottom if mentioned, jewelry, bag, shoes). Output one paragraph prompt for a clean product-style reference photo of just those clothing items and accessories laid flat or on a plain mannequin against a simple neutral background — no face, no body, no person, no setting. Keep any designer/brand references exactly as they appeared in the avatar prompt (they get swapped automatically downstream if needed). Studio product photography lighting, sharp focus, true-to-life color and texture. Output only the single paragraph prompt, nothing else.`;

export async function POST(request) {
    try {
          const { avatarPrompt } = await request.json();

      if (!avatarPrompt || avatarPrompt.trim().length === 0) {
              return Response.json({ error: 'Avatar prompt is required' }, { status: 400 });
      }

      const response = await anthropic.messages.create({
              model: 'claude-sonnet-5',
              max_tokens: 400,
              system: OUTFIT_SYSTEM_PROMPT,
              messages: [
                {
                            role: 'user',
                            content: `Avatar prompt:\n${avatarPrompt}\n\nGenerate the clothing reference prompt now. Output only the single paragraph prompt, nothing else.`,
                },
                      ],
      });

      const outfitPrompt =
              response.content[0].type === 'text' ? response.content[0].text.trim() : '';

      return Response.json({ success: true, outfitPrompt });
    } catch (error) {
          console.error('Outfit prompt generation error:', error);
          return Response.json(
            { error: error.message || 'Outfit prompt generation failed' },
            { status: 500 }
                );
    }
}
