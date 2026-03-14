export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), ?)")
    .bind(token, userId, expiresAt)
    .run();
  return token;
}

export interface SessionUser {
  id: number;
  githubId: number;
  username: string;
  avatarUrl: string | null;
  migratedAnonymous: boolean;
}

export async function getSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.github_id, u.username, u.avatar_url, u.migrated_anonymous
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ id: number; github_id: number; username: string; avatar_url: string | null; migrated_anonymous: number }>();
  if (!row) return null;
  return {
    id: row.id,
    githubId: row.github_id,
    username: row.username,
    avatarUrl: row.avatar_url,
    migratedAnonymous: row.migrated_anonymous === 1,
  };
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

export function setSessionCookie(token: string): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`;
}

export function clearSessionCookie(): string {
  return "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)session=([^\s;]+)/);
  return match ? match[1] : null;
}
