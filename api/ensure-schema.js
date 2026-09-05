export async function ensureSchema(sql) {
  // The production database already contains older versions of these tables.
  // CREATE TABLE IF NOT EXISTS does not change an existing table, so migrate
  // every column that the current API requires before querying it.
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, author_uid)
  )`;
  await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS post_id BIGINT`;
  await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS author_uid TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE community_likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;

  // Legacy likes used post_id as the sole primary key. The current model is
  // one like per user per post, so replace that legacy key with the composite
  // key expected by the API.
  await sql`ALTER TABLE community_likes DROP CONSTRAINT IF EXISTS community_likes_pkey`;
  await sql`ALTER TABLE community_likes ADD CONSTRAINT community_likes_pkey PRIMARY KEY (post_id, author_uid)`;

  await sql`CREATE TABLE IF NOT EXISTS marketplace_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    affiliate_url TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by_uid TEXT NOT NULL DEFAULT ''
  )`;
  await sql`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS affiliate_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  await sql`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS updated_by_uid TEXT NOT NULL DEFAULT ''`;

  // Older installations created a restrictive type CHECK constraint before
  // image publications were introduced. Recreate the current constraint.
  await sql`ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_type_check`;
  await sql`ALTER TABLE community_posts ADD CONSTRAINT community_posts_type_check CHECK (type IN ('text', 'youtube', 'instagram', 'image'))`;

  await sql`CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON community_posts (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS community_posts_author_uid_idx ON community_posts (author_uid)`;
  await sql`CREATE INDEX IF NOT EXISTS community_comments_post_id_created_at_idx ON community_comments (post_id, created_at ASC)`;
}
