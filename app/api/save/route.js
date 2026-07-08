import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const {
      title,
      script,
      gender,
      avatarPrompt,
      imageBase64,
      outfitImageBase64,
      movementPrompt,
      videoUrl,
    } = await request.json();

    if (!title || !script || !movementPrompt) {
      return Response.json(
        { error: 'Title, script, and movement prompt are required to save' },
        { status: 400 }
      );
    }

    const fullRecord = {
      title,
      script,
      gender: gender || null,
      avatar_prompt: avatarPrompt || null,
      movement_prompt: movementPrompt,
      higgsfield_prompt: movementPrompt,
      image_base64: imageBase64 || null,
      outfit_image_base64: outfitImageBase64 || null,
      video_url: videoUrl || null,
      status: 'approved',
      channel_id: process.env.NEXT_PUBLIC_CHANNEL_ID,
    };

    const { error: fullError } = await supabase.from('videos').insert(fullRecord);

    if (!fullError) {
      return Response.json({ success: true, mode: 'full' });
    }

    console.error('Full save failed, falling back to minimal columns:', fullError);

    const minimalRecord = {
      title,
      script,
      higgsfield_prompt: movementPrompt,
      status: 'approved',
      channel_id: process.env.NEXT_PUBLIC_CHANNEL_ID,
    };

    const { error: minimalError } = await supabase
      .from('videos')
      .insert(minimalRecord);

    if (minimalError) {
      console.error('Minimal save also failed:', minimalError);
      return Response.json(
        { error: minimalError.message || 'Save failed' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      mode: 'partial',
      warning:
        'Saved title, script, and movement prompt. Some fields were not saved because the videos table is missing columns.',
    });
  } catch (error) {
    console.error('Save error:', error);
    return Response.json(
      { error: error.message || 'Save failed' },
      { status: 500 }
    );
  }
}
