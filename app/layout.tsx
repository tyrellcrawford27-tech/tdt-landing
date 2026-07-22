import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think Different Training",
  description: "Basketball development coaching with cohort-based training.",
  icons: {
    icon: "/favicon2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap" rel="stylesheet" />
        {/* Preload key visuals so they're already loading before the user scrolls to them */}
        <link rel="preload" as="image" href="/hero.webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/study-work.webp" />
        <link rel="preload" as="image" href="/drill-true.webp" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
