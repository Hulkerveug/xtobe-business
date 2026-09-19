'use strict';
/**
 * Xtobe-2 — WhatsApp Cloud API client + webhook parsing.
 * Adapted from xtobe-1 (whatsapp-part1.js / whatsapp-part2.js).
 * Official Meta gateway only. No scraping, no number spoofing.
 */
const https = require('https');

const WA_API_HOST = 'graph.facebook.com';
const WA_API_VER = 'v21.0';

function graphPost(host, apiPath, token, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      host, port: 443, method: 'POST', path: apiPath,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      timeout: 15000,
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); }
        } else {
          reject(new Error(`graph ${res.statusCode}: ${raw.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('graph timeout')));
    req.write(body);
    req.end();
  });
}

/** Send a WhatsApp text. Returns {ok, providerId} or throws. */
async function sendWhatsApp(cfg, to, text) {
  if (!cfg.whatsappToken || !cfg.whatsappPhoneId) {
    const err = new Error('WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not configured');
    err.code = 'not_configured';
    throw err;
  }
  const res = await graphPost(
    WA_API_HOST,
    `/${WA_API_VER}/${cfg.whatsappPhoneId}/messages`,
    cfg.whatsappToken,
    {
      messaging_product: 'whatsapp',
      to: String(to).replace(/\D/g, ''),
      type: 'text',
      text: { preview_url: false, body: String(text).slice(0, 4096) },
    }
  );
  const providerId = res && res.messages && res.messages[0] ? res.messages[0].id : null;
  return { ok: true, providerId, raw: res };
}

/** Parse Meta webhook entries → [{from, text, name, channel, phoneId}] */
function parseWebhook(payload) {
  const out = [];
  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const v = change.value || {};
        const field = change.field || '';
        /* WhatsApp messages */
        if (v.messages && v.messages.length) {
          for (const m of v.messages) {
            if (m.type !== 'text') continue;
            out.push({
              channel: 'whatsapp',
              from: m.from,
              text: String((m.text && m.text.body) || ''),
              name: (v.contacts && v.contacts[0] && v.contacts[0].profile &&
                     v.contacts[0].profile.name) || null,
              phoneId: (v.metadata && v.metadata.phone_number_id) || null,
              providerId: m.id || null,
              field,
            });
          }
        }
        /* Instagram / Messenger messages */
        if (v.messaging && v.messaging.length) {
          for (const m of v.messaging) {
            const text = (m.message && m.message.text) || '';
            if (!text) continue;
            const isIg = entry.id && String(change.field || '').includes('instagram');
            out.push({
              channel: isIg ? 'instagram' : 'facebook',
              from: m.sender && m.sender.id ? m.sender.id : 'unknown',
              text: String(text),
              name: null,
              phoneId: null,
              providerId: (m.message && m.message.mid) || null,
              field,
            });
          }
        }
      }
    }
  } catch { /* malformed payloads are ignored, never crash the webhook */ }
  return out;
}

function maskPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '');
  if (d.length < 5) return 'hidden';
  const cc = d.slice(0, d.length - 9) || '';
  const last4 = d.slice(-4);
  const mid = d.slice(cc.length, d.length - 4).replace(/\d/g, 'X');
  return `+${cc} ${mid} ${last4}`.replace(/\s+/g, ' ').trim();
}

module.exports = { sendWhatsApp, parseWebhook, maskPhone, graphPost, WA_API_VER };
