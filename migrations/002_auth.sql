CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  migrated_anonymous INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE user_auctions (
  user_id INTEGER NOT NULL REFERENCES users(id),
  auction_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  PRIMARY KEY (user_id, auction_id)
);

-- Recreate hidden/favorites with user_id in the primary key
ALTER TABLE hidden RENAME TO hidden_old;
CREATE TABLE hidden (
  user_id INTEGER,
  auction_id INTEGER NOT NULL,
  lot_number TEXT NOT NULL,
  PRIMARY KEY (user_id, auction_id, lot_number)
);
INSERT INTO hidden (user_id, auction_id, lot_number)
  SELECT NULL, auction_id, lot_number FROM hidden_old;
DROP TABLE hidden_old;

ALTER TABLE favorites RENAME TO favorites_old;
CREATE TABLE favorites (
  user_id INTEGER,
  auction_id INTEGER NOT NULL,
  lot_number TEXT NOT NULL,
  PRIMARY KEY (user_id, auction_id, lot_number)
);
INSERT INTO favorites (user_id, auction_id, lot_number)
  SELECT NULL, auction_id, lot_number FROM favorites_old;
DROP TABLE favorites_old;

CREATE INDEX idx_sessions_expires ON sessions(expires_at);
