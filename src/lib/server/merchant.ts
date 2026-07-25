// 서버 전용 상인 조립. seed → 숨은 스펙 복원 + LLM(또는 폴백) 페르소나 → 공개 뷰.
// /api/merchant(단건)와 /api/town(마을 상인 목록)이 공유한다.
import "server-only";
import type { BookLevel, MaterialId, PublicMerchant, TownId } from "@/types/game";
import { deriveMerchant, buildPublicMerchant, merchantIdentity } from "@/lib/server/economy";
import { askText, extractJson } from "@/lib/server/llm";
import { personaSystem, personaUser, fallbackPersona, type Persona } from "@/lib/server/prompt";

export async function generatePublicMerchant(
  seed: number,
  bookLevel: BookLevel,
  wants: MaterialId[] = [],
  townId?: TownId, // 상인이 있는 마을 → 특산 할인(마을배수) 반영
  recentBuys?: Partial<Record<MaterialId, number>>, // 플레이어 최근 구매량 → 품귀배수 반영
  day?: number, // 오늘 → 대풍작 이벤트배수 반영
): Promise<PublicMerchant> {
  const derived = deriveMerchant(seed, townId, recentBuys, day);
  const llm = extractJson<Partial<Persona>>(
    await askText(personaSystem(), personaUser(derived.spec)),
  );
  const fb = fallbackPersona(derived.spec, seed);
  // 영구 상인은 이름·외모를 정체성으로 고정(초상화와 매칭). 인사·톤은 LLM(없으면 폴백)이 연기.
  const identity = merchantIdentity(seed);
  const persona: Persona = {
    name: identity?.name ?? llm?.name ?? fb.name,
    appearance: identity?.appearance ?? llm?.appearance ?? fb.appearance,
    greeting: llm?.greeting ?? fb.greeting,
    personalityTone: llm?.personalityTone ?? fb.personalityTone,
  };
  return buildPublicMerchant(derived, bookLevel, persona, wants);
}
