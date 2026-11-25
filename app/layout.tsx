import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub OAuth | MP 6",
  description: "Sign in with GitHub to see your public profile.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
