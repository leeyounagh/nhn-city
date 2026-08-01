// UI 표시용 정적 라벨 — 상인 전문화별 초상화 폴백 이모지, 흥정 카테고리 한글명. 여러 컴포넌트가 공유한다.
import type { HaggleCategory } from "@/types/game";

// 상인 전문화(id) → 초상화 폴백 이모지. 실제 AI 초상화가 없을 때만 쓰인다.
export const PORTRAIT_EMOJI: Record<string, string> = {
  woodmonger: "🪵",
  mason: "🗿",
  junker: "🛠️",
  glazier: "🔮",
  draper: "🧵",
  general: "🎒",
};

// 흥정 발언 카테고리 → 한글 라벨.
export const CATEGORY_LABEL: Record<HaggleCategory, string> = {
  flattery: "아부",
  logic: "논리",
  bulk: "대량구매",
  sob: "딱한사정",
  threat: "협박",
  smalltalk: "잡담",
  quality: "자재흠집",
};
