import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { configuration, cookieOptions, FLOW_COOKIE, seal } from "../../../../lib/oauth";

export function GET(request: Request) {
  try {
    const { clientId, redirectUri } = configuration();
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, state,
      scope: "", code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(FLOW_COOKIE, seal({ state, verifier }, FLOW_COOKIE, 600), cookieOptions(600));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    let validHttpsRedirect = false;
    try {
      validHttpsRedirect = new URL(process.env.GITHUB_REDIRECT_URI || "").protocol === "https:";
    } catch {
      // The diagnostic below identifies malformed callback URLs.
    }
    console.error("GitHub OAuth configuration check", {
      GITHUB_CLIENT_ID_present: Boolean(process.env.GITHUB_CLIENT_ID),
      GITHUB_CLIENT_SECRET_present: Boolean(process.env.GITHUB_CLIENT_SECRET),
      GITHUB_REDIRECT_URI_present: Boolean(process.env.GITHUB_REDIRECT_URI),
      // The callback URL is public. Never log the client secret or access token.
      redirectUriReceived: JSON.stringify(process.env.GITHUB_REDIRECT_URI),
      validHttpsRedirect,
    });
    return NextResponse.redirect(new URL("/?error=configuration", request.url));
  }
}
