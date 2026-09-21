"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { captureAttribution } from "@/lib/attribution";

/**
 * Analytics, and only when it is configured.
 *
 * Nothing loads unless the matching environment variable is set, so a developer
 * running this locally sends no traffic anywhere and a deployment without keys
 * behaves exactly as it did before. Both IDs are public by nature — they ship
 * in the page either way — so they live in NEXT_PUBLIC_ vars rather than being
 * fetched.
 *
 * This also captures the campaign tags on the first page of a visit, because by
 * the time somebody reaches the signup form the URL no longer carries them.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void };
    _fbq?: unknown;
  }
}

/** Record something worth counting. Silent when nothing is configured. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
    window.fbq?.("trackCustom", name, params);
  } catch {
    // Analytics must never be able to break the thing it is measuring.
  }
}

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution(window.location.search);
  }, []);

  // Single-page navigations do not reload the page, so each one is reported.
  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString();
    const page = query ? `${pathname}?${query}` : pathname;
    try {
      window.gtag?.("event", "page_view", { page_path: page });
      window.fbq?.("track", "PageView");
    } catch {
      // As above.
    }
  }, [pathname, searchParams]);

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');`}
        </Script>
      )}
    </>
  );
}
