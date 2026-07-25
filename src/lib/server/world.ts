// 서버 전용 "세계 진실". 매일 6명의 상인이 어느 마을에 있고 무엇을 원하는지를 day seed로 결정론 복원한다.
// 이 진실은 소문 라우트가 조각내어 흘릴 뿐, 통째로 클라이언트에 내보내지 않는다.
import "server-only";
import type { MaterialId, TownId } from "@/types/game";
import { MATERIALS, TOWNS, TOWN_BY_ID } from "@/lib/game-data";
import { deriveMerchant, mulberry32, MERCHANTS } from "@/lib/server/economy";

export const MERCHANT_COUNT = 6;
// 상인은 이 날수만큼 한 마을에 머문다(묶음 단위 배치). 최대 이동일(3) < 5 이라 소문 보고 이동해도 도착 시 그대로.
export const STAY_DAYS = 5;

const ALL_MATERIALS: MaterialId[] = MATERIALS.map((m) => m.id);
const TOWN_IDS: TownId[] = TOWNS.map((t) => t.id);

export interface WorldMerchant {
  id: number; // 영구 상인 정체성 id (0~23) — 호감도·페르소나 캐시 키
  seed: number; // deriveMerchant seed → 숨은 전문화·성향·자재 복원
  townId: TownId; // 오늘 위치
  wants: MaterialId[]; // 오늘 원하는 물품 (물물교환·추리 축)
  movingTomorrow: boolean; // 내일 이 마을을 떠나는지 (체류 마지막 날)
  daysLeft: number; // 남은 체류일 (소문 위치 필터용: 이동일보다 짧으면 위치를 안 흘린다)
}

export interface WorldDay {
  day: number;
  merchants: WorldMerchant[];
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// 상인이 팔지 않는 물품 1~2종을 "원하는 물품"으로 고른다. 상위 티어를 살짝 선호.
function pickWants(rng: () => number, sells: MaterialId[]): MaterialId[] {
  const pool = ALL_MATERIALS.filter((m) => m !== "token" && m !== "blueprint" && !sells.includes(m));
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

// 세계 진실. 6개 "슬롯"이 각각 상인 4명(id%6===s)을 STAY_DAYS일씩 순환시킨다(슬라이딩 체류).
// 슬롯마다 offset s로 교체일을 어긋내 → 남은 체류일(daysLeft)이 분산 → 매일 "오래 머물 상인"이 있어
// 위치 소문이 끊기지 않고, 그 상인은 이동해도(최대 3일) 도착 시 그대로 있다.
// 슬롯끼리 상인 그룹이 겹치지 않아 하루 6명은 항상 서로 다른 정체성.
export function deriveWorld(day: number): WorldDay {
  const merchants: WorldMerchant[] = [];
  for (let s = 0; s < MERCHANT_COUNT; s++) {
    const group = MERCHANTS.filter((m) => m.id % MERCHANT_COUNT === s); // 이 슬롯이 순환시킬 4명
    const gen = Math.floor((day - 1 + s) / STAY_DAYS); // 체류 세대 (offset s로 슬롯마다 교체 분산)
    const idn = group[gen % group.length];
    const rng = mulberry32((Math.imul(gen + 1, 2654435761) ^ Math.imul(s + 1, 40503)) >>> 0);
    const sells = deriveMerchant(idn.seed).spec.materials;
    // 업종이 맞는 마을(취급 자재가 특산)에 60% 확률로 배치, 아니면 아무 마을.
    const matchTowns = TOWN_IDS.filter((t) =>
      TOWN_BY_ID[t].specialMaterials.some((m) => sells.includes(m)),
    );
    const townId =
      matchTowns.length > 0 && rng() < 0.6 ? pick(rng, matchTowns) : pick(rng, TOWN_IDS);
    const wants = pickWants(rng, sells);
    const daysLeft = STAY_DAYS - ((day - 1 + s) % STAY_DAYS); // 남은 체류일 (5→1)
    merchants.push({ id: idn.id, seed: idn.seed, townId, wants, movingTomorrow: daysLeft === 1, daysLeft });
  }
  return { day, merchants };
}

// 특정 마을에 오늘 있는 상인들.
export function merchantsInTown(world: WorldDay, townId: TownId): WorldMerchant[] {
  return world.merchants.filter((m) => m.townId === townId);
}
