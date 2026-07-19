// 소문 라우트. 하루치 세계 진실에서 조각 2~3개를 골라 각각 LLM(또는 폴백)으로 한 문장 소문을 만든다.
// 생성 로직은 generateRumors가 소유(/api/town과 공유). 1소문 = 1조각 = LLM 1회 → 인젝션 격리.
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BookLevel, TownId } from "@/types/game";
import { generateRumors } from "@/lib/server/rumor";

const Body = z.object({
  day: z.number().int().min(1),
  town: z.enum(["nw", "ne", "sw", "se"]),
  bookLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { day } = parsed.data;
  const town = parsed.data.town as TownId;
  const bookLevel = parsed.data.bookLevel as BookLevel;

  const rumors = await generateRumors(day, town, bookLevel);
  return NextResponse.json({ rumors });
}
