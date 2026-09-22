/**
 * WHATSAPP WEBHOOK VERIFICATION — requires WHATSAPP_APP_SECRET in Render
 */
const crypto = require('crypto');
function verifyWhatsappSignature(req, res, next) {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
  if (!appSecret) {
    console.warn('XTOBE: WHATSAPP_APP_SECRET missing — verification disabled until set in Render');
    return next();
  }
  const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
  if (!signature) return res.status(401).send('Missing X-Hub-Signature-256');
  const raw = req.rawBody || JSON.stringify(req.body);
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(403).send('Invalid signature');
    }
  } catch {
    return res.status(403).send('Invalid signature');
  }
  next();
}
module.exports = { verifyWhatsappSignature };
