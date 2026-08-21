import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think Different Training",
  description:
    "100 days of Coach Jaiden Francis breaking down your game and building personalised drills around what you need to improve.",
  // Square, transparent PNGs — Google's own favicon guidance requires square
  // (the old favicon2.png was 576×671 and never showed up in search).
  // 48px is Google's stated minimum; 512px covers larger contexts (PWA-style
  // home-screen icons, share previews). apple-touch-icon gets an opaque
  // background since iOS composites its own mask/shadow over it and ignores
  // alpha oddly otherwise.
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Black browser chrome + edge-to-edge rendering so notched phones show the
// page's own black behind the status bar instead of default chrome. Fixed
// elements compensate with env(safe-area-inset-*) where they touch the edges.
export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
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
        <link rel="preload" as="image" href="/hero-1.webp" fetchPriority="high" />
        {/* Second slide, so it must be decoded before the first crossfade. Keep
            this in step with HERO_SLIDES order — preloading a slide that moved
            to the back just spends bandwidth on the one needed last. */}
        <link rel="preload" as="image" href="/hero-4.webp" />
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
