import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  // A tiny valid 1x1 pixel PNG image base64
  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const contentParts = [
    { inlineData: { mimeType: 'image/png', data: dummyBase64 } },
    { text: 'Describe what you see in this image. Answer in JSON: {"description": "..."}' }
  ];

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: contentParts }],
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log('Success:', res.text);
  } catch (error) {
    console.error('Error occurred:', error);
  }
}
test();
