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
    <html lang="th" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("pgh-theme");if(t===null){document.documentElement.classList.remove("dark");localStorage.setItem("pgh-theme","light")}else if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
