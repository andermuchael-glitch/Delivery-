let schemaPromise = null;

export async function ensureSchema(sql) {
  // Run the production migration once per warm serverless instance. The old
  // implementation executed the full DDL sequence on every like/comment/read,
  // which caused slow responses and concurrent primary-key migrations.
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS community_posts (
      id BIGSERIAL PRIMARY KEY,
      author_uid TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT 'Entregador',
      author_email TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      url TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_uid TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT 'Entregador'`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_email TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text'`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    await sql`CREATE TABLE IF NOT EXISTS community_comments (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      author_uid TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT 'Entregador',
      text TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS post_id BIGINT`;
    await sql`ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS author_uid TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT 'Entregador'`;
    await sql`ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS text TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    await sql`CREATE TABLE IF NOT EXISTS community_likes (
      post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      author_uid TEXT NOT NULL DEFAULT '',
      user_uid TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS post_id BIGINT`;
    await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS author_uid TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS user_uid TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

    await sql`UPDATE community_likes
      SET author_uid = CASE WHEN NULLIF(author_uid, '') IS NOT NULL THEN author_uid ELSE user_uid END,
          user_uid = CASE WHEN NULLIF(user_uid, '') IS NOT NULL THEN user_uid ELSE author_uid END`;
    await sql`DELETE FROM community_likes WHERE NULLIF(author_uid, '') IS NULL`;
    await sql`DELETE FROM community_likes a USING community_likes b
      WHERE a.ctid < b.ctid
        AND a.post_id = b.post_id
        AND a.author_uid = b.author_uid`;

    // Legacy versions created a primary key with a different name. Remove
    // every primary-key constraint on this table, then enforce uniqueness with
    // a unique index. A unique index avoids another PK conflict if a legacy
    // constraint survives from an older schema.
    await sql`DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_catalog.pg_constraint c
          JOIN pg_catalog.pg_class t ON t.oid = c.conrelid
          JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname = 'public'
            AND t.relname = 'community_likes'
            AND c.contype = 'p'
        LOOP
          EXECUTE format('ALTER TABLE public.community_likes DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END $$`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS community_likes_post_author_uid_idx
      ON community_likes (post_id, author_uid)`;

    await sql`ALTER TABLE community_likes ALTER COLUMN author_uid SET NOT NULL`;
    await sql`ALTER TABLE community_likes ALTER COLUMN user_uid SET NOT NULL`;

    await sql`CREATE TABLE IF NOT EXISTS marketplace_settings (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      affiliate_url TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by_uid TEXT NOT NULL DEFAULT ''
    )`;
    await sql`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS affiliate_url TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
    await sql`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS updated_by_uid TEXT NOT NULL DEFAULT ''`;

    await sql`ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check`;
    await sql`ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check CHECK (type IN ('text', 'youtube', 'instagram', 'image'))`;

    await sql`CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON community_posts (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_posts_author_uid_idx ON community_posts (author_uid)`;
    await sql`CREATE INDEX IF NOT EXISTS community_comments_post_id_created_at_idx ON community_comments (post_id, created_at ASC)`;
  })().catch(error => {
    // Allow a later request to retry if a transient DB/deployment error occurs.
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}
