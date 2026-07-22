import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Ashen Kingdom",
  description: "소문을 읽고 떠돌이 상인과 거래해 폐허가 된 도시를 다시 세우는 게임.",
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
        {children}
      </body>
    </html>
  );
}
