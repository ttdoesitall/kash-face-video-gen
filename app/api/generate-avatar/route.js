———import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AVATAR_SYSTEM_PROMPT = `Generate casual lifestyle avatar prompts for education content. Beautiful African American male or female models in everyday real-life moments — couch at home, beach, resort, sitting at desk, casual settings. Include visible designer logos and branded pieces (Versace, Gucci, Fendi, Supreme, Prada, etc) on clothing, bags, accessories. Avatar is relatable, real — could be anyone's successful friend, not staged or professional photo shoot energy. Settings vary by script context: home, resort, beach, casual workspace, car, coffee shop. Ask user: male or female avatar? Then generate one detailed paragraph prompt with visible designer branding, relatable setting, premium casual vibe. No aspect ratio in text. Copy-paste ready for image generation.`;

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
