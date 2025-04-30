import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Providers } from '@/components/providers';
import { Analytics } from "@vercel/analytics/react"
import 'nprogress/nprogress.css';
import { PageProgressBar } from '@/components/PageProgressBar';
import { Suspense } from 'react';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 영상 요약",
  description: "영상 요약을 원하는 영상의 URL을 입력하면 영상 요약을 쉽게 얻을 수 있습니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Analytics />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-C64P1CEGZR"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C64P1CEGZR');
          `}
        </Script>
        <link rel="icon" href="/symbol.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <Providers>
          <Suspense fallback={null}>
            <PageProgressBar />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}