import { getDb } from '../db.js';
import { requireFirebaseUser, unauthorized } from '../auth.js';

function cleanText(value, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  try {
    const user = await requireFirebaseUser(req);
    if (!user) return unauthorized(res);

    const sql = getDb();
    const postId = Number(req.query?.postId || req.body?.postId);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ ok: false, error: 'Publicação inválida.' });
    }

    if (req.method === 'GET') {
      const comments = await sql`
        SELECT id, post_id, author_uid, author_name, text, created_at
        FROM community_comments
        WHERE post_id = ${postId}
        ORDER BY created_at ASC
        LIMIT 200
      `;
      return res.status(200).json({ ok: true, comments });
    }

    if (req.method === 'POST') {
      const text = cleanText(req.body?.text);
      if (!text) {
        return res.status(400).json({ ok: false, error: 'O comentário não pode ficar vazio.' });
      }

      const [post] = await sql`SELECT id FROM community_posts WHERE id = ${postId} LIMIT 1`;
      if (!post) {
        return res.status(404).json({ ok: false, error: 'Publicação não encontrada.' });
      }

      const [comment] = await sql`
        INSERT INTO community_comments (post_id, author_uid, author_name, text)
        VALUES (
          ${postId}, ${user.uid},
          ${cleanText(user.displayName || user.email || 'Entregador', 160)},
          ${text}
        )
        RETURNING id, post_id, author_uid, author_name, text, created_at
      `;

      return res.status(201).json({ ok: true, comment });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Community comments API:', error);
    return res.status(500).json({ ok: false, error: 'Erro interno da API.' });
  }
}
