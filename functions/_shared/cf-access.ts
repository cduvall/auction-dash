export interface AccessJWTPayload {
  aud: string[];
  email: string;
  sub: string;
  iat: number;
  exp: number;
  iss: string;
  country?: string;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function verifyAccessJWT(
  token: string,
  teamDomain: string,
  aud: string
): Promise<AccessJWTPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { kid: string; alg: string };
  let payload: AccessJWTPayload;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));
  } catch {
    return null;
  }

  // Check expiration
  if (payload.exp < Date.now() / 1000) return null;

  // Check audience
  const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audList.includes(aud)) return null;

  // Fetch public keys
  const certsRes = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!certsRes.ok) return null;
  const certs = await certsRes.json<{ keys: Array<JsonWebKey & { kid: string }> }>();

  // Find matching key
  const key = certs.keys.find((k) => k.kid === header.kid);
  if (!key) return null;

  // Import key and verify signature
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signature = base64UrlDecode(parts[2]);
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, data);
  if (!valid) return null;

  return payload;
}

export function getAccessJWTFromRequest(request: Request): string | null {
  // Check header first, then cookie
  const header = request.headers.get("Cf-Access-Jwt-Assertion");
  if (header) return header;

  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^\s;]+)/);
  return match ? match[1] : null;
}
