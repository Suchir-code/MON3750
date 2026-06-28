import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reactor Builder OS",
  description:
    "AI-supported pathway planning and proof-of-work tracking for Reactor Academy students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
