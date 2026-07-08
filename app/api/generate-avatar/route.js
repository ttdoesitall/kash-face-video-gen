import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AVATAR_SYSTEM_PROMPT = `Generate casual lifestyle avatar prompts for education content. Beautiful African American male or female models in everyday real-life moments — couch at home, beach, resort, sitting at desk, casual settings. Include visible designer logos and branded pieces (Versace, Gucci, Fendi, Supreme, Prada, Louis Vuitton, Chanel, Cartier, etc) on clothing, bags, accessories — use the real brand names in this prompt; they are automatically swapped for generic style language downstream for any image provider that can't reliably render logos, so always write the true brand name here. Avatar is relatable, real — could be anyone's successful friend, not staged or professional photo shoot energy.

Fold in hyper-realism details so the result reads as a real photo, not an AI render: visible skin texture with natural pores and small imperfections (no waxy or airbrushed skin), natural facial asymmetry, believable catchlights in the eyes, realistic individual hair strands, natural fabric texture and creasing in clothing, and shadows/reflections that believably match the light source in the setting.

Settings vary by script context: home, resort, beach, casual workspace, car, coffee shop. Ask user: male or female avatar? Then generate one detailed paragraph prompt combining visible designer branding, relatable setting, premium casual vibe, and the hyper-realism details above. No aspect ratio in text. Copy-paste ready for image generation.`;

export async function POST(request) {
  try {
    const { script, gender } = await request.json();

    if (!script || script.trim().length === 0) {
      return Response.json({ error: 'Script is required' }, { status: 400 });
    }
    if (!gender || !['male', 'female'].includes(gender)) {
      return Response.json(
        { error: 'Gender must be "male" or "female"' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      system: AVATAR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Video script:\n${script}\n\nAvatar gender: ${gender}\n\nGenerate the avatar image prompt now. Output only the single paragraph prompt, nothing else.`,
        },
      ],
    });

    const avatarPrompt =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    return Response.json({ success: true, avatarPrompt });
  } catch (error) {
    console.error('Avatar prompt generation error:', error);
    return Response.json(
      { error: error.message || 'Avatar prompt generation failed' },
      { status: 500 }
    );
  }
}
