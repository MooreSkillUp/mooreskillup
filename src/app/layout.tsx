// import type { Metadata } from "next";
// import "@/styles.css";
// import { Providers } from "./providers";

// export const metadata: Metadata = {
//   title: "MooreSkillUp - Learn skills that move you forward",
//   description:
//     "MooreSkillUp is a focused online learning platform with structured courses, lessons, and progress tracking.",
//   manifest: "/manifest.json",
//   themeColor: "#0f172a",
//   openGraph: {
//     title: "MooreSkillUp",
//     description: "Structured online learning, beautifully delivered.",
//     type: "website",
//   },
// };

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body className="transition-colors duration-300">
//         <Providers>{children}</Providers>
//       </body>
//     </html>
//   );
// }

import type { Metadata, Viewport } from "next";
import "@/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MooreSkillUp - Learn skills that move you forward",
  description:
    "MooreSkillUp is a focused online learning platform with structured courses, lessons, and progress tracking.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "MooreSkillUp",
    description: "Structured online learning, beautifully delivered.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FC6104",
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