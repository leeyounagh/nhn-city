// 마법의 책 조언 라우트. 책 레벨로 걸러진 상인 성향(+Lv3 약점)을 LLM이 인게임 조언으로 읊는다.
// 판정·수치는 코드가 소유하고, 여기선 톤만 생성한다. 키 없으면 템플릿 폴백.
import { NextResponse } from "next/server";
import { z } from "zod";
import { deriveMerchant, getProfileHint, getWeaknessHint } from "@/lib/server/economy";
import { askText } from "@/lib/server/llm";
import { bookAdviceSystem, bookAdviceUser, fallbackBookAdvice } from "@/lib/server/prompt";

const Body = z.object({
  seed: z.number().int(),
  bookLevel: z.number().int().min(1).max(3),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { seed, bookLevel } = parsed.data;
  // 책 Lv2 미만이면 아직 읽어낼 게 없다.
  if (bookLevel < 2) return NextResponse.json({ advice: null });

  const derived = deriveMerchant(seed);
  const profileHint = getProfileHint(derived.profile);
  // 약점은 Lv3에서만 넘긴다(레벨 게이팅). Lv2는 성정만으로 조언.
  const weaknessHint = bookLevel >= 3 ? getWeaknessHint(derived.profile) : undefined;

  const raw = await askText(
    bookAdviceSystem(),
    bookAdviceUser(derived.spec.title, derived.spec.tone, profileHint, weaknessHint),
    200,
  );
  // LLM이 따옴표로 감싸는 경우 제거. 실패 시 템플릿 폴백.
  const advice = raw?.trim().replace(/^["'“”]+|["'“”]+$/g, "") || fallbackBookAdvice(profileHint, weaknessHint);
  return NextResponse.json({ advice });
}
