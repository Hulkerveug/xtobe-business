'use strict';
/**
 * Xtobe-2 — AI content studio (beauty clinics, Dubai).
 * Server-side prompt templates. Works with any OpenAI-compatible endpoint.
 * Never called from the browser (keeps the API key server-side).
 */
const https = require('https');
const { URL } = require('url');

const BRAND = 'UAE beauty clinic (medspa / salon) in Dubai';

const TEMPLATES = {
  reel: (topic, lang) => `You are a senior social media copywriter for a ${BRAND}.
Write ONE Instagram Reel script (30-45 seconds) about: "${topic}".

Return strict JSON only, no markdown:
{
  "hook": "spoken hook, first 3 seconds, English",
  "shots": ["shot 1 description + on-screen text", "shot 2", "shot 3", "shot 4"],
  "voiceover": "full voiceover in clean English, 60-80 words",
  "caption_en": "Instagram caption in English, premium but friendly Dubai tone, max 180 chars",
  "caption_ar": "same caption in natural Gulf Arabic, max 180 chars",
  "hashtags": ["#dubai...", "... 12 total, mix English + Arabic, Dubai beauty audience"],
  "cta": "one-line call to action mentioning booking on WhatsApp"
}`,
  post: (topic, lang) => `You are a senior social media copywriter for a ${BRAND}.
Write ONE Instagram feed post about: "${topic}".

Return strict JSON only, no markdown:
{
  "headline": "short on-image headline, max 6 words",
  "caption_en": "English caption, 120-180 chars, sells the outcome not the feature",
  "caption_ar": "natural Gulf Arabic version",
  "hashtags": ["12 hashtags, English + Arabic, Dubai beauty market"],
  "best_time": "best posting time for Dubai audience, e.g. Tue 8:30pm GST"
}`,
  story: (topic) => `You are a social media copywriter for a ${BRAND}.
Write 3 Instagram Story frames about: "${topic}".
Return strict JSON only:
{ "frames": [ {"text":"max 8 words","sticker":"poll|question|countdown|link","note":"why"} ] }`,
  calendar: (topic) => `You are a content strategist for a ${BRAND}.
Create a 7-day Instagram content calendar themed around: "${topic}".
Return strict JSON only:
{ "days": [ {"day":"Mon","format":"reel|post|story","idea":"one line","best_time":"time GST"} ] }`,
};

const SYSTEM = `You write for beauty clinics in Dubai. Premium but friendly.
Sell outcomes (glowing skin, filled chairs, no missed bookings), never jargon.
Always output valid JSON only. Keep Arabic natural Gulf dialect, not formal MSA.`;

async function callAI(cfg, system, user) {
  if (!cfg.aiKey) {
    const err = new Error('AI_API_KEY not configured');
    err.code = 'not_configured';
    throw err;
  }
  const base = new URL(cfg.aiBaseUrl || 'https://api.openai.com/v1');
  const body = JSON.stringify({
    model: cfg.aiModel || 'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: base.hostname,
      port: base.port || 443,
      method: 'POST',
      path: `${base.pathname.replace(/\/$/, '')}/chat/completions`,
      headers: {
        authorization: `Bearer ${cfg.aiKey}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      timeout: 45000,
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`ai ${res.statusCode}: ${raw.slice(0, 300)}`));
        }
        try {
          const parsed = JSON.parse(raw);
          const text = parsed.choices[0].message.content;
          resolve({ json: JSON.parse(text), model: parsed.model, usage: parsed.usage });
        } catch (e) {
          reject(new Error(`ai parse: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('ai timeout')));
    req.write(body);
    req.end();
  });
}

/** Offline fallback so the UI is always demoable without a key. */
function fallback(kind, topic) {
  const t = topic || 'this month\'s signature treatment';
  return {
    offline: true,
    kind,
    hook: `Still paying Dubai prices for ${t}?`,
    shots: [
      `Frame 1: before/after split screen — on-screen text "Real clients. Real results."`,
      `Frame 2: close-up of treatment — text "Painless. 30 minutes."`,
      `Frame 3: happy client walking out — text "Back to work same day."`,
      `Frame 4: clinic logo + WhatsApp icon — text "Book in 1 message."`,
    ],
    voiceover:
      `In Dubai, your time is the real luxury. Our ${t} takes thirty minutes, feels painless, ` +
      `and you walk out camera-ready. No downtime, no guesswork. Message us on WhatsApp and ` +
      `we will hold a slot today.`,
    caption_en: `Glow without the downtime ✨ ${t} in 30 minutes. DM "GLOW" and we'll hold your slot today.`,
    caption_ar: `إشراقة بدون توقف ✨ جلسة ${t} خلال ٣٠ دقيقة. أرسلي كلمة "إشراقة" ونحجز لك اليوم.`,
    hashtags: [
      '#dubaisalon', '#dubaibeauty', '#medspadubai', '#dubaiclínics', '#glowupdubai',
      '#skincaredubai', '#dubailife', '#abudhabibeauty', '#sharjahsalon', '#عيادات_دبي',
      '#تجميل_دبي', '#عناية_بالبشرة',
    ],
    cta: 'Tap WhatsApp and say "GLOW" — we reply in minutes.',
  };
}

async function generate(cfg, kind, topic) {
  const tpl = TEMPLATES[kind] || TEMPLATES.reel;
  if (!cfg.aiKey) return fallback(kind, topic);
  try {
    const res = await callAI(cfg, SYSTEM, tpl(topic, 'en'));
    return Object.assign({ offline: false, kind }, res.json);
  } catch (err) {
    return Object.assign(fallback(kind, topic), { offline: true, error: err.message });
  }
}

module.exports = { generate, TEMPLATES, SYSTEM, fallback };
