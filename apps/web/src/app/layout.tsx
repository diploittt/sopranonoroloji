import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fredoka } from "next/font/google"; // [NEW]
import "./globals.css";


const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"], // Match HTML
});

const fredoka = Fredoka({
  subsets: ["latin", "latin-ext"],
  variable: "--font-logo",
  weight: ["500", "600", "700"], // Match HTML
});

export const metadata: Metadata = {
  title: "SopranoChat - Final Radio Edition",
  description: "SopranoChat — Canlı Sesli Sohbet Platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${jakarta.variable} ${fredoka.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
