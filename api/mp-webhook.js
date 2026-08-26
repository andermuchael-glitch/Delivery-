const crypto = require('crypto');

function signatureMatches(signature, requestId, dataId, secret) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const parts = Object.fromEntries(String(signature).split(',').map(x => x.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(parts.v1)); } catch { return false; }
}

function configuredSecret() {
  const value = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();
  // Never treat an example URL/value as a real Mercado Pago secret.
  if (!value || /^https?:\/\//i.test(value) || value === 'change-me') return '';
  return value;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const secret = configuredSecret();
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = String(req.query['data.id'] || req.query.id || req.body?.data?.id || '');

  // When a real secret is configured, validate the Mercado Pago signature.
  // If the dashboard does not expose a secret for this subscription integration,
  // the endpoint still acknowledges notifications so the subscription flow is not broken.
  if (secret && !signatureMatches(signature, requestId, dataId, secret)) {
    return res.status(401).json({ error: 'invalid_signature' });
  }

  const payload = req.body || {};
  console.log('Mercado Pago webhook received', {
    type: payload.type || null,
    action: payload.action || null,
    data_id: payload.data?.id || req.query['data.id'] || null,
    live_mode: payload.live_mode ?? null,
    source_news: req.query.source_news || null
  });

  return res.status(200).json({ received: true });
};
