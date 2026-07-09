import { HiggsfieldClient } from '@higgsfield/client';

const client = new HiggsfieldClient({
  apiKey: process.env.HF_API_KEY,
  apiSecret: process.env.HF_API_SECRET,
});

// Gender-mapped ElevenLabs voice IDs (LaToya's cloned voices).
const VOICE_IDS = {
  female: 'FrEczP9gx5ZHhejFiipb',
  male: 'cyXAisp3nOPo4KtDWoGh',
};

// Splits a script into chunks that stay comfortably under Higgsfield Speak's
// 15-second-per-clip cap. ~2.3 words/sec at a natural pace -> ~28 words
// keeps every chunk under ~12s, leaving margin before the 15s ceiling.
const MAX_WORDS_PER_CHUNK = 28;

function chunkScript(script) {
  const sentences = script
    .replace(/\s+/g, ' ')
    .trim()
    .match(/[^.!?]+[.!?]*/g) || [script];

  const chunks = [];
  let current = '';
  let currentWords = 0;

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    const sentenceWords = sentence.split(/\s+/).length;

    if (currentWords > 0 && currentWords + sentenceWords > MAX_WORDS_PER_CHUNK) {
      chunks.push(current.trim());
      current = sentence;
      currentWords = sentenceWords;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
      currentWords += sentenceWords;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length ? chunks : [script];
}

// Calls ElevenLabs and returns a WAV audio Buffer. WAV output means Higgsfield
// Speak (which requires WAV input) can consume it directly -- no server-side
// audio conversion needed.
async function generateSpeechWav(text, voiceId) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=wav_24000`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `ElevenLabs speech generation failed (${res.status}): ${errText.slice(0, 200)}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const maxDuration = 120;

export async function POST(request) {
  try {
    const { imageBase64, script, gender, movementPrompt } = await request.json();

    if (!imageBase64 || !script) {
      return Response.json(
        { error: 'Image and script are required' },
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

    if (!process.env.ELEVENLABS_API_KEY) {
      return Response.json(
        {
          error:
            'ElevenLabs API key is not configured yet. Add ELEVENLABS_API_KEY in Vercel to enable speech generation.',
        },
        { status: 501 }
      );
    }

    const voiceId = VOICE_IDS[gender] || VOICE_IDS.female;

    // Upload the avatar image once -- every chunk reuses the same image.
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imageUrl = await client.uploadImage(imageBuffer, 'jpeg');

    const chunks = chunkScript(script);
    const jobs = [];

    // Generate speech + submit a Speak (lip-sync) job for each chunk, in
    // order. Each submission uses withPolling: false so this route returns
    // quickly -- the frontend polls /api/video-status with the jobId list.
    for (const chunkText of chunks) {
      const wavBuffer = await generateSpeechWav(chunkText, voiceId);
      const audioUrl = await client.upload(wavBuffer, 'audio/wav');

      const jobSet = await client.generate(
        '/v1/speak/higgsfield',
        {
          input_image: { type: 'image_url', image_url: imageUrl },
          input_audio: { type: 'audio_url', audio_url: audioUrl },
          prompt: movementPrompt || 'Natural, engaging presentation style',
          quality: 'high',
          duration: 15,
        },
        { withPolling: false }
      );

      jobs.push({ jobId: jobSet.id, text: chunkText });
    }

    return Response.json({ success: true, jobs });
  } catch (error) {
    console.error('Video generation error:', error);
    return Response.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
