CREATE TABLE IF NOT EXISTS community_posts (
  id BIGSERIAL PRIMARY KEY,
  author_uid TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Entregador',
  author_email TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'youtube', 'instagram', 'image')),
  url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_created_at_idx
  ON community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_author_uid_idx
  ON community_posts (author_uid);

CREATE TABLE IF NOT EXISTS community_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_uid TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Entregador',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_comments_post_id_created_at_idx
  ON community_comments (post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_likes (
  post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, author_uid)
);

CREATE TABLE IF NOT EXISTS marketplace_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  affiliate_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_uid TEXT NOT NULL DEFAULT ''
);
