import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Centipede | Cross-Post Scheduling",
  description: "Schedule and process cross-platform posts for Telegram, X, Reddit, and LinkedIn."
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
