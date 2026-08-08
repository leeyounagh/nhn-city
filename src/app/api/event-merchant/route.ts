// 떠돌이 상인 이벤트 라우트. 그날 월드에서 tier3 희귀템을 파는 실상인 1명을 결정론적으로 골라
// "떠돌이 상인" 스킨(이름·초상화·AI 인사)을 입혀 반환한다. seed·materials·wants는 실상인 그대로라
// 이어지는 /api/haggle(물물교환) 검증을 그대로 통과한다(안티치트 무변경).
import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BookLevel, MaterialId, PublicMerchant } from "@/types/game";
import { deriveWorld } from "@/lib/server/world";
import { deriveMerchant, buildPublicMerchant, mulberry32 } from "@/lib/server/economy";
import { askText } from "@/lib/server/llm";
import { fallbackPersona } from "@/lib/server/prompt";

// 미사용 초상화 12장 중 "떠돌이/행상" 느낌 4장을 풀로. 등장 때마다 얼굴이 바뀐다(같은 떠돌이 상인 컨셉).
const WANDERER_PORTRAITS = ["general-6", "general-5", "junker-6", "junker-5"];
const WANDERER_APPEARANCE: Record<string, string> = {
  "general-6": "챙 넓은 모자에 흰 수염을 기른 노년의 행상, 봇짐 가득 잡화를 짊어졌다",
  "general-5": "장신구를 주렁주렁 단 젊은 행상, 손을 내밀며 씩 웃는다",
  "junker-6": "고글을 올린 늙은 고물 행상, 온갖 자잘한 물건을 둘렀다",
  "junker-5": "머리를 질끈 묶은 고물 행상, 자루를 안고 능글맞게 웃는다",
};
const WANDERER_TONE = "능글맞고 과장된 떠돌이 장사꾼. 오래 봐온 듯 친근하게 굴며 '훌륭한 물건'을 권한다";
const FALLBACK_GREETINGS = [
  "주인, 안녕하냐해? 나, 떠돌이 상인. 이 험한 길 뚫고 훌륭한 물건 팔러 왔다해!",
  "허허, 폐허를 다시 세운다는 소문 듣고 찾아왔수다. 귀한 물건 하나 있는데, 볼 텐가?",
  "어이 젊은 주인장! 발품 팔아 구해 온 진품이 있다네. 딱 한 번만 보고 가시게.",
];

// tier3가 지금 거래 가능한가(relic/blueprint는 책 Lv3부터). buildPublicMerchant의 lock 규칙과 동일.
function tradeableTier3(id: MaterialId, tier: number, bookLevel: BookLevel): boolean {
  if (tier !== 3) return false;
  if ((id === "relic" || id === "blueprint") && bookLevel < 3) return false;
  return true;
}

const Body = z.object({
  day: z.number().int().min(1),
  bookLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  recentBuys: z.record(z.string(), z.number()).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  const { day, recentBuys } = parsed.data;
  const bookLevel = parsed.data.bookLevel as BookLevel;

  // 그날 월드에서 "거래 가능한 tier3를 파는" 상인 후보를 모은다.
  const world = deriveWorld(day);
  const candidates = world.merchants
    .map((wm) => {
      const derived = deriveMerchant(wm.seed, wm.townId, recentBuys, day);
      const rares = derived.materials.filter((m) => tradeableTier3(m.id, m.tier, bookLevel));
      return rares.length > 0 && wm.wants.length > 0 ? { wm, derived, rares } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (candidates.length === 0) return NextResponse.json({ merchant: null });

  // 결정론 선택(같은 날 = 같은 떠돌이 상인·희귀템·초상화).
  const rng = mulberry32(day * 7919 + 101);
  const cand = candidates[Math.floor(rng() * candidates.length)];
  const rare = cand.rares[Math.floor(rng() * cand.rares.length)];
  const payId = cand.wm.wants[Math.floor(rng() * cand.wm.wants.length)];
  const portrait = WANDERER_PORTRAITS[Math.floor(rng() * WANDERER_PORTRAITS.length)];

  // 떠돌이 인사 — AI 생성 시도, 실패/무키 시 폴백 풀.
  let greeting = FALLBACK_GREETINGS[Math.floor(rng() * FALLBACK_GREETINGS.length)];
  try {
    const ai = await askText(
      "너는 폐허가 된 세계를 떠도는 행상이다. 능글맞고 과장된 장사꾼 말투로 짧게 말한다.",
      `떠돌이 상인이 재건 중인 주인공의 고향에 갑자기 나타나 희귀한 물건을 권유하는 첫 인사 한 문장을 한국어로. 20~45자, 따옴표 없이.`,
    );
    const line = (ai ?? "").split("\n")[0].replace(/^["'\s]+|["'\s]+$/g, "").trim();
    if (line.length >= 6 && line.length <= 80) greeting = line;
  } catch {
    // 폴백 유지.
  }

  const fb = fallbackPersona(cand.derived.spec, cand.wm.seed);
  const persona = {
    name: "떠돌이 상인",
    appearance: WANDERER_APPEARANCE[portrait] ?? fb.appearance,
    greeting,
    personalityTone: WANDERER_TONE,
  };

  const pub: PublicMerchant = buildPublicMerchant(cand.derived, bookLevel, persona, cand.wm.wants);
  pub.title = "떠돌이 상인";
  pub.portrait = "general"; // 이모지 폴백 키
  pub.portraitFile = portrait;

  return NextResponse.json({ merchant: pub, rareId: rare.id, payId });
}
