'use strict';
/**
 * Xtobe-2 — Paddle Billing routes (extracted from index.js so the
 * 800-900 line guard on server/index.js stays satisfied).
 *
 * Mounts:
 *   POST /api/webhooks/paddle  — HMAC-verified webhook → issues licence keys
 *   POST /api/checkout         — public: creates a Paddle transaction → checkout URL
 *   GET  /api/licenses         — admin: the issued-licence ledger
 *
 * Called from index.js as: require('./paddleRoutes')(app, cfg, paddle);
 */

module.exports = function mountPaddleRoutes(app, cfg, paddle) {
  /* Paddle webhook — HMAC-verified (Paddle-Signature: ts=..;h1=..).
     Machine-to-machine so it's exempt from session auth; the global
     limiter still applies. Returns 503 until PADDLE_WEBHOOK_SECRET is set. */
  app.post('/api/webhooks/paddle', (req, res) => {
    if (!cfg.paddleWebhookSecret) {
      return res.status(503).json({ ok: false, error: 'not_configured' });
    }
    const check = paddle.verifySignature(cfg.paddleWebhookSecret, req.rawBody, req.headers['paddle-signature']);
    if (!check.ok) {
      console.warn('[paddle] rejected webhook:', check.reason);
      return res.status(401).json({ ok: false, error: 'bad_signature' });
    }
    const mapped = paddle.mapEvent(req.body || {}, cfg.paddlePrices);
    if (mapped.action === 'ignore') {
      return res.json({ ok: true, ignored: mapped.reason });
    }
    if (!cfg.licenseSecret) {
      return res.status(503).json({ ok: false, error: 'license_secret_missing' });
    }
    if (mapped.action === 'revoke') {
      const out = paddle.revokeLicense(cfg.licenseFile, mapped.transactionId, mapped.reason);
      return res.json({ ok: true, action: 'revoke', revoked: out.ok });
    }
    const key = paddle.deriveLicenseKey(cfg.licenseSecret, mapped);
    const { record, created } = paddle.saveLicense(cfg.licenseFile, {
      license_key: key,
      plan: mapped.plan,
      clinic_id: mapped.clinicId,
      email: mapped.email || null,
      transaction_id: mapped.transactionId,
      customer_id: mapped.customerId || null,
      status: 'active',
      source: 'paddle',
    });
    console.log(`[paddle] license ${created ? 'issued' : 'already issued'}: ${mapped.plan} → ${mapped.clinicId}`);
    res.json({ ok: true, action: 'issue', created, license_key: record.license_key, plan: record.plan });
  });

  /* Public checkout — the pricing page asks for a plan, we create the Paddle
     transaction server-side and hand back the hosted checkout URL. */
  app.post('/api/checkout', async (req, res) => {
    const body = req.body || {};
    const priceId = String(body.price_id || '').trim() ||
      Object.keys(cfg.paddlePrices).find((p) => cfg.paddlePrices[p] === String(body.plan || '').toLowerCase()) || '';
    if (!priceId || !cfg.paddlePrices[priceId]) {
      return res.status(400).json({ ok: false, error: 'unknown_price', available: Object.values(cfg.paddlePrices) });
    }
    try {
      const out = await paddle.createCheckout(cfg, { priceId, clinicId: body.clinic_id, email: body.email });
      res.json({ ok: true, checkout_url: out.checkoutUrl, transaction_id: out.transactionId });
    } catch (err) {
      const status = err.code === 'not_configured' ? 503 : 502;
      res.status(status).json({ ok: false, error: err.code || 'checkout_failed', detail: String(err.message).slice(0, 200) });
    }
  });

  /* Admin: the issued-licenses ledger */
  app.get('/api/licenses', (req, res) => {
    const rows = paddle.readLicenses(cfg.licenseFile);
    res.json({ ok: true, count: rows.length, licenses: rows });
  });
};
