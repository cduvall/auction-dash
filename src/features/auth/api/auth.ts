import type { AuthUser } from "@/shared/types";

interface MeResponse {
  user: AuthUser | null;
  hasAnonymousData?: boolean;
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return { user: null };
  return res.json();
}

export async function logout(): Promise<void> {
  try {
    // Hit our logout endpoint to clear cookies, then redirect home
    await fetch("/api/auth/logout", { redirect: "manual" });
  } catch {
    // Even if the CF Access logout fails, cookies are cleared by the response
  }
  window.location.href = "/";
}

export async function migrateAnonymous(skip: boolean): Promise<void> {
  const url = skip ? "/api/auth/migrate?skip=1" : "/api/auth/migrate";
  await fetch(url, { method: "POST" });
}
