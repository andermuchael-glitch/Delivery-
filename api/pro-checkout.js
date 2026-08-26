const MP_API = 'https://api.mercadopago.com';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'payment_not_configured', message: 'Mercado Pago ainda não foi configurado no servidor.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(req.method === 'GET' ? (req.query?.email || '') : (body.email || '')).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'valid_email_required', message: 'Use um usuário de login que seja um e-mail válido.' });
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${forwardedProto}://${host}`;
    const notificationUrl = `${origin}/api/mp-webhook`;

    const response = await fetch(`${MP_API}/preapproval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        reason: 'Entrega365 PRO',
        external_reference: `entrega365:${email}`,
        payer_email: email,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 9.90,
          currency_id: 'BRL'
        },
        back_url: `${origin}/?pro=return`,
        notification_url: notificationUrl
      })
    });

    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = null; }

    if (!response.ok) {
      console.error('Mercado Pago checkout error', response.status, raw.slice(0, 1000));
      const message = data?.message || data?.error || `Mercado Pago respondeu HTTP ${response.status}.`;
      return res.status(502).json({ error: 'mercadopago_error', message });
    }

    if (!data || typeof data !== 'object') {
      console.error('Mercado Pago returned non-JSON response', raw.slice(0, 1000));
      return res.status(502).json({ error: 'mercadopago_invalid_response', message: 'O Mercado Pago não retornou uma resposta válida.' });
    }

    const initPoint = data.init_point || data.sandbox_init_point;
    if (!initPoint) {
      console.error('Mercado Pago response without init_point', data);
      return res.status(502).json({ error: 'missing_init_point', message: 'O Mercado Pago criou a solicitação, mas não retornou o link de pagamento.' });
    }

    return res.status(200).json({
      subscription_id: data.id || '',
      init_point: initPoint,
      status: data.status || 'pending'
    });
  } catch (error) {
    console.error('pro-checkout error', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Não foi possível iniciar a assinatura.' });
  }
};
