import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthControls } from "@/components/auth/AuthControls";
import "./globals.css";

export const metadata: Metadata = {
  title: "AcneTrex V3",
  description: "Privacy-first acne intelligence app with durable logs, FaceAtlas, Skin Twin, and AI/ML readiness.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        {clerkConfigured ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          >
            <AuthControls />
            {children}
          </ClerkProvider>
        ) : children}
        <SpeedInsights />
      </body>
    </html>
  );
}
