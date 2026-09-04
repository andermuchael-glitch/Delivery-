import { getDb } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'Neon database variable not configured' });
  }

  try {
    const sql = getDb();
    const result = await sql`SELECT 1 AS connected`;
    return res.status(200).json({
      ok: true,
      database: 'postgresql',
      connected: result?.[0]?.connected === 1,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Neon database health check failed:', error);
    return res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
}
