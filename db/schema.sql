-- Entrega365 — PostgreSQL foundation
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS community_posts (
  id BIGSERIAL PRIMARY KEY,
  author_uid TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  text TEXT NOT NULL DEFAULT '',
  media_type TEXT CHECK (media_type IN ('none', 'youtube', 'instagram')) DEFAULT 'none',
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_posts_created_at_idx
  ON community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_author_uid_idx
  ON community_posts (author_uid);

CREATE TABLE IF NOT EXISTS community_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_uid TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_comments_post_id_created_at_idx
  ON community_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS community_comments_author_uid_idx
  ON community_comments (author_uid);

CREATE TABLE IF NOT EXISTS community_likes (
  post_id BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_uid)
);

CREATE TABLE IF NOT EXISTS marketplace_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  affiliate_url TEXT NOT NULL DEFAULT '',
  updated_by_uid TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO marketplace_settings (id, affiliate_url)
VALUES (1, 'https://meli.la/1Komyrh')
ON CONFLICT (id) DO NOTHING;
