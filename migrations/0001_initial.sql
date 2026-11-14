PRAGMA foreign_keys = ON;

-- Accounts are invite-only. Exactly one owner is created during first-run setup.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'cohost')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_owner
  ON users(role) WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'cohost' CHECK (role = 'cohost'),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invitations_expiry ON invitations(expires_at);

-- The dictionary is the canonical source for words. Cards reference words,
-- so one word can appear in several comparison groups without duplication.
CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  danish TEXT NOT NULL,
  translation TEXT NOT NULL DEFAULT '',
  legacy_family TEXT NOT NULL DEFAULT '',
  legacy_family_note TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_words_danish ON words(danish COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_words_updated ON words(updated_at DESC);

CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rules_title ON rules(title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_rules_updated ON rules(updated_at DESC);

CREATE TABLE IF NOT EXISTS similar_cards (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('form', 'meaning')),
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  sources_json TEXT NOT NULL DEFAULT '[]',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_similar_cards_category ON similar_cards(category, updated_at DESC);

CREATE TABLE IF NOT EXISTS similar_card_words (
  card_id TEXT NOT NULL REFERENCES similar_cards(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  card_translation TEXT NOT NULL DEFAULT '',
  card_usage TEXT NOT NULL DEFAULT '',
  card_example TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (card_id, word_id)
);
CREATE INDEX IF NOT EXISTS idx_card_words_order ON similar_card_words(card_id, position);

CREATE TABLE IF NOT EXISTS custom_callouts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✦',
  background_color TEXT NOT NULL DEFAULT '#dfeee2',
  accent_color TEXT NOT NULL DEFAULT '#687f64',
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
