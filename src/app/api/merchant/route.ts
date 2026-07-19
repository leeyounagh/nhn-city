// 상인 등장 라우트. seed를 굴려 숨은 스펙을 만들고 LLM(또는 폴백) 페르소나를 얹어 공개 뷰만 반환한다.
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BookLevel } from "@/types/game";
import { generatePublicMerchant } from "@/lib/server/merchant";

const Body = z.object({
  bookLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  seed: z.number().int().optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const bookLevel = parsed.data.bookLevel as BookLevel;
  const seed = parsed.data.seed ?? (Math.floor(Math.random() * 0xffffffff) >>> 0);

  const merchant = await generatePublicMerchant(seed, bookLevel);
  return NextResponse.json({ merchant });
}
