// 지인 합류 대사 라우트. 지인의 역할·외형을 AI가 합류 인사로 연기한다. 키 없으면 정적 폴백.
// 판정·수치(perk·임계)는 코드 소유 — 여기선 대사 톤만 생성(2레이어).
import { NextResponse } from "next/server";
import { z } from "zod";
import { askText } from "@/lib/server/llm";
import { allyById } from "@/lib/allies";

const Body = z.object({ id: z.string(), deed: z.string().optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const ally = allyById(parsed.data.id);
  if (!ally) return NextResponse.json({ error: "없는 지인" }, { status: 404 });

  const deed = parsed.data.deed;
  const system = deed
    ? "너는 후계자의 조력자다. 세계관은 다크 판타지. 방금 도시를 위해 한 일을 그 인물의 말투로 한국어 1문장으로 건넨다. 게임 수치·메타 언급 금지. 따옴표 없이 대사만."
    : "너는 폐허가 된 고향을 재건하는 후계자에게 합류하는 조력자다. 세계관은 다크 판타지. 그 인물의 역할·성격이 드러나는 합류 인사를 한국어 1~2문장으로 말하라. 게임 수치·메타 언급 금지. 따옴표 없이 대사만.";
  const user = deed
    ? `역할: ${ally.role}\n외형: ${ally.appearance}\n방금 한 일: ${deed}`
    : `역할: ${ally.role}\n이름: ${ally.name}\n외형: ${ally.appearance}\n상황: 도시 인구가 늘어 이 인물이 후계자를 도우러 합류한다.`;

  const raw = await askText(system, user, deed ? 120 : 160);
  const line = raw?.trim().replace(/^["'“”]+|["'“”]+$/g, "");
  // 폴백: 합류는 정적 인사, 조력은 짧은 기본 대사.
  const greeting = line || (deed ? "그대의 도시를 위해서라면 이쯤이야." : ally.greeting);
  return NextResponse.json({ greeting });
}
