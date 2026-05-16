require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

const SYSTEM_INSTRUCTION = `You are NeuraHeal, an empathetic assistant.`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function tryModel(modelId, contents, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      if (response && response.text) return response.text;
      throw new Error('Empty response');
    } catch (err) {
      const msg = err.message || '';
      const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE');
      if (attempt < retries && isRetryable) {
        await sleep((attempt + 1) * 1500);
        continue;
      }
      throw err;
    }
  }
}

module.exports = async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required.' });
    }

    const contents = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));

    for (const modelId of MODELS) {
      try {
        const replyText = await tryModel(modelId, contents);
        return res.status(200).json({ reply: replyText, model: modelId });
      } catch (err) {
        continue;
      }
    }

    return res.status(200).json({ reply: 'fallback response', model: 'fallback-offline' });
  } catch (err) {
    console.error('chat error', err.message || err);
    res.status(500).json({ error: 'Unexpected error' });
  }
};
