import { getDb } from './db.js';
import { requireFirebaseUser, unauthorized } from './auth.js';

const ADMIN_EMAIL = 'entrega365.suporte@gmail.com';

function cleanUrl(value) {
  if (typeof value !== 'string') return '';
  const raw = value.trim().slice(0, 2000);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  try {
    const user = await requireFirebaseUser(req);
    if (!user) return unauthorized(res);

    const sql = getDb();

    if (req.method === 'GET') {
      const [setting] = await sql`
        SELECT affiliate_url, updated_at
        FROM marketplace_settings
        WHERE id = 1
        LIMIT 1
      `;
      return res.status(200).json({
        ok: true,
        affiliateUrl: setting?.affiliate_url || '',
        updatedAt: setting?.updated_at || null
      });
    }

    if (req.method === 'PUT') {
      if ((user.email || '').toLowerCase() !== ADMIN_EMAIL) {
        return res.status(403).json({ ok: false, error: 'Apenas o administrador pode alterar a loja.' });
      }

      const affiliateUrl = cleanUrl(req.body?.affiliateUrl);
      if (!affiliateUrl) {
        return res.status(400).json({ ok: false, error: 'Informe uma URL válida para a loja.' });
      }

      const [setting] = await sql`
        INSERT INTO marketplace_settings (id, affiliate_url, updated_at, updated_by_uid)
        VALUES (1, ${affiliateUrl}, NOW(), ${user.uid})
        ON CONFLICT (id) DO UPDATE SET
          affiliate_url = EXCLUDED.affiliate_url,
          updated_at = NOW(),
          updated_by_uid = EXCLUDED.updated_by_uid
        RETURNING affiliate_url, updated_at
      `;

      return res.status(200).json({
        ok: true,
        affiliateUrl: setting.affiliate_url,
        updatedAt: setting.updated_at
      });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Marketplace API:', error);
    return res.status(500).json({ ok: false, error: 'Erro interno da API.' });
  }
}
