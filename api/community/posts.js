import { getDb } from '../db.js';
import { requireFirebaseUser, unauthorized } from '../auth.js';

function sendMethodNotAllowed(res) {
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}

function cleanText(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanUrl(value) {
  const url = cleanText(value, 2000);
  if (!url) return '';
  try {
    const parsed = new URL(url);
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
      const limit = Math.min(Math.max(Number(req.query?.limit) || 30, 1), 100);
      const rows = await sql`
        SELECT id, author_uid, author_name, author_email, text, type, url, created_at
        FROM community_posts
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      return res.status(200).json({ ok: true, posts: rows });
    }

    if (req.method === 'POST') {
      const text = cleanText(req.body?.text);
      const url = cleanUrl(req.body?.url);
      const type = ['text', 'youtube', 'instagram'].includes(req.body?.type)
        ? req.body.type
        : 'text';

      if (!text && !url) {
        return res.status(400).json({ ok: false, error: 'A publicação precisa ter texto ou link.' });
      }

      const [post] = await sql`
        INSERT INTO community_posts
          (author_uid, author_name, author_email, text, type, url)
        VALUES
          (${user.uid}, ${cleanText(user.displayName || user.email || 'Entregador', 160)},
           ${cleanText(user.email, 320)}, ${text}, ${type}, ${url})
        RETURNING id, author_uid, author_name, author_email, text, type, url, created_at
      `;

      return res.status(201).json({ ok: true, post });
    }

    return sendMethodNotAllowed(res);
  } catch (error) {
    console.error('Community posts API:', error);
    return res.status(500).json({ ok: false, error: 'Erro interno da API.' });
  }
}
