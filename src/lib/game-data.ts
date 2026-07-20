// 클라이언트에 공개해도 되는 게임 데이터 (자재 표시 정보·건물·상수). 가격 원본·상인 성향은 여기 없다.
import type { BuildingDef, LocationId, MaterialMeta, TownMeta, TownId } from "@/types/game";

export const STARTING_GOLD = 400;
export const HAGGLE_TURNS = 5;
export const MAX_BOOK_LEVEL = 3;

export const MATERIALS: MaterialMeta[] = [
  { id: "wood", name: "목재", tier: 1 },
  { id: "stone", name: "석재", tier: 1 },
  { id: "clay", name: "점토", tier: 1 },
  { id: "scrap", name: "고철", tier: 1 },
  { id: "planks", name: "판자", tier: 2 },
  { id: "brick", name: "벽돌", tier: 2 },
  { id: "glass", name: "유리", tier: 2 },
  { id: "steel", name: "강철", tier: 2 },
  { id: "cloth", name: "천·밧줄", tier: 2 },
  { id: "marble", name: "대리석", tier: 3 },
  { id: "bronze", name: "청동", tier: 3 },
  { id: "stainedglass", name: "스테인드글라스", tier: 3 },
  { id: "relic", name: "옛 문명의 부품", tier: 3 },
];

export const MATERIAL_NAME: Record<string, string> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m.name]),
);

// 4마을 월드맵. 각 마을은 대표 업종 하나를 지녀 그 업종 물품이 싸고 풍부하다(P3 시세 반영).
// 이동일수 인접표는 양방향 대칭으로 정의한다.
export const TOWNS: TownMeta[] = [
  {
    id: "nw",
    name: "삼목골",
    industry: "forestry",
    industryName: "임업",
    specialMaterials: ["wood", "planks"],
    neighbors: { sw: 1, ne: 2, se: 3 },
  },
  {
    id: "ne",
    name: "무쇠고개",
    industry: "mining",
    industryName: "광업",
    specialMaterials: ["stone", "steel", "bronze", "marble", "scrap"],
    neighbors: { nw: 2, se: 2, sw: 3 },
  },
  {
    id: "sw",
    name: "베틀마을",
    industry: "textile",
    industryName: "직물",
    specialMaterials: ["cloth", "clay", "brick"],
    neighbors: { nw: 1, se: 2, ne: 3 },
  },
  {
    id: "se",
    name: "유리섬",
    industry: "glasswork",
    industryName: "유리세공",
    specialMaterials: ["glass", "stainedglass"],
    neighbors: { ne: 2, sw: 2, nw: 3 },
  },
];

export const TOWN_BY_ID: Record<TownId, TownMeta> = Object.fromEntries(
  TOWNS.map((t) => [t.id, t]),
) as Record<TownId, TownMeta>;

// 재건 대상인 폐허 고향. 상인·업종은 없고 건설만 한다. 4마을과는 각각 1일 거리(허브).
export const HOME_NAME = "폐허가 된 고향";
const HOME_NEIGHBORS: Record<TownId, number> = { nw: 1, ne: 2, sw: 2, se: 3 };

// 위치 표시명 (월드맵·이동 안내용).
export function locationName(id: LocationId): string {
  return id === "home" ? HOME_NAME : TOWN_BY_ID[id].name;
}

// 위치 간 이동일수 (같은 곳=0, home은 4마을과 1일, 마을 인접표 없으면 기본 2).
export function travelDays(from: LocationId, to: LocationId): number {
  if (from === to) return 0;
  if (from === "home") return HOME_NEIGHBORS[to as TownId];
  if (to === "home") return HOME_NEIGHBORS[from as TownId];
  return TOWN_BY_ID[from].neighbors[to as TownId] ?? 2;
}

export const BUILDINGS: BuildingDef[] = [
  // T0 기초 (선행 없음)
  { id: "hut", name: "오두막", requires: { wood: 5, stone: 3 }, income: 8, xp: 10, prereq: [] },
  { id: "well", name: "우물", requires: { stone: 6, scrap: 3 }, income: 3, xp: 8, prereq: [] },
  { id: "warehouse", name: "창고", requires: { wood: 4, clay: 4, scrap: 2 }, income: 5, xp: 10, prereq: [] },
  // T1 생활 (방앗간·대장간 = 첫 생산 건물 → tier2 자재 자급 시작)
  { id: "mill", name: "방앗간", requires: { wood: 6, stone: 4, cloth: 2 }, income: 14, xp: 15, prereq: ["hut", "well"], produces: { cloth: 1 } },
  { id: "smithy", name: "대장간", requires: { stone: 5, scrap: 4, steel: 3 }, income: 12, xp: 15, prereq: ["warehouse", "well"], produces: { steel: 1 } },
  { id: "inn", name: "여관", requires: { planks: 5, brick: 4, cloth: 3 }, income: 20, xp: 18, prereq: ["hut", "warehouse"] },
  // T2 발전 (책 Lv2)
  { id: "market", name: "시장", requires: { planks: 5, cloth: 4, glass: 3 }, income: 22, xp: 20, prereq: ["mill", "inn"], minBook: 2 },
  { id: "workshop", name: "작업장", requires: { planks: 6, brick: 5, steel: 3 }, income: 16, xp: 20, prereq: ["smithy"], minBook: 2, produces: { planks: 2 } },
  { id: "chapel", name: "예배당", requires: { brick: 6, glass: 4, bronze: 2 }, income: 6, xp: 22, prereq: ["inn"], minBook: 2 },
  // T3 권위·방어
  { id: "wall", name: "성벽", requires: { stone: 10, brick: 8, steel: 5 }, income: 5, xp: 25, prereq: ["workshop"], minBook: 2 },
  { id: "watchtower", name: "망루", requires: { stone: 8, steel: 5, bronze: 2 }, income: 10, xp: 25, prereq: ["wall"], minBook: 3 },
  { id: "guildhall", name: "길드회관", requires: { marble: 4, planks: 8, glass: 5 }, income: 30, xp: 28, prereq: ["market", "workshop"], minBook: 3, produces: { marble: 1 } },
  // T4 대업 (대성당은 목표가 아니라 최고난도 건물)
  { id: "manor", name: "영주관", requires: { marble: 6, brick: 10, stainedglass: 2, bronze: 3 }, income: 40, xp: 30, prereq: ["guildhall"], minBook: 3 },
  { id: "cathedral", name: "대성당", requires: { marble: 8, stainedglass: 4, bronze: 3, relic: 2 }, income: 25, xp: 35, prereq: ["chapel", "manor"], minBook: 3 },
];

// 경험치 누적으로 마법의 책이 오르는 임계치
export const BOOK_XP_THRESHOLDS = [0, 30, 60]; // Lv1=0, Lv2=30, Lv3=60

export const BOOK_LEVEL_DESC: Record<number, string> = {
  1: "취급 자재만 보인다.",
  2: "상인의 성향과 대략적인 가격대가 보인다.",
  3: "약점과 하한가 근사치가 보이고, 고물상의 옛 문명 부품을 거래할 수 있다.",
};
