import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Fires a GoHighLevel inbound webhook so Toya gets an email the moment a
// video is approved. This is best-effort: notification failures are logged
// but never block the save itself.
async function notifyApproved({ title, script, videoUrl, gender }) {
  if (!process.env.GHL_APPROVAL_WEBHOOK_URL) {
    console.warn('GHL_APPROVAL_WEBHOOK_URL not set -- skipping approval notification.');
    return;
  }
  try {
    await fetch(process.env.GHL_APPROVAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        script,
        video_url: videoUrl || '',
        gender: gender || '',
        recipient_email: 'Toya@ttdoesitall.com',
      }),
    });
  } catch (err) {
    console.error('Approval notification webhook failed:', err);
  }
}

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
      await notifyApproved({ title, script, videoUrl, gender });
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

    await notifyApproved({ title, script, videoUrl, gender });

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
