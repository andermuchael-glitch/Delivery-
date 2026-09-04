import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
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
