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

export function logout(): void {
  window.location.href = "/api/auth/logout";
}

export async function migrateAnonymous(skip: boolean): Promise<void> {
  const url = skip ? "/api/auth/migrate?skip=1" : "/api/auth/migrate";
  await fetch(url, { method: "POST" });
}
