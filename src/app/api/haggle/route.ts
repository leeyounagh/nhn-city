// 흥정 판정 라우트. LLM은 발언을 카테고리로 분류만 하고, 호감도·가격은 코드가 계산한다.
import { NextResponse } from "next/server";
import { z } from "zod";
import type { HaggleCategory, HaggleResult, MaterialId } from "@/types/game";
import {
  deriveMerchant,
  priceAt,
  applyCategory,
  initialDisposition,
  barterRatio,
  TOKEN_DISPOSITION,
} from "@/lib/server/economy";
import { deriveWorld } from "@/lib/server/world";
import { askText } from "@/lib/server/llm";
import {
  haggleLineSystem,
  haggleLineUser,
  fallbackCategory,
  fallbackLine,
  fallbackPersona,
  type Persona,
} from "@/lib/server/prompt";
import { MATERIAL_NAME } from "@/lib/game-data";

const QUALITY_ANCHOR = 0.92; // quality 성공 시 offer0 일회성 -8%

const Body = z.object({
  seed: z.number().int(),
  materialId: z.string(),
  utterance: z.string().min(1).max(500),
  disposition: z.number().min(0).max(100).optional(),
  turnsLeft: z.number().int().min(1),
  qualityApplied: z.boolean().default(false),
  tokenAwarded: z.boolean().default(false), // 이번 흥정에서 이미 신표를 받았는지 (1회 제한)
  mode: z.enum(["gold", "barter"]).default("gold"),
  payMaterialId: z.string().optional(), // barter: 지불 물품 (상인 wants 중 하나)
  day: z.number().int().min(1).optional(), // barter: wants 진위 검증용
  recentBuys: z.record(z.string(), z.number()).optional(), // 자재별 최근 구매량 → 품귀배수
  allyHaggleBonus: z.number().min(0).max(100).optional(), // 노상인(지인) perk: 첫 턴 시드 호감도 가산
  persona: z
    .object({
      name: z.string(),
      appearance: z.string(),
      greeting: z.string(),
      personalityTone: z.string(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { seed, utterance, turnsLeft, qualityApplied, tokenAwarded, mode, day, recentBuys } = parsed.data;
  const materialId = parsed.data.materialId as MaterialId;

  // 상인이 오늘 있는 마을 → 특산 할인(마을배수) + 품귀배수를 표시(/api/town)와 동일하게 거래가에도 반영.
  const wm = day !== undefined ? deriveWorld(day).merchants.find((m) => m.seed === seed) : undefined;
  const derived = deriveMerchant(seed, wm?.townId, recentBuys, day);
  const mat = derived.materials.find((m) => m.id === materialId);
  if (!mat) {
    return NextResponse.json({ error: "취급하지 않는 자재" }, { status: 400 });
  }

  // 물물교환이면 대상은 상인이 파는 tier3 희귀템, 지불은 상인이 오늘 원하는 물품이어야 한다.
  let pay: { id: MaterialId; baseN: number; floorN: number } | null = null;
  if (mode === "barter") {
    const payId = parsed.data.payMaterialId as MaterialId | undefined;
    if (mat.tier !== 3) {
      return NextResponse.json({ error: "물물교환은 희귀템만 가능하다" }, { status: 400 });
    }
    if (!payId || !(payId in MATERIAL_NAME) || day === undefined) {
      return NextResponse.json({ error: "잘못된 물물교환 요청" }, { status: 400 });
    }
    if (!wm || !wm.wants.includes(payId)) {
      return NextResponse.json({ error: "상인이 원치 않는 물품" }, { status: 400 });
    }
    const { baseN, floorN } = barterRatio(mat.offer0, mat.floor, payId);
    pay = { id: payId, baseN, floorN };
  }

  // 첫 턴이면 서버가 성향별 초기 호감도를 시드한다 (클라에 노출 안 함).
  // 노상인 perk가 있으면 시드하는 첫 턴에만 가산(2턴+는 클라가 누적 disposition을 넘겨 중복 없음).
  const disposition =
    parsed.data.disposition ??
    Math.min(100, initialDisposition(derived.profile) + (parsed.data.allyHaggleBonus ?? 0));
  const persona: Persona = parsed.data.persona ?? fallbackPersona(derived.spec, seed);

  // 하이브리드: 카테고리는 키워드 분류(결정적·안정 → 가격 로직 신뢰성), 대사만 AI로 생동감 있게(실패 시 정적 폴백).
  const category: HaggleCategory = fallbackCategory(utterance);
  const aiLine = (
    await askText(
      haggleLineSystem(persona, derived.spec, disposition, category),
      haggleLineUser(MATERIAL_NAME[materialId], mat.offer0, utterance),
    )
  )?.trim();
  const line = aiLine || fallbackLine(category, persona, seed, turnsLeft);

  // 코드가 호감도·가격(골드) 또는 교환비(개수)를 계산한다.
  const newDisposition = applyCategory(disposition, category, derived.profile);
  const nextQualityApplied = qualityApplied || category === "quality";
  // 호감도가 임계를 넘고 아직 안 받았으면 상인이 '상인의 신표'를 선물 (흥정 1회당 1개).
  const gotToken = !tokenAwarded && newDisposition >= TOKEN_DISPOSITION;
  // 골드: offer0/floor(골드). 물물교환: 시작N/하한N(개수).
  const base0 = pay ? pay.baseN : mat.offer0;
  const floor0 = pay ? pay.floorN : mat.floor;
  const effectiveOffer0 = nextQualityApplied
    ? Math.max(floor0, Math.round(base0 * QUALITY_ANCHOR))
    : base0;
  const currentPrice = priceAt(effectiveOffer0, floor0, newDisposition);
  const newTurnsLeft = turnsLeft - 1;

  let status: HaggleResult["status"] = "ongoing";
  if (newDisposition <= 0) status = "closed";
  else if (newTurnsLeft <= 0) status = "timeup";

  const result: HaggleResult & { qualityApplied: boolean; gotToken: boolean } = {
    category,
    line,
    disposition: newDisposition,
    currentPrice,
    turnsLeft: Math.max(0, newTurnsLeft),
    status,
    qualityApplied: nextQualityApplied,
    gotToken,
  };
  return NextResponse.json(result);
}
