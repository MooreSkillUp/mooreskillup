"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui-kit/Button";
import { getHomeRouteForUser, useAuth } from "@/lib/auth";

/**
 * The front door.
 *
 * Deliberately a gateway, not a marketing page — discovery and persuasion live
 * on the separate MooreSkillUp marketing site, which routes people here. All
 * this screen does is get you in: sign in, create an account, or verify
 * someone's certificate.
 *
 * It is also the PWA's `start_url`, so it doubles as the app's launch screen.
 */
export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Launching the installed app lands here. Someone already signed in should go
  // straight to their workspace rather than be asked to sign in again.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getHomeRouteForUser(user));
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Hold the splash while the session resolves *and* while the redirect above
  // runs. Without the second condition the app flashes the sign-in gateway for
  // a frame before jumping to the dashboard on every cold launch.
  if (isLoading || isAuthenticated) {
    return <LaunchScreen />;
  }

  return <Gateway />;
}

/** Branded hold screen — bridges the OS splash and the first real screen. */
function LaunchScreen() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6">
      <BrandMark />
      <div
        className="h-1 w-28 overflow-hidden rounded-full bg-muted"
        role="status"
        aria-label="Loading MooreSkillUp"
      >
        <div className="h-full w-1/3 animate-[msuIndeterminate_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
      </div>
    </div>
  );
}

function Gateway() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-background text-foreground"
      style={{
        // Keep content clear of the notch and home indicator when the PWA runs
        // fullscreen on a phone.
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <header className="flex items-center justify-end px-5 py-4 sm:px-8">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center text-center">
            <BrandMark />

            <p className="mt-6 text-balance text-base leading-relaxed text-muted-foreground">
              Learn practical skills, track your progress, and earn certificates
              that prove it.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3">
            <Link href="/auth/login" className="w-full">
              <Button variant="accent" size="lg" className="w-full">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/auth/register" className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                Create account
              </Button>
            </Link>
          </div>

          <div className="mt-10 border-t border-border pt-6">
            <Link
              href="/verify"
              className="group flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              Verify a certificate
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-5 pb-6 text-center text-xs text-muted-foreground sm:px-8">
        &copy; {new Date().getFullYear()} MooreSkillUp
      </footer>
    </div>
  );
}

/** Decorative here — this *is* the home page, so the mark doesn't navigate. */
function BrandMark() {
  return <BrandLogo href={null} size="lg" priority />;
}
