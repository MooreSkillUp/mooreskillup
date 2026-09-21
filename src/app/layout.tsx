import type { Metadata, Viewport } from "next";
import "@/styles.css";
import { Providers } from "./providers";

/**
 * What the rest of the internet sees.
 *
 * Every link shared to WhatsApp used to render as a bare grey box: there was no
 * og:image anywhere in the app, and the description said "Structured online
 * learning, beautifully delivered", which sells nothing. `metadataBase` lets a
 * page set a relative image and have it resolve to an absolute URL, which is
 * what scrapers require — a relative og:image is silently dropped.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mooreskillup.vercel.app";
const SITE_DESCRIPTION =
  "Practical, job-ready tech skills taught by people who do the work — with certificates employers can check.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MooreSkillUp — Skills Beyond the Classroom",
    // Course and certificate pages set their own title; this frames it.
    template: "%s | MooreSkillUp",
  },
  description: SITE_DESCRIPTION,
  applicationName: "MooreSkillUp",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "MooreSkillUp",
    title: "MooreSkillUp — Skills Beyond the Classroom",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_NG",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "MooreSkillUp — Skills Beyond the Classroom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MooreSkillUp — Skills Beyond the Classroom",
    description: SITE_DESCRIPTION,
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FC6104",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
