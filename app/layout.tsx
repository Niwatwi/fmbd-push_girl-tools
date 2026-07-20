import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FMBD Push Girl Tools",
  description: "Field operation dashboard for push girl tools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
