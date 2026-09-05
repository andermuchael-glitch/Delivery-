import { getDb } from '../db.js';
import { ensureSchema } from '../ensure-schema.js';
import { requireFirebaseUser, unauthorized } from '../auth.js';

export default async function handler(req, res) {
  try {
    const user = await requireFirebaseUser(req);
    if (!user) return unauthorized(res);

    if (!['POST', 'DELETE', 'GET'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).json({ ok: false, error: 'Método não permitido' });
    }

    const postId = Number(req.query?.postId || req.body?.postId);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ ok: false, error: 'Publicação inválida.' });
    }

    const sql = getDb();
    await ensureSchema(sql);
    const [post] = await sql`SELECT id FROM community_posts WHERE id = ${postId} LIMIT 1`;
    if (!post) return res.status(404).json({ ok: false, error: 'Publicação não encontrada.' });

    if (req.method === 'POST') {
      await sql`
        INSERT INTO community_likes (post_id, author_uid, user_uid)
        VALUES (${postId}, ${user.uid}, ${user.uid})
        ON CONFLICT (post_id, author_uid) DO NOTHING
      `;
    } else if (req.method === 'DELETE') {
      await sql`
        DELETE FROM community_likes
        WHERE post_id = ${postId}
          AND (author_uid = ${user.uid} OR user_uid = ${user.uid})
      `;
    }

    const [summary] = await sql`
      SELECT
        COUNT(*)::int AS like_count,
        COALESCE(BOOL_OR(author_uid = ${user.uid} OR user_uid = ${user.uid}), false) AS liked
      FROM community_likes
      WHERE post_id = ${postId}
    `;

    return res.status(200).json({
      ok: true,
      postId,
      likeCount: Number(summary?.like_count || 0),
      liked: Boolean(summary?.liked)
    });
  } catch (error) {
    console.error('Community likes API:', error);
    return res.status(500).json({ ok: false, error: 'Erro interno da API.' });
  }
}
