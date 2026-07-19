// 마을 진입 라우트. 오늘 그 마을에 있는 상인 목록 + 그 마을에서 들리는 소문을 한 번에 반환한다.
// 상인 seed는 세계 진실에서 결정론적으로 나오므로 흥정(/api/haggle)은 seed로 그대로 이어진다.
import { NextResponse } from "next/server";
import { z } from "zod";
import type { BookLevel, PublicMerchant, TownId } from "@/types/game";
import { deriveWorld, merchantsInTown } from "@/lib/server/world";
import { generatePublicMerchant } from "@/lib/server/merchant";
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

  const here = merchantsInTown(deriveWorld(day), town);

  const [merchants, rumors] = await Promise.all([
    Promise.all(here.map((wm) => generatePublicMerchant(wm.seed, bookLevel, wm.wants))) as Promise<
      PublicMerchant[]
    >,
    generateRumors(day, town, bookLevel),
  ]);

  return NextResponse.json({ merchants, rumors });
}
