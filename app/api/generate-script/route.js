import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCRIPT_SYSTEM_PROMPT = `Generate short, high-impact video scripts (under 90 seconds) for beauty entrepreneurs learning AI. Hook with a specific problem that costs beauty pros money or time. Reveal the exact AI system that solves it (name the tool: Zapier, Claude, n8n, etc). Close with a soft CTA tied to making or saving money. Tone: peer-to-peer, confident, no fluff. Like talking to another salon owner who already gets the game — you're just showing the next move. Speak directly; avoid jargon. For African American beauty entrepreneurs. Script only — no camera directions, no abbreviations (write "artificial intelligence" not "AI"). Copy-paste ready for ElevenLabs.`;

export async function POST(request) {
  try {
    const { title } = await request.json();

    if (!title || title.trim().length === 0) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
        { role: 'user', content: `Video title: ${title}` },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const script = response.choices[0].message.content.trim();

    return Response.json({ success: true, script });
  } catch (error) {
    console.error('Script generation error:', error);
    return Response.json(
      { error: error.message || 'Script generation failed' },
      { status: 500 }
    );
  }
}
