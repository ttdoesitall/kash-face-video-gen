import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
    try {
          const { avatarPrompt, aspectRatio } = await request.json();

          if (!avatarPrompt || avatarPrompt.trim().length === 0) {
                  return Response.json(
                            { error: 'Avatar prompt is required' },
                            { status: 400 }
                          );
                }

          const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash-image',
                  contents: avatarPrompt,
                  config: {
                            responseModalities: ['TEXT', 'IMAGE'],
                            imageConfig: {
                                        aspectRatio: aspectRatio || '16:9',
                                      },
                          },
                });

          const parts = response.candidates?.[0]?.content?.parts || [];
          let imageBase64 = null;
          let mimeType = 'image/png';

          for (const part of parts) {
                  if (part.inlineData) {
                            imageBase64 = part.inlineData.data;
                            mimeType = part.inlineData.mimeType || 'image/png';
                            break;
                          }
                }

          if (!imageBase64) {
                  return Response.json(
                            { error: 'Gemini did not return an image. Try adjusting the avatar prompt.' },
                            { status: 502 }
                          );
                }

          return Response.json({ success: true, imageBase64, mimeType });
        } catch (error) {
          console.error('Image generation error:', error);
          return Response.json(
                  { error: error.message || 'Image generation failed' },
                  { status: 500 }
                );
        }
  }
