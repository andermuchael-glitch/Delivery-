const MP_API = 'https://api.mercadopago.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'payment_not_configured', message: 'Mercado Pago ainda não foi configurado no servidor.' });

  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'valid_email_required', message: 'Use um usuário de login que seja um e-mail válido.' });
    }

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const notificationUrl = `${origin}/api/mp-webhook?source_news=webhooks`;

    const response = await fetch(`${MP_API}/preapproval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Entrega365 PRO',
        external_reference: `entrega365:${email.toLowerCase()}`,
        payer_email: email.toLowerCase(),
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

    const data = await response.json();
    if (!response.ok) {
      console.error('Mercado Pago checkout error', response.status, data);
      return res.status(response.status).json({ error: 'mercadopago_error', message: data.message || 'Não foi possível iniciar a assinatura.' });
    }

    return res.status(200).json({
      subscription_id: data.id,
      init_point: data.init_point || data.sandbox_init_point,
      status: data.status || 'pending'
    });
  } catch (error) {
    console.error('pro-checkout error', error);
    return res.status(500).json({ error: 'internal_error', message: 'Não foi possível iniciar a assinatura.' });
  }
};
