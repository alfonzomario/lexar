import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'AIzaSy' });
async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'return json {"hello":"world"}' }] }],
      config: { responseMimeType: 'application/json' }
    });
    console.log("RESPONSE TEXT TYPE:", typeof response.text);
    console.log("RESPONSE TEXT:", response.text);
  } catch (e) {
    console.log("ERROR MESSAGE:", e.message);
  }
}
run();
