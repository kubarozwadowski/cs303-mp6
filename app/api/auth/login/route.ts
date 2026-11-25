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
    return NextResponse.redirect(new URL("/?error=configuration", request.url));
  }
}
