// 시세 그래프 라우트. 마법의 책 Lv.1 — 자재별 하루평균 시장 시세를 과거 N일치로 반환한다.
// 결정론(day 기반). 하한가·상인 약점은 노출하지 않으므로 흥정 무결성과 무관.
import { NextResponse } from "next/server";
import { z } from "zod";
import { MATERIALS, MATERIAL_NAME } from "@/lib/game-data";
import { avgMarketPrice } from "@/lib/server/economy";

const Body = z.object({
  day: z.number().int().min(1),
  days: z.number().int().min(2).max(60).default(14),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { day, days } = parsed.data;

  const from = Math.max(1, day - days + 1);
  const dayLabels: number[] = [];
  for (let d = from; d <= day; d++) dayLabels.push(d);

  // 신표·설계도는 시장 거래 대상이 아니라 제외.
  const points = MATERIALS.filter((m) => m.id !== "token" && m.id !== "blueprint").map((m) => ({
    id: m.id,
    name: MATERIAL_NAME[m.id],
    tier: m.tier,
    series: dayLabels.map((d) => avgMarketPrice(d, m.id)),
  }));

  return NextResponse.json({ dayLabels, points });
}
