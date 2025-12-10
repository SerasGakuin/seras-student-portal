import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LiffProvider } from "@/lib/liff";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-noto-sans-jp" });

export const metadata: Metadata = {
  title: "Seras学院 生徒ポータル",
  description: "Seras学院の生徒向けポータルサイト",
  icons: {
    icon: "/images/mogura_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansJP.variable}`}>
        <LiffProvider>
          {children}
          <Analytics />
        </LiffProvider>
      </body>
    </html>
  );
}
