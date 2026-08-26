const MP_API = 'https://api.mercadopago.com';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'payment_not_configured' });

  const email = String(req.query.email || '').trim().toLowerCase();
  const subscriptionId = String(req.query.subscription_id || '').trim();
  if (!email || !subscriptionId) return res.status(400).json({ error: 'email_and_subscription_required' });

  try {
    const response = await fetch(`${MP_API}/preapproval/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'subscription_lookup_failed' });

    const reference = String(data.external_reference || '').toLowerCase();
    const ownerMatches = reference === `entrega365:${email}`;
    const active = ownerMatches && ['authorized', 'active'].includes(String(data.status || '').toLowerCase());

    return res.status(200).json({
      active,
      status: data.status || 'unknown',
      subscription_id: data.id || subscriptionId,
      payer_email_matches: Boolean(ownerMatches),
      next_payment_date: data.next_payment_date || null
    });
  } catch (error) {
    console.error('pro-status error', error);
    return res.status(500).json({ error: 'internal_error' });
  }
};
