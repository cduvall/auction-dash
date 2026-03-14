PRAGMA foreign_keys = OFF;

-- Drop sessions (foreign key to users)
DROP TABLE IF EXISTS sessions;

-- Replace GitHub-based users with email-based (Cloudflare Access)
ALTER TABLE users RENAME TO users_old;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  migrated_anonymous INTEGER NOT NULL DEFAULT 0
);
INSERT INTO users (id, email, username, avatar_url, created_at, migrated_anonymous)
  SELECT id, username || '@github', username, avatar_url, created_at, migrated_anonymous FROM users_old;
DROP TABLE users_old;

PRAGMA foreign_keys = ON;
