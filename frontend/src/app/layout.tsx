import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Feedback Miner",
  description: "AI-powered feedback analysis and clustering tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
