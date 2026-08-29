const MP_API = 'https://api.mercadopago.com';

function isActive(status) {
  return ['authorized', 'active'].includes(String(status || '').toLowerCase());
}

function amountMatches(value) {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n - 9.9) < 0.011;
}

function sameEmail(value, email) {
  return String(value || '').trim().toLowerCase() === email;
}

function isEntrega365(item, email) {
  const reference = String(item?.external_reference || '').trim().toLowerCase();
  const reason = String(item?.reason || '').trim().toLowerCase();
  const payer = item?.payer_email || item?.payer?.email || '';
  const amount = item?.auto_recurring?.transaction_amount;
  const referenceMatches = reference === 'entrega365:' + email;
  const reasonMatches = /entrega\s*365/.test(reason);
  const amountOk = amountMatches(amount);
  const payerMatches = !payer || sameEmail(payer, email);

  // Assinaturas antigas podem não ter external_reference. Nelas, o vínculo
  // é confirmado pelo e-mail do pagador, valor mensal e identificação Entrega365.
  return payerMatches && amountOk && (referenceMatches || reasonMatches || !reference);
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
    let match = null;

    if (subscriptionId) {
      const response = await fetch(MP_API + '/preapproval/' + encodeURIComponent(subscriptionId), {
        headers: { Authorization: 'Bearer ' + token }
      });
      const result = await response.json();
      if (response.ok && isEntrega365(result, email)) {
        data = result;
        match = 'subscription_id';
      } else if (!response.ok && response.status !== 404) {
        return res.status(response.status).json({ error: 'subscription_lookup_failed' });
      }
    }

    if (!data) {
      const searchUrl = MP_API + '/preapproval/search?payer_email=' + encodeURIComponent(email);
      const response = await fetch(searchUrl, {
        headers: { Authorization: 'Bearer ' + token }
      });
      const result = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: 'subscription_search_failed' });

      const candidates = Array.isArray(result.results) ? result.results : [];
      const matches = candidates.filter(item => isEntrega365(item, email));
      // Uma assinatura ativa/autorizada tem prioridade sobre outra pendente.
      data = matches.find(item => isActive(item.status)) || matches[0] || null;
      if (data) match = 'payer_email';
    }

    if (!data) {
      return res.status(200).json({
        active: false,
        status: 'not_found',
        subscription_id: null,
        payer_email_matches: false,
        next_payment_date: null,
        match: null
      });
    }

    const payer = data?.payer_email || data?.payer?.email || '';
    const reference = String(data.external_reference || '').trim().toLowerCase();
    const reason = String(data.reason || '').trim().toLowerCase();
    const amount = data?.auto_recurring?.transaction_amount;

    const payerMatches = !payer || sameEmail(payer, email);
    const referenceMatches = reference === 'entrega365:' + email;
    const reasonMatches = /entrega\s*365/.test(reason);
    const amountOk = amountMatches(amount);
    const ownershipMatches = payerMatches && amountOk && (referenceMatches || reasonMatches || !reference);
    const active = ownershipMatches && isActive(data.status);

    return res.status(200).json({
      active,
      status: data.status || 'unknown',
      subscription_id: data.id || subscriptionId || null,
      payer_email_matches: Boolean(payerMatches),
      next_payment_date: data.next_payment_date || null,
      match
    });
  } catch (error) {
    console.error('pro-status error', error);
    return res.status(500).json({ error: 'internal_error' });
  }
};
