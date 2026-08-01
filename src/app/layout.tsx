import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel, Song_Myung } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 제목용 디스플레이 폰트. Cinzel=라틴 판타지 세리프, Song Myung=한글 전통 명조. 본문은 sans 유지.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const songMyung = Song_Myung({
  variable: "--font-song-myung",
  weight: "400",
});

// 배포 URL(OG·canonical 절대경로 기준). 배포 시 NEXT_PUBLIC_SITE_URL로 덮어쓴다.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "소문을 읽어 떠돌이 상인을 추리하고, 자연어 흥정으로 자재를 싸게 사서 폐허가 된 고향을 재건하는 LLM 추리 게임.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ashen Kingdom — 마지막 도시", template: "%s | Ashen Kingdom" },
  description: DESCRIPTION,
  applicationName: "Ashen Kingdom",
  keywords: ["Ashen Kingdom", "마지막 도시", "도시 재건 게임", "흥정 게임", "LLM 게임", "추리 게임"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Ashen Kingdom",
    title: "Ashen Kingdom — 마지막 도시",
    description: DESCRIPTION,
    images: [{ url: "/intro/title.png", width: 1535, height: 1024, alt: "마지막 도시 타이틀" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ashen Kingdom — 마지막 도시",
    description: DESCRIPTION,
    images: ["/intro/title.png"],
  },
  robots: { index: true, follow: true },
};

// viewport-fit=cover: iOS 노치/홈바 안전영역(env(safe-area-inset-*))을 사용하려면 필요.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${songMyung.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: 브라우저 확장(ColorZilla 등)이 body에 cz-shortcut-listen 같은 속성을 주입해 생기는 hydration 경고 억제. 자식 요소 검증엔 영향 없음. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <noscript>
          <div style={{ padding: "2rem", maxWidth: "40rem", margin: "0 auto", color: "#ededed" }}>
            <h1>Ashen Kingdom — 마지막 도시</h1>
            <p>
              소문을 읽어 떠돌이 상인을 추리하고, 자연어 흥정으로 자재를 싸게 사서 폐허가 된 고향을 재건하는
              LLM 추리 게임입니다. 플레이하려면 JavaScript를 켜 주세요.
            </p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
