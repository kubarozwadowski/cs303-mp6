# MP 6: Simple OAuth Application

A small Next.js App Router project with a purple interface and GitHub OAuth. It uses only Next.js, React, and TypeScript tooling; there is no auth library, UI library, or database.

## Local setup

1. Use Node.js 22 and run `npm install`.
2. At [GitHub OAuth apps](https://github.com/settings/developers), choose **New OAuth App**, not GitHub App.
3. Set the homepage to `http://127.0.0.1:3000` and the authorization callback URL to `http://127.0.0.1:3000/api/auth/callback`.
4. Copy `.env.example` to `.env.local` if needed. Fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from that OAuth app. Keep `GITHUB_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback`. Never commit `.env.local` or put secrets in `NEXT_PUBLIC_` variables.
5. Run `npm run dev`. Open **http://127.0.0.1:3000**, rather than localhost, so the callback and temporary cookie use the same hostname. Keep port 3000 free of other apps.
6. Click **Sign in with GitHub**, authorize, and check your name, username, avatar, and profile link. A missing public name falls back to your username. Sign out clears the local profile cookie.

Restart the server after changing environment variables. An unconfigured app shows an explanation after clicking sign-in; it never invents a signed-in profile.

## Vercel deployment (required before submission)

1. Push this folder as a repository to GitHub. Ensure `.env.local` is ignored. If deploying a repository containing several projects, set Vercel's Root Directory to this project folder.
2. Import the repository into Vercel with the Next.js preset. Deploy once to get your stable production domain.
3. Register a **second GitHub OAuth App** for production. Set its homepage to `https://YOUR-DOMAIN.vercel.app` and callback to `https://YOUR-DOMAIN.vercel.app/api/auth/callback`.
4. In Vercel → Project → Settings → Environment Variables, add the production app's `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_REDIRECT_URI`. The redirect URI must exactly match the production callback above. Local credentials belong only in `.env.local`.
5. Redeploy so Vercel picks up the variables. Test on the stable production domain; deployment-specific preview domains are different OAuth origins.
6. In a fresh browser session, complete a real GitHub sign-in, confirm the profile appears, test sign out and cancelled authorization, and check narrow/mobile layout. Submit the live Vercel URL and source repository as required by your course submission portal.

## Rubric coverage

| Assignment requirement | Implementation |
| --- | --- |
| New Next.js project; App Router only | `app/`, with route handlers; no Pages Router or `getServerSideProps` |
| Register an allowed OAuth provider | GitHub OAuth App; local and production registration steps above |
| Local and deployed callback URIs | Environment-specific `GITHUB_REDIRECT_URI` |
| Keep the client secret off the client and GitHub | Server-side code only, `.env.local` ignored, production variables in Vercel |
| Redirect to provider; exchange authorization code | `/api/auth/login` and `/api/auth/callback`, using native `fetch` |
| Display basic information after login | Name, username, avatar, public profile link |
| Minimal, read-only permissions | Explicit empty scope; only `GET /user` for public information |
| No required database or persistent session | No database; encrypted public-profile cookie expires after one hour |
| Appropriate styling and separation of concerns | Plain purple CSS; shared OAuth helpers; separate route handlers and UI |
| Only allowed dependencies | Next.js/React framework dependencies and TypeScript development tooling |
| Deployed version works | Requires your production credentials and the final live sign-in check above |

The callback verifies a random, ten-minute state cookie and PKCE verifier. Cookies are HttpOnly and SameSite=Lax, and Secure on HTTPS. Cookie contents use authenticated encryption derived from the server-side client secret with separate flow/profile purposes. The access token is used only to retrieve the profile and is never stored or sent to the browser. Signing out clears this app's cookies; it does not sign you out of GitHub or revoke your GitHub authorization.

If this app was previously authorized with broader scopes, revoke it under GitHub → Settings → Applications → Authorized OAuth Apps, then sign in again. The implementation rejects tokens with any nonempty scope to keep this assignment public-profile-only.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Tests cover cookie confidentiality/integrity, expiry, purpose separation, HTTPS settings, server-side token exchange, rejected broad scopes, and provider failures. Mocked tests cannot replace the final real OAuth and deployed-domain checks.

References: [GitHub authorization-code flow and PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [GitHub scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps), [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers).
