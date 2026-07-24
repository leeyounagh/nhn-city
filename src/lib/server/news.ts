// 서버 전용 아침 시황 뉴스. 하루치 이벤트(economy.dailyEvent)를 공개 서술 + LLM(또는 폴백) 헤드라인으로 옮긴다.
// 가격 공식 원본은 economy에만 남고, 여기선 이벤트의 "무엇이 얼마나 떨어졌나"만 공개한다.
import "server-only";
import type { DailyNews, MarketEvent } from "@/types/game";
import { TOWN_BY_ID, MATERIAL_NAME } from "@/lib/game-data";
import { dailyEvent } from "@/lib/server/economy";
import { askText, extractJson } from "@/lib/server/llm";
import { newsSystem, newsUser, fallbackHeadline } from "@/lib/server/prompt";

// 하루치 이벤트를 클라 공개용 서술(마을·업종·물품명·하락률)로 변환. 이벤트 없으면 null.
export function marketEvent(day: number): MarketEvent | null {
  const ev = dailyEvent(day);
  if (!ev) return null;
  const t = TOWN_BY_ID[ev.townId];
  return {
    townId: ev.townId,
    townName: t.name,
    industryName: t.industryName,
    materialNames: t.specialMaterials.map((m) => MATERIAL_NAME[m]),
    pct: Math.round((1 - ev.multiplier) * 100),
  };
}

export async function generateNews(day: number): Promise<DailyNews> {
  const event = marketEvent(day);
  const llm = extractJson<{ headline?: string }>(await askText(newsSystem(), newsUser(event), 120));
  const headline = llm?.headline?.trim() || fallbackHeadline(event, day);
  return { headline, event };
}
