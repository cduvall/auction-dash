#!/usr/bin/env bash
set -euo pipefail

DB_NAME="auction-dash-db"
MIGRATIONS_DIR="migrations"

# Create tracking table if it doesn't exist
npx wrangler d1 execute "$DB_NAME" --remote --command \
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));"

# Get list of already-applied migrations
APPLIED=$(npx wrangler d1 execute "$DB_NAME" --remote --json --command \
  "SELECT name FROM _migrations;" | node -e "
    const input = require('fs').readFileSync('/dev/stdin','utf8');
    const parsed = JSON.parse(input);
    const names = (parsed[0]?.results || []).map(r => r.name);
    console.log(names.join('\n'));
  ")

# Run each numbered migration file in order
for file in "$MIGRATIONS_DIR"/[0-9]*.sql; do
  name=$(basename "$file")
  if echo "$APPLIED" | grep -qx "$name"; then
    echo "Skip: $name (already applied)"
  else
    echo "Applying: $name"
    npx wrangler d1 execute "$DB_NAME" --remote --file="$file"
    npx wrangler d1 execute "$DB_NAME" --remote --command \
      "INSERT INTO _migrations (name) VALUES ('$name');"
    echo "Done: $name"
  fi
done

echo "Migrations complete."
