import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apollo — Greenfield Portfolio",
  description: "Greenfield Growth's portfolio value-creation platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
