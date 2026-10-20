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
  const eventType = String(payload.type || req.query.topic || req.query.type || '').toLowerCase();
  const isPreapproval = ['subscription_preapproval','preapproval'].includes(eventType) || String(payload.action || '').toLowerCase().includes('preapproval');
  let trackingUpdated = false;
  if (isPreapproval && dataId && process.env.MERCADOPAGO_ACCESS_TOKEN) {
    try {
      const response = await fetch('https://api.mercadopago.com/preapproval/' + encodeURIComponent(dataId), {
        headers: { Authorization: 'Bearer ' + process.env.MERCADOPAGO_ACCESS_TOKEN }
      });
      const subscription = await response.json().catch(() => ({}));
      if (response.ok && subscription.id && subscription.external_reference) {
        const { getDb } = await import('../lib/db.js');
        const { ensureTenantSchema } = await import('../lib/tracking-tenant-common.js');
        const sql = getDb();
        await ensureTenantSchema(sql);
        const status = subscription.status === 'authorized'
          ? 'authorized'
          : (['paused','cancelled','cancelled_by_user','rejected'].includes(subscription.status) ? 'inactive' : 'pending');
        const updated = await sql`UPDATE e365_tracking_establishments SET subscription_status=${status},subscription_updated_at=NOW(),updated_at=NOW() WHERE id=${String(subscription.external_reference)} AND mp_preapproval_id=${String(subscription.id)} RETURNING id`;
        trackingUpdated = updated.length > 0;
      }
    } catch (error) {
      console.error('Entrega365 tracking subscription webhook:', error);
      return res.status(500).json({ received: false });
    }
  }

  console.log('Mercado Pago webhook received', {
    type: eventType || null,
    action: payload.action || null,
    data_id: payload.data?.id || req.query['data.id'] || null,
    live_mode: payload.live_mode ?? null,
    tracking_subscription_updated: trackingUpdated,
    source_news: req.query.source_news || null
  });

  return res.status(200).json({ received: true });
};
