import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Extract title and year from: The case of John v Doe in 1999',
    config: {
      responseMimeType: 'application/json'
    }
  });
  console.log(res.text);
}
test().catch(console.error);
