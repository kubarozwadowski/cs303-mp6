import assert from "node:assert/strict";
import { test } from "node:test";
import { configuration, cookieOptions, fetchProfile, seal, unseal } from "../lib/oauth.ts";

process.env.GITHUB_CLIENT_ID = "test-client";
process.env.GITHUB_CLIENT_SECRET = "test-secret-for-local-tests-only";
process.env.GITHUB_REDIRECT_URI = "http://127.0.0.1:3000/api/auth/callback";

test("cookies reject tampering, expiration, wrong purpose, and changed keys", () => {
  const encrypted = seal({ login: "octocat" }, "profile", 60);
  assert.deepEqual(unseal(encrypted, "profile"), { login: "octocat" });
  assert.ok(!encrypted.includes("octocat"));
  const bytes = Buffer.from(encrypted, "base64url");
  bytes[bytes.length - 1] ^= 1;
  assert.equal(unseal(bytes.toString("base64url"), "profile"), null);
  assert.equal(unseal(encrypted, "flow"), null);
  assert.equal(unseal(seal({}, "profile", -1), "profile"), null);
  assert.equal(unseal("invalid", "profile"), null);
  const original = process.env.GITHUB_CLIENT_SECRET;
  process.env.GITHUB_CLIENT_SECRET = "changed-secret";
  assert.equal(unseal(encrypted, "profile"), null);
  process.env.GITHUB_CLIENT_SECRET = original;
});

test("configuration requires credentials and secure callback URLs", () => {
  const original = process.env.GITHUB_REDIRECT_URI;
  assert.equal(cookieOptions(600).httpOnly, true);
  assert.equal(cookieOptions(600).sameSite, "lax");
  assert.equal(cookieOptions(600).secure, false);
  process.env.GITHUB_REDIRECT_URI = "https://example.vercel.app/api/auth/callback";
  assert.equal(cookieOptions(600).secure, true);
  process.env.GITHUB_REDIRECT_URI = "http://example.com/api/auth/callback";
  assert.throws(configuration);
  process.env.GITHUB_REDIRECT_URI = original;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  delete process.env.GITHUB_CLIENT_SECRET;
  assert.throws(configuration);
  process.env.GITHUB_CLIENT_SECRET = secret;
});

test("code exchange stays server-side and returns only public profile fields", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return Response.json({ access_token: "private-test-token", scope: "" });
    return Response.json({ login: "octocat", name: null, avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/octocat", private_gists: 12 });
  };
  try {
    const profile = await fetchProfile("code", "verifier");
    assert.equal(calls[0].options.body.get("client_secret"), process.env.GITHUB_CLIENT_SECRET);
    assert.equal(calls[0].options.body.get("code_verifier"), "verifier");
    assert.equal(calls[1].options.headers.Authorization, "Bearer private-test-token");
    assert.equal(calls[1].options.cache, "no-store");
    assert.deepEqual(Object.keys(profile).sort(), ["avatar_url", "html_url", "login", "name"]);
  } finally { globalThis.fetch = original; }
});

test("provider errors, broader scopes, and malformed profiles fail closed", async () => {
  const original = globalThis.fetch;
  try {
    for (const token of [{ error: "bad_verification_code" }, { access_token: "test", scope: "repo" }]) {
      globalThis.fetch = async () => Response.json(token);
      await assert.rejects(fetchProfile("code", "verifier"));
    }
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(fetchProfile("code", "verifier"));
    let call = 0;
    globalThis.fetch = async () => {
      call++;
      if (call === 1) return Response.json({ access_token: "test", scope: "" });
      return Response.json({});
    };
    await assert.rejects(fetchProfile("code", "verifier"));
  } finally { globalThis.fetch = original; }
});
