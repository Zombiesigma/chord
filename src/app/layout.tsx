import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chordbook",
  description: "Kumpulan chord dan lirik lagu.",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
