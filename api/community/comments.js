import { getDb } from '../db.js';
import { ensureSchema } from '../ensure-schema.js';
import { requireFirebaseUser, unauthorized } from '../auth.js';
import { moderateCommunityContent } from './moderation.js';

function cleanText(value, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function purgeExpired(sql) {
  await sql`DELETE FROM community_posts WHERE created_at < NOW() - INTERVAL '7 days'`;
}

export default async function handler(req, res) {
  try {
    const user = await requireFirebaseUser(req);
    if (!user) return unauthorized(res);

    const sql = getDb();
    await ensureSchema(sql);
    await purgeExpired(sql);
    const postId = Number(req.query?.postId || req.body?.postId);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ ok: false, error: 'Publicação inválida.' });
    }

    if (req.method === 'GET') {
      const comments = await sql`
        SELECT id, post_id, author_uid, author_name, text, created_at
        FROM community_comments
        WHERE post_id = ${postId}
          AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY created_at ASC
        LIMIT 200
      `;
      return res.status(200).json({ ok: true, comments, retentionDays: 7 });
    }

    if (req.method === 'POST') {
      const text = cleanText(req.body?.text);
      if (!text) {
        return res.status(400).json({ ok: false, error: 'O comentário não pode ficar vazio.' });
      }

      const moderation = moderateCommunityContent({ text });
      if (!moderation.allowed) {
        return res.status(422).json({ ok: false, code: 'COMMUNITY_CONTENT_BLOCKED', category: moderation.category, error: moderation.error });
      }

      const [post] = await sql`
        SELECT id FROM community_posts
        WHERE id = ${postId} AND created_at >= NOW() - INTERVAL '7 days'
        LIMIT 1
      `;
      if (!post) {
        return res.status(404).json({ ok: false, error: 'Publicação não encontrada ou já expirou.' });
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

      return res.status(201).json({ ok: true, comment, retentionDays: 7 });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  } catch (error) {
    console.error('Community comments API:', error);
    return res.status(500).json({ ok: false, error: 'Erro interno da API.' });
  }
}
