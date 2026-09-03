export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'Entrega365 API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}
