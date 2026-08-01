// PWA 매니페스트 — 홈 화면 추가 시 이름·아이콘·테마색. App Router 파일 규약(/manifest.webmanifest).
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ashen Kingdom — 마지막 도시",
    short_name: "마지막 도시",
    description: "소문을 읽어 상인을 추리하고 흥정으로 폐허가 된 도시를 재건하는 LLM 추리 게임.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0a09",
    theme_color: "#0c0a09",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
