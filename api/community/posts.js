import { getDb } from '../db.js';
import { ensureSchema } from '../ensure-schema.js';
import { requireFirebaseUser, unauthorized } from '../auth.js';

function sendMethodNotAllowed(res) {
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}

function cleanText(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanUrl(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return '';
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(url)) {
    if (url.length > 2500000) return '';
    return url;
  }
  if (url.length > 2000) return '';
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
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const limit = Math.min(Math.max(Number(req.query?.limit) || 30, 1), 100);
      const rows = await sql`
        SELECT
          p.id, p.author_uid, p.author_name, p.author_email, p.text, p.type, p.url, p.created_at,
          (SELECT COUNT(*)::int FROM community_comments c WHERE c.post_id = p.id) AS comment_count,
          (SELECT COUNT(*)::int FROM community_likes l WHERE l.post_id = p.id) AS like_count,
          EXISTS(
            SELECT 1 FROM community_likes me
            WHERE me.post_id = p.id AND me.author_uid = ${user.uid}
          ) AS liked
        FROM community_posts p
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `;
      return res.status(200).json({ ok: true, posts: rows });
    }

    if (req.method === 'POST') {
      const text = cleanText(req.body?.text);
      const url = cleanUrl(req.body?.url);
      const type = ['text', 'youtube', 'instagram', 'image'].includes(req.body?.type)
        ? req.body.type
        : 'text';

      if (!text && !url) {
        return res.status(400).json({ ok: false, error: 'A publicação precisa ter texto, link ou imagem.' });
      }
      if (req.body?.url && !url) {
        return res.status(400).json({ ok: false, error: 'Imagem ou link inválido ou muito grande.' });
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
