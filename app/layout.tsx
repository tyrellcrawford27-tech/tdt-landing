import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think Different Training",
  description:
    "100 days of Coach Jaiden Francis breaking down your game and building personalised drills around what you need to improve.",
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
        {/* No image preloads here. This layout wraps every route, so anything
            preloaded from it downloads on /apply, /privacy and /terms as
            well — pages that render no images at all. The
            landing page's own preloads live in app/page.tsx instead. */}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
