#!/usr/bin/env node
'use strict';
/**
 * Send your FIRST WhatsApp message (an approved template) to a verified test number.
 *
 * Usage:
 *   node scripts/send-first-whatsapp.js [to] [template]
 *   Defaults: to = TEST_WHATSAPP_TO from .env, template = hello_world
 *
 * Meta rules (enforced by Meta, not us):
 *   - First contact MUST be an approved template (hello_world exists by default on test apps).
 *   - The recipient number must be added/verified in your Meta app
 *     (developers.facebook.com → your app → WhatsApp → API Setup → To).
 *   - Free-text only works within 24h after the user replies.
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
require(path.join(ROOT, 'server', 'env')).loadEnv(ROOT);
const wa = require(path.join(ROOT, 'server', 'whatsapp'));

const cfg = {
  whatsappToken: (process.env.WHATSAPP_TOKEN || '').trim(),
  whatsappPhoneId: (process.env.WHATSAPP_PHONE_ID || '').trim(),
};
const to = (process.argv[2] || process.env.TEST_WHATSAPP_TO || '').replace(/\D/g, '');
const template = process.argv[3] || 'hello_world';

if (!to) {
  console.error('No recipient. Set TEST_WHATSAPP_TO in .env or pass it: node scripts/send-first-whatsapp.js 9715XXXXXXX');
  process.exit(2);
}

(async () => {
  console.log(`Sending template "${template}" to +${to} via phone_id ${cfg.whatsappPhoneId || '(unset)'}...`);
  try {
    const out = await wa.sendWhatsAppTemplate(cfg, to, template);
    console.log('SENT ✔');
    console.log('provider message id:', out.providerId);
    console.log('Meta response:', JSON.stringify(out.raw));
  } catch (err) {
    if (err.code === 'not_configured') {
      console.error('NOT CONFIGURED — set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env first.');
      process.exit(3);
    }
    console.error('SEND FAILED:', err.message);
    process.exit(1);
  }
})();
