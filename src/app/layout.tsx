import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Centipede | Social Scheduling For Creators",
  description: "Plan, tailor, and schedule posts across social channels from one creator-friendly studio."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header className="lp-header">
            <div className="lp-brand">Centipede</div>
            <nav className="lp-nav" aria-label="Primary">
              <Link href="/">Home</Link>
              <Link href="/studio">Studio</Link>
              <Link href="/settings">Settings</Link>
            </nav>
            <div className="lp-auth-actions">
              {!userId ? (
                <>
                <SignInButton />
                <SignUpButton />
                </>
              ) : (
                <UserButton />
              )}
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
