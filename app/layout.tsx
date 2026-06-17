import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ТЙ Журнал — Temir yo'l xizmat tizimi",
  description: "Temir yo'l elektromexanik ish jurnali",
};

import { OfflineNotifier } from "@/components/OfflineNotifier";
import { SWRProvider } from "@/components/SWRProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0284c7" />
        <link rel="apple-touch-icon" href="/uty-logo.png" />
      </head>
      <body className={inter.className}>
        <SWRProvider>
          {children}
          <OfflineNotifier />
        </SWRProvider>
      </body>
    </html>
  );
}
