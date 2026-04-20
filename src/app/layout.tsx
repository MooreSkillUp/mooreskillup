import type { Metadata } from "next";
import "@/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MooreSkillUp — Learn skills that move you forward",
  description:
    "MooreSkillUp is a focused online learning platform with structured courses, lessons, and progress tracking.",
  openGraph: {
    title: "MooreSkillUp",
    description: "Structured online learning, beautifully delivered.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
