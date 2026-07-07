import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SCRIPT_PROMPT = `You are a script writer for faceless YouTube videos for Kash Face Academy.
Your job is to write a short, punchy script (60-90 seconds when read at normal pace) for this topic.

Brand voice:
- Direct and clear
- Educational but not boring
- Empowering, no fluff
- Speak to beauty professionals who want to make more money using AI
- Use "I" not "we"
- No generic hype like "game-changer" or "limited spots"

Topic: {topic}

Write a script that:
1. Opens with a hook (what problem does this solve?)
2. Gives 2-3 actionable steps or insights
3. Closes with a clear next action

Keep it real. Keep it useful. Make it copy-paste ready for Higgsfield.`;

const PROMPT_PROMPT = `You are an AI video prompt specialist for Higgsfield Seedance 2.0.
You take a script and turn it into a structured Higgsfield prompt block that produces realistic, premium video.

Context: This is for Kash Face Academy, a beauty education brand teaching AI to professionals.

Script: {script}

Create a Higgsfield prompt block that includes:
- SCENE: What's happening (talking head, walking, demonstrating, etc.)
- TIMING / SHOT LIST: Beat-by-beat breakdown (0-3s intro, 3-7s main point, etc.)
- CAMERA / MOTION: How the camera moves (locked, subtle push-in, etc.)
- LENS: Focal length and framing (50mm portrait, 35mm environmental, etc.)
- LIGHTING: How light behaves (bright studio, natural window light, etc.)
- ENVIRONMENT: Where the scene takes place (studio, salon, office, etc.)
- EMOTION: Delivery tone (warm, confident, educational, etc.)
- REALISM: Human details (breathing, pauses, eye shifts, hand gestures, etc.)
- NEGATIVE PROMPT: What must NOT happen (no stiff posing, no empty void, etc.)
- EXPORT SETTINGS: 720p for testing, 1080p for final

Make it specific and executable. No vague descriptions. Every detail should be copy-paste ready into Higgsfield.`;

export async function POST(request) {
  try {
    const { title } = await request.json();

    if (!title || title.trim().length === 0) {
      return Response.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate script using OpenAI
    const scriptResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: SCRIPT_PROMPT.replace('{topic}', title),
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const script = scriptResponse.choices[0].message.content.trim();

    // Generate Higgsfield prompt using Anthropic
    const promptResponse = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: PROMPT_PROMPT.replace('{script}', script),
        },
      ],
    });

    const prompt = promptResponse.content[0].type === 'text'
      ? promptResponse.content[0].text
      : '';

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('videos')
      .insert({
        title,
        script,
        higgsfield_prompt: prompt,
        status: 'generated',
        channel_id: process.env.NEXT_PUBLIC_CHANNEL_ID,
      });

    if (dbError) {
      console.error('Supabase error:', dbError);
    }

    return Response.json({
      success: true,
      script,
      prompt,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return Response.json(
      { error: error.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
