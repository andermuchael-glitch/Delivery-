const MP_API = 'https://api.mercadopago.com';

function isActive(status) {
  return ['authorized', 'active'].includes(String(status || '').toLowerCase());
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'payment_not_configured' });

  const email = String(req.query.email || '').trim().toLowerCase();
  const subscriptionId = String(req.query.subscription_id || '').trim();
  if (!email) return res.status(400).json({ error: 'email_required' });

  try {
    let data = null;

    if (subscriptionId) {
      const response = await fetch(`${MP_API}/preapproval/${encodeURIComponent(subscriptionId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) data = result;
      else if (response.status !== 404) return res.status(response.status).json({ error: 'subscription_lookup_failed' });
    }

    if (!data) {
      const searchUrl = `${MP_API}/preapproval/search?payer_email=${encodeURIComponent(email)}`;
      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: 'subscription_search_failed' });

      const candidates = Array.isArray(result.results) ? result.results : [];
      data = candidates.find(item => {
        const reference = String(item.external_reference || '').toLowerCase();
        const amount = Number(item.auto_recurring?.transaction_amount);
        return reference === `entrega365:${email}` && amount === 9.9;
      }) || null;
    }

    if (!data) {
      return res.status(200).json({
        active: false,
        status: 'not_found',
        subscription_id: null,
        payer_email_matches: false,
        next_payment_date: null
      });
    }

    const reference = String(data.external_reference || '').toLowerCase();
    const ownerMatches = reference === `entrega365:${email}`;
    const amountMatches = Number(data.auto_recurring?.transaction_amount) === 9.9;
    const active = ownerMatches && amountMatches && isActive(data.status);

    return res.status(200).json({
      active,
      status: data.status || 'unknown',
      subscription_id: data.id || subscriptionId || null,
      payer_email_matches: Boolean(ownerMatches),
      next_payment_date: data.next_payment_date || null
    });
  } catch (error) {
    console.error('pro-status error', error);
    return res.status(500).json({ error: 'internal_error' });
  }
};
