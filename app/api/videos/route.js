import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

export async function GET() {
    try {
          const { data, error } = await supabase
            .from('videos')
            .select('id, title, gender, status, created_at, video_url')
            .order('created_at', { ascending: false });

      if (error) {
              return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ videos: data });
    } catch (error) {
          return Response.json(
            { error: error.message || 'Failed to load history' },
            { status: 500 }
                );
    }
}
