// 아침 시황 뉴스 라우트. 날짜 하나로 그날의 이벤트 서술 + 헤드라인을 반환한다(하루 1회 표시용).
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateNews } from "@/lib/server/news";

const Body = z.object({ day: z.number().int().min(1) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  return NextResponse.json(await generateNews(parsed.data.day));
}
