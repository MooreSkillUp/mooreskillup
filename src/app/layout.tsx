import type { Metadata } from "next";
// 1. Import localFont from next/font/local
import localFont from "next/font/local";
import { Navbar } from "@/components/Navbar";
import "@/styles.css";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/lib/theme";

// local font for faster loadtime
const productSans = localFont({
  src: [
    {
      path: './fonts/Product-Sans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Product-Sans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: "--font-product-sans",
});

export const metadata: Metadata = {
  title: "MooreSkillUp",
  description: "MooreSkillUp is a learning platform that helps you learn new skills and advance your career.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${productSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <Navbar />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
