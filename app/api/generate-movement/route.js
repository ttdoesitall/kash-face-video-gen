import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
});

const MOVEMENT_SYSTEM_PROMPT = `Analyze the avatar image and generate one complete, cinematic camera-and-performance prompt for an image-to-video AI tool (Higgsfield). Avatar maintains direct eye contact, commanding not friendly. Head movements suggest thinking/emphasis. Hand gestures purposeful, not nervous — one believable gesture, not many. Camera: gentle, cinematic, single continuous shot — maybe a subtle dolly-in or slow push-in as the message builds, no random zooms, no cuts. Energy: "delivering education to people paying attention," not entertaining.

Fold in hyper-realism details so the result does not look like generic AI video:
- visible skin texture, natural pores, honest small imperfections, no waxy or over-smoothed skin
- natural micro-pauses and a brief look-away during a thinking beat, then return to lens
- subtle breathing and natural body weight shifts, relaxed shoulders
- believable reflections on any glass, metal, or screens in frame; shadow direction should match the light source
- lived-in environmental depth, real objects instead of an empty void
- natural blink rate and believable lip-sync pacing

End the prompt with a short negative-prompt clause covering: no captions, no background music, no waxy skin, no frozen shoulders, no robotic gestures, no rubber limbs, no random zooms, no abrupt cuts.

Output: one complete prompt, cinematic tone, immediately usable, structured as flowing prose, not a list.`;

export async function POST(request) {
      try {
              const { imageBase64, mimeType, script } = await request.json();

        if (!imageBase64) {
                  return Response.json(
                      { error: 'Avatar image is required' },
                      { status: 400 }
                            );
        }

        const response = await anthropic.messages.create({
                  model: 'claude-sonnet-5',
                  max_tokens: 500,
                  system: MOVEMENT_SYSTEM_PROMPT,
                  messages: [
                      {
                                    role: 'user',
                                    content: [
                                        {
                                                          type: 'image',
                                                          source: {
                                                                              type: 'base64',
                                                                              media_type: mimeType || 'image/png',
                                                                              data: imageBase64,
                                                          },
                                        },
                                        {
                                                          type: 'text',
                                                          text: `Generate the camera movement prompt for this avatar image.${
                                                                              script ? `\n\nVideo script for context:\n${script}` : ''
                                                          }\n\nOutput only the single complete prompt, nothing else.`,
                                        },
                                                  ],
                      },
                            ],
        });

        const movementPrompt =
                  response.content[0].type === 'text' ? response.content[0].text.trim() : '';

        return Response.json({ success: true, movementPrompt });
      } catch (error) {
              console.error('Movement prompt generation error:', error);
              return Response.json(
                  { error: error.message || 'Movement prompt generation failed' },
                  { status: 500 }
                      );
      }
}
