import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page Manager Pro • Business Suite",
  description: "Secure Facebook Business Manager dashboard — local version",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
