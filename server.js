/**
 * NEURO-HEAL — Express + Gemini Backend
 * Uses @google/genai SDK.
 * Auto-retries with exponential backoff and falls through model lineup on quota/availability errors.
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { GoogleGenAI } = require('@google/genai');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─────────────────────────────────────────────
//  Gemini Setup
// ─────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('\n⚠️   GEMINI_API_KEY is not set in .env!');
    console.warn('    Get a free key: https://aistudio.google.com/app/apikey\n');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Model priority list — tries each in order until one succeeds
const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
];

// System instruction — Neura's mental-health persona
const SYSTEM_INSTRUCTION = `
You are **NeuraHeal**, a compassionate AI mental health companion integrated into the Neuro-Heal platform.

Your role is to support users with empathy, understanding, and evidence-based guidance while maintaining a calm and professional tone.

---

### Core Responsibilities
• Respond empathetically to emotions such as anxiety, sadness, stress, loneliness, anger, or happiness.
• Provide emotional support using warm, non-judgmental, and respectful language.
• Offer practical, evidence-based coping strategies, including:
  - Breathing exercises
  - Mindfulness techniques
  - Grounding methods
  - Journaling prompts
  - CBT-inspired approaches
• Help users manage stress and negative thoughts with simple, actionable steps.

---

### Clarification & Understanding (VERY IMPORTANT)
• If a user’s message is **unclear, vague, or lacks context**, DO NOT assume.
• Politely ask **1–2 clarifying questions** before giving advice.
• Examples:
  - "Can you tell me a bit more about what’s making you feel this way?"
  - "When you say you're stressed, is it related to work, studies, or something else?"
• Once clarified, provide a **relevant and personalized response**.
• If partially clear, give a **gentle general response + ask a follow-up question**.

---

### Communication Style
• Keep responses concise (2–4 short paragraphs).
• Use clean formatting (spacing, bullet points when helpful).
• Maintain a calm, supportive, and human-like tone.
• Avoid overly clinical or technical language.
• Ask thoughtful follow-up questions when appropriate.

---

### Safety & Boundaries
• Do NOT diagnose medical or psychological conditions.
• Do NOT prescribe medications or treatments.
• If users express severe distress (e.g., self-harm or suicidal thoughts):
  - Respond with empathy and urgency
  - Encourage reaching out to a licensed professional or helpline
• When appropriate, gently remind:
  "I’m an AI companion, not a licensed therapist, but I’m here to support you."

---

### Goal
Help users feel heard, understood, and supported while guiding them toward healthier emotional well-being.
`;
// ─────────────────────────────────────────────
//  Helper: sleep
// ─────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────
//  Helper: call one model with 2 retries (backoff)
// ─────────────────────────────────────────────
async function tryModel(modelId, contents, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                    temperature: 0.8,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            });
            const text = response.text;
            if (text) return text;
            throw new Error('Empty response');
        } catch (err) {
            const msg = err.message || '';
            const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded');
            const isQuota = msg.includes('429') || msg.includes('quota');

            if (attempt < retries && isRetryable) {
                const delay = (attempt + 1) * 1500; // 1.5s, 3s
                console.log(`  ↻ Model ${modelId} busy, retrying in ${delay}ms…`);
                await sleep(delay);
                continue;
            }

            // Non-retryable or exhausted — bubble up the error type
            const e = new Error(msg);
            e.isQuota = isQuota;
            e.isUnavailable = isRetryable;
            throw e;
        }
    }
}

// ─────────────────────────────────────────────
//  POST /api/chat — Main Chat Endpoint
// ─────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required.' });
        }

        // Convert to Gemini format
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        let lastError = null;
        let usedModel = null;

        // Record timeouts for models that hit API quota
        if (!global.modelTimeouts) global.modelTimeouts = {};

        // Try each model in the priority list
        for (const modelId of MODELS) {
            // Check if model is currently on quote timeout
            if (global.modelTimeouts[modelId] && Date.now() < global.modelTimeouts[modelId]) {
                const remaining = Math.ceil((global.modelTimeouts[modelId] - Date.now()) / 1000);
                console.log(`  ⏭️  Skipping ${modelId}: on timeout for ${remaining}s due to previous quota limit`);
                continue;
            }

            try {
                console.log(`→ Trying model: ${modelId}`);
                const replyText = await tryModel(modelId, contents);
                usedModel = modelId;
                console.log(`✅ Response from ${modelId} (${replyText.length} chars)`);
                return res.json({ reply: replyText, model: modelId });
            } catch (err) {
                lastError = err;
                if (err.isQuota) {
                    // Set a timeout of 5 minutes (300,000 ms) for this model
                    const TIMEOUT_MINUTES = 5;
                    global.modelTimeouts[modelId] = Date.now() + (TIMEOUT_MINUTES * 60 * 1000);
                    console.log(`  ✗ ${modelId}: quota exceeded. Setting ${TIMEOUT_MINUTES} min timeout. Trying next…`);
                    continue;
                }
                if (err.isUnavailable) {
                    console.log(`  ✗ ${modelId}: unavailable after retries, trying next…`);
                    continue;
                }
                // Other errors (auth, not found) — try next but log
                console.log(`  ✗ ${modelId}: ${(err.message || '').slice(0, 80)}`);
            }
        }

        // All models failed
        console.error('All Gemini models failed. Last error:', lastError?.message);
        return res.status(200).json({
            reply: "I am currently experiencing unusually high volume and taking a moment to catch my breath. While I reconnect, please try taking a few deep breaths yourself—inhale for 4 seconds, hold for 7, and exhale for 8. I will be fully available again shortly.",
            model: "fallback-offline"
        });

    } catch (err) {
        console.error('Unexpected server error:', err.message || err);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});

// ─────────────────────────────────────────────
//  GET /api/health — Status check
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        models: MODELS,
        keySet: !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE')
    });
});

// ─────────────────────────────────────────────
//  Fallback — serve index.html
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ─────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log('\n✅  Neuro-Heal server is running!');
    console.log(`🤖  Models (in priority): ${MODELS.join(' → ')}`);
    console.log(`🌐  Website: http://localhost:${PORT}`);
    console.log(`💬  Chat API: POST http://localhost:${PORT}/api/chat`);
    console.log(`❤️   Health:  GET  http://localhost:${PORT}/api/health`);
    console.log('\nPress Ctrl+C to stop.\n');
});
