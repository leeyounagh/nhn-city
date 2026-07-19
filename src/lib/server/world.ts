// 서버 전용 "세계 진실". 매일 6명의 상인이 어느 마을에 있고 무엇을 원하는지를 day seed로 결정론 복원한다.
// 이 진실은 소문 라우트가 조각내어 흘릴 뿐, 통째로 클라이언트에 내보내지 않는다.
import "server-only";
import type { MaterialId, TownId } from "@/types/game";
import { MATERIALS, TOWNS, TOWN_BY_ID } from "@/lib/game-data";
import { deriveMerchant, mulberry32 } from "@/lib/server/economy";

export const MERCHANT_COUNT = 6;

const ALL_MATERIALS: MaterialId[] = MATERIALS.map((m) => m.id);
const TOWN_IDS: TownId[] = TOWNS.map((t) => t.id);

export interface WorldMerchant {
  seed: number; // deriveMerchant seed → 숨은 전문화·성향·자재 복원
  townId: TownId; // 오늘 위치
  wants: MaterialId[]; // 오늘 원하는 물품 (물물교환·추리 축)
  movingTomorrow: boolean; // 내일 다른 마을로 이동하는지
}

export interface WorldDay {
  day: number;
  merchants: WorldMerchant[];
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// 상인마다 고유하고 날마다 바뀌는 seed. 날짜·인덱스를 섞어 결정론적으로 만든다.
function merchantSeed(day: number, i: number): number {
  return (Math.imul(day, 2654435761) ^ Math.imul(i + 1, 40503) ^ 0x5bd1e995) >>> 0;
}

// 상인이 팔지 않는 물품 1~2종을 "원하는 물품"으로 고른다. 상위 티어를 살짝 선호.
function pickWants(rng: () => number, sells: MaterialId[]): MaterialId[] {
  const pool = ALL_MATERIALS.filter((m) => !sells.includes(m));
  const weighted = pool.filter((m) => {
    const tier = MATERIALS.find((x) => x.id === m)!.tier;
    return tier >= 2 ? true : rng() < 0.5; // tier1은 절반 확률로만 후보
  });
  const from = weighted.length > 0 ? weighted : pool;
  const count = rng() < 0.4 ? 2 : 1;
  const wants: MaterialId[] = [];
  for (let k = 0; k < count && from.length > 0; k++) {
    let choice = pick(rng, from);
    while (wants.includes(choice) && wants.length < from.length) choice = pick(rng, from);
    if (!wants.includes(choice)) wants.push(choice);
  }
  return wants;
}

// 하루치 세계 진실. 같은 day면 항상 같은 배치가 나온다.
export function deriveWorld(day: number): WorldDay {
  const rng = mulberry32((Math.imul(day, 0x1000193) ^ 0x811c9dc5) >>> 0);
  const merchants: WorldMerchant[] = [];
  for (let i = 0; i < MERCHANT_COUNT; i++) {
    const seed = merchantSeed(day, i);
    const d = deriveMerchant(seed);
    const sells = d.spec.materials;
    // 업종이 맞는 마을(취급 자재가 특산)에 60% 확률로 배치, 아니면 아무 마을.
    const matchTowns = TOWN_IDS.filter((t) =>
      TOWN_BY_ID[t].specialMaterials.some((m) => sells.includes(m)),
    );
    const townId =
      matchTowns.length > 0 && rng() < 0.6 ? pick(rng, matchTowns) : pick(rng, TOWN_IDS);
    const wants = pickWants(rng, sells);
    const movingTomorrow = rng() < 0.5;
    merchants.push({ seed, townId, wants, movingTomorrow });
  }
  return { day, merchants };
}

// 특정 마을에 오늘 있는 상인들.
export function merchantsInTown(world: WorldDay, townId: TownId): WorldMerchant[] {
  return world.merchants.filter((m) => m.townId === townId);
}
