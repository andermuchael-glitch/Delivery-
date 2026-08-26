const crypto = require('crypto');

function signatureMatches(signature, requestId, dataId, secret) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const parts = Object.fromEntries(String(signature).split(',').map(x => x.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(parts.v1)); } catch { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const dataId = String(req.query['data.id'] || req.query.id || req.body?.data?.id || '');
    if (!signatureMatches(signature, requestId, dataId, secret)) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
  }

  const payload = req.body || {};
  console.log('Mercado Pago webhook received', {
    type: payload.type || null,
    action: payload.action || null,
    data_id: payload.data?.id || req.query['data.id'] || null,
    live_mode: payload.live_mode ?? null
  });

  return res.status(200).json({ received: true });
};
