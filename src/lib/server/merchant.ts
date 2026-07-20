// 서버 전용 상인 조립. seed → 숨은 스펙 복원 + LLM(또는 폴백) 페르소나 → 공개 뷰.
// /api/merchant(단건)와 /api/town(마을 상인 목록)이 공유한다.
import "server-only";
import type { BookLevel, MaterialId, PublicMerchant, TownId } from "@/types/game";
import { deriveMerchant, buildPublicMerchant } from "@/lib/server/economy";
import { askText, extractJson } from "@/lib/server/llm";
import { personaSystem, personaUser, fallbackPersona, type Persona } from "@/lib/server/prompt";

export async function generatePublicMerchant(
  seed: number,
  bookLevel: BookLevel,
  wants: MaterialId[] = [],
  townId?: TownId, // 상인이 있는 마을 → 특산 할인(마을배수) 반영
  recentBuys?: Partial<Record<MaterialId, number>>, // 플레이어 최근 구매량 → 품귀배수 반영
): Promise<PublicMerchant> {
  const derived = deriveMerchant(seed, townId, recentBuys);
  const llm = extractJson<Partial<Persona>>(
    await askText(personaSystem(), personaUser(derived.spec)),
  );
  const fb = fallbackPersona(derived.spec);
  const persona: Persona = {
    name: llm?.name ?? fb.name,
    appearance: llm?.appearance ?? fb.appearance,
    greeting: llm?.greeting ?? fb.greeting,
    personalityTone: llm?.personalityTone ?? fb.personalityTone,
  };
  return buildPublicMerchant(derived, bookLevel, persona, wants);
}
