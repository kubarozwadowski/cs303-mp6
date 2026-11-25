import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { configuration, cookieOptions, fetchProfile, FLOW_COOKIE, PROFILE_COOKIE, seal, unseal } from "../../../../lib/oauth";

export async function GET(request: NextRequest) {
  let origin: string;
  try {
    origin = configuration().origin;
  } catch {
    return NextResponse.redirect(new URL("/?error=configuration", request.url));
  }
  function finish(error?: string) {
    let path = "/";
    if (error) path = `/?error=${error}`;
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.set(FLOW_COOKIE, "", cookieOptions(0));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  const flow = unseal<{ state: string; verifier: string }>(request.cookies.get(FLOW_COOKIE)?.value, FLOW_COOKIE);
  const state = request.nextUrl.searchParams.get("state");
  if (!flow || !state || Buffer.byteLength(state) !== Buffer.byteLength(flow.state) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state))) return finish("state");
  if (request.nextUrl.searchParams.has("error")) return finish("denied");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return finish("code");
  try {
    const profile = await fetchProfile(code, flow.verifier);
    const response = finish();
    response.cookies.set(PROFILE_COOKIE, seal(profile, PROFILE_COOKIE, 3600), cookieOptions(3600));
    return response;
  } catch {
    return finish("provider");
  }
}
