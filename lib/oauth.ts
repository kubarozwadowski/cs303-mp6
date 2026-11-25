import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const FLOW_COOKIE = "oauth_flow";
export const PROFILE_COOKIE = "oauth_profile";

export type Profile = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

export function configuration() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Missing OAuth configuration");
  const url = new URL(redirectUri);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "127.0.0.1")) {
    throw new Error("OAuth requires HTTPS or the local loopback address");
  }
  return { clientId, clientSecret, redirectUri, origin: url.origin };
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: new URL(configuration().redirectUri).protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// Authenticated encryption prevents reading or changing the short-lived cookies.
// The GitHub client secret is used only on the server; tokens are never stored.
export function seal(value: object, purpose: string, seconds: number) {
  const key = createHash("sha256").update(configuration().clientSecret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const data = Buffer.from(JSON.stringify({ value, expires: Date.now() + seconds * 1000 }));
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function unseal<T>(cookie: string | undefined, purpose: string): T | null {
  if (!cookie) return null;
  try {
    const key = createHash("sha256").update(configuration().clientSecret).digest();
    const data = Buffer.from(cookie, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(data.subarray(12, 28));
    const decrypted = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
    const payload = JSON.parse(decrypted.toString());
    if (payload.expires > Date.now()) return payload.value as T;
    return null;
  } catch {
    return null;
  }
}

export async function fetchProfile(code: string, verifier: string): Promise<Profile> {
  const { clientId, clientSecret, redirectUri } = configuration();
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
      code, code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) throw new Error("Token exchange failed");
  const token = await tokenResponse.json();
  if (typeof token.access_token !== "string" || token.error) throw new Error("Invalid token response");
  // Reject previously granted broader permissions as well as requesting no scopes.
  if (token.scope) throw new Error("Only public-profile permissions are allowed");
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "mp-6-oauth",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Profile request failed");
  const user = await response.json();
  if (typeof user.login !== "string" || typeof user.avatar_url !== "string" ||
      typeof user.html_url !== "string") throw new Error("Invalid profile response");
  let name: string | null = null;
  if (typeof user.name === "string") name = user.name;
  return {
    login: user.login,
    name,
    avatar_url: user.avatar_url,
    html_url: user.html_url,
  };
}
