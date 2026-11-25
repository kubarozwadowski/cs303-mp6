import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, FLOW_COOKIE, unseal, type Profile } from "../lib/oauth";

const errors: Record<string, string> = {
  configuration: "Sign-in isn't available right now. Please try again later.",
  state: "We couldn't verify your sign-in. Please try signing in again.",
  denied: "Sign-in was cancelled. Try again when you're ready.",
  code: "Something went wrong while signing in. Please try again.",
  provider: "We couldn't load your GitHub profile. Please try again in a moment.",
};

async function signOut() {
  "use server";
  const jar = await cookies();
  jar.delete(PROFILE_COOKIE);
  jar.delete(FLOW_COOKIE);
  redirect("/");
}

export default async function Home({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const jar = await cookies();
  const profile = unseal<Profile>(jar.get(PROFILE_COOKIE)?.value, PROFILE_COOKIE);
  const { error } = await searchParams;
  if (profile) {
    return (
      <main className="card">
          <img className="avatar" src={profile.avatar_url} alt={`${profile.login}'s GitHub avatar`} width="88" height="88" referrerPolicy="no-referrer" />
          <h1>Hello, {profile.name || profile.login}.</h1>
          <dl>
            <div><dt>Name</dt><dd>{profile.name || "Not provided"}</dd></div>
            <div><dt>Username</dt><dd>@{profile.login}</dd></div>
          </dl>
          <a className="profile-link" href={profile.html_url} target="_blank" rel="noopener noreferrer">View GitHub profile</a>
          <form action={signOut}><button type="submit">Sign out</button></form>
      </main>
    );
  }
  return (
    <main className="card">
          <h1>Sign in</h1>
          <p className="intro">Connect with GitHub to see your name, username, and profile picture.</p>
          {error && errors[error] && <p className="error" role="alert">{errors[error]}</p>}
          <a className="button" href="/api/auth/login">Sign in with GitHub</a>
    </main>
  );
}
