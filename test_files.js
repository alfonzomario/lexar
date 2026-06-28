import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'dummy' });
async function run() {
  try {
    const uploadedFile = await ai.files.upload({
      file: new Blob(['test'], { type: 'text/plain' }),
      config: { mimeType: 'text/plain' }
    });
    console.log(uploadedFile);
  } catch (e) {
    console.log("ERROR MESSAGE:", e.message);
  }
}
run();
