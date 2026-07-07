import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

const MOVEMENT_SYSTEM_PROMPT = `Analyze avatar image and generate camera movement prompt for I2V tools. Avatar maintains direct eye contact, commanding not friendly. Head movements suggest thinking/emphasis. Hand gestures purposeful, not nervous. Camera: gentle, cinematic — maybe subtle dolly-in as message builds. Energy: "delivering education to people paying attention" not entertaining. Output: one complete prompt, cinematic tone, immediately usable.`;

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
