"use client";

import Link from "next/link";
import { ArrowLeft, Check, Share, Smartphone, Wifi } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui-kit/Button";
import { useInstallApp } from "@/lib/install-app";

/**
 * How to put MooreSkillUp on a phone.
 *
 * A public page on purpose: it is linked from the install card, and it is the
 * page to send someone in a WhatsApp chat when they ask. Both platforms are
 * spelled out, because the answer is genuinely different and "add to home
 * screen" means nothing to most people.
 */
export default function InstallGuidePage() {
  const { canPrompt, isStandalone, install } = useInstallApp();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="mt-6">
        <BrandLogo tagline={false} />
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
        Put MooreSkillUp on your phone
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        It takes about ten seconds and you do not need the Play Store or the App Store.
      </p>

      {isStandalone ? (
        <p className="mt-6 flex items-center gap-2 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm font-medium">
          <Check className="h-4 w-4 text-success" />
          You are already using the installed app.
        </p>
      ) : (
        canPrompt && (
          <div className="mt-6">
            <Button variant="accent" size="lg" onClick={() => void install()}>
              Install it now
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Your phone will ask you to confirm.
            </p>
          </div>
        )
      )}

      <section className="mt-10 rounded-[2rem] border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">On Android</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chrome, Opera or Samsung Internet</p>
        <ol className="mt-4 space-y-3 text-sm">
          <Step n={1}>
            Tap the <strong>three dots</strong> in the top corner of the browser.
          </Step>
          <Step n={2}>
            Tap <strong>Add to Home screen</strong> — on some phones it says{" "}
            <strong>Install app</strong>.
          </Step>
          <Step n={3}>
            Tap <strong>Install</strong>. The MooreSkillUp icon appears with your other apps.
          </Step>
        </ol>
      </section>

      <section className="mt-5 rounded-[2rem] border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">On iPhone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          It has to be Safari — Chrome on iPhone cannot install apps.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <Step n={1}>
            Tap <Share className="inline h-4 w-4 text-accent" /> <strong>Share</strong> at the
            bottom of the screen.
          </Step>
          <Step n={2}>
            Scroll down the list and tap <strong>Add to Home Screen</strong>.
          </Step>
          <Step n={3}>
            Tap <strong>Add</strong> in the top corner. Done.
          </Step>
        </ol>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        <Perk icon={<Smartphone className="h-5 w-5 text-accent" />} title="Opens like an app">
          Straight to your courses, with no browser bars in the way.
        </Perk>
        <Perk icon={<Wifi className="h-5 w-5 text-accent" />} title="Survives a weak signal">
          Pages you have already opened still load when the network drops.
        </Perk>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        Nothing is downloaded from a store, and it takes almost no space on your phone.
      </p>
    </main>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function Perk({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {icon}
      <div className="mt-2 font-medium">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
