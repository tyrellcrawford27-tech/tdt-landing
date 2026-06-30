import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tactical Different Training",
  description: "Basketball development coaching with cohort-based training.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased overflow-x-hidden">
      <body className="min-h-full flex flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
