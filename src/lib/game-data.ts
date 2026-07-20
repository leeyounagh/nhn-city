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
  { id: "token", name: "상인의 신표", tier: 3 }, // 흥정 고호감도로만 획득 (구매 불가)
  { id: "blueprint", name: "대건축가의 설계도", tier: 3 }, // 최고 희귀. 극히 드물게 최고가 판매. 보유 시 장식 배치 해금
];

export const MATERIAL_NAME: Record<string, string> = Object.fromEntries(
  MATERIALS.map((m) => [m.id, m.name]),
);

// 스프라이트 렌더 크기 배수 (기본 1). 과도하게 큰 스프라이트 축소용 (홈맵·마을 미리보기 공통).
export const BUILDING_RENDER_SCALE: Record<string, number> = {
  warehouse: 0.6,
  tent: 0.25,
  tent2: 0.25,
  well: 0.3,
  tree: 0.2,
  tree2: 0.2,
  platform: 1.8,
  statue: 0.5,
  // 시골 마을(무쇠고개) 스프라이트
  church: 1.15,
  house: 0.75,
  house2: 0.75,
  barn: 0.9,
  graveyard: 0.8,
  orchard: 1.7,
  lamp: 0.45,
  tree3: 0.6,
  fence: 0.5, // 긴 레일이라 타일 밖으로 삐져나오지 않게 축소
  // 베틀마을(직물) 시장 스프라이트
  stall: 0.55,
  tavern: 1.1,
  shop: 0.85,
  marketplaza: 1.5, // 멀티타일 시장광장
  marketbuilding: 0.95,
  storeshed: 0.7,
  guardtower2: 0.7,
  shop2: 0.85,
  pavilion: 0.8,
  // 타워 (Towers 팩)
  tower: 0.75,
  bastion: 0.72,
  keeptower: 1.0,
  belltower: 0.85,
  // 시장 확장 (Shops Markets 팩)
  markethouse: 0.9,
  markethall: 0.85,
  produce: 0.6,
  grandmarket: 1.5,
  bazaar: 1.6,
};

// 마을 대표 썸네일 (이름 앞 아이콘 = 이모지 대신 대표 건물 스프라이트).
export const TOWN_ICON: Record<TownId, string> = {
  nw: "mill", // 삼목골 · 임업 (제재소)
  ne: "church", // 무쇠고개 · 석조 교회 마을
  sw: "stall", // 베틀마을 · 직물 장터
  se: "castle", // 유리섬 · 성벽 요새
};

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
  { id: "manor", name: "영주관", requires: { marble: 6, brick: 10, stainedglass: 2, bronze: 3, token: 1 }, income: 40, xp: 30, prereq: ["guildhall"], minBook: 3 },
  { id: "cathedral", name: "대성당", requires: { marble: 8, stainedglass: 4, bronze: 3, relic: 2, token: 1 }, income: 25, xp: 35, prereq: ["chapel", "manor"], minBook: 3 },
  // 상업 (Shops Markets 팩) — 완공 시 골드 수입을 주는 상점·시장 건물
  { id: "storeshed", name: "곳간", requires: { wood: 4, planks: 2 }, income: 5, xp: 10, prereq: ["warehouse"] },
  { id: "stall", name: "노점", requires: { planks: 2, cloth: 2 }, income: 10, xp: 12, prereq: ["hut"] },
  { id: "pavilion", name: "장옥", requires: { planks: 4, brick: 2, cloth: 3 }, income: 16, xp: 16, prereq: ["market"], minBook: 2 },
  { id: "shop", name: "상점", requires: { planks: 4, brick: 3, glass: 2 }, income: 18, xp: 18, prereq: ["market"], minBook: 2 },
  { id: "shop2", name: "잡화점", requires: { planks: 3, brick: 4, cloth: 3 }, income: 17, xp: 18, prereq: ["market"], minBook: 2 },
  { id: "tavern", name: "선술집", requires: { planks: 6, brick: 5, cloth: 4 }, income: 26, xp: 22, prereq: ["inn"], minBook: 2 },
  { id: "marketbuilding", name: "교역소", requires: { planks: 8, glass: 5, marble: 2, bronze: 1 }, income: 34, xp: 26, prereq: ["market", "shop"], minBook: 3 },
  { id: "produce", name: "청과 가판", requires: { planks: 2, cloth: 1 }, income: 9, xp: 11, prereq: ["hut"] },
  { id: "markethall", name: "장터 회랑", requires: { planks: 5, brick: 3, cloth: 3 }, income: 19, xp: 18, prereq: ["market"], minBook: 2 },
  { id: "markethouse", name: "시장 상가", requires: { planks: 6, brick: 5, glass: 3 }, income: 24, xp: 22, prereq: ["market", "shop"], minBook: 2 },
  { id: "marketplaza", name: "시장 광장", requires: { planks: 8, brick: 6, glass: 4, marble: 2 }, income: 30, xp: 26, prereq: ["market"], minBook: 3 },
  { id: "grandmarket", name: "대시장", requires: { planks: 10, glass: 6, marble: 3, bronze: 2 }, income: 36, xp: 28, prereq: ["market", "shop"], minBook: 3 },
  { id: "bazaar", name: "대장터", requires: { planks: 12, glass: 8, marble: 4, bronze: 3 }, income: 40, xp: 30, prereq: ["market", "shop"], minBook: 3 },
  // 방어·상징 타워 (Towers 팩)
  { id: "tower", name: "석조 망루", requires: { stone: 8, brick: 5, steel: 3 }, income: 10, xp: 24, prereq: ["wall"], minBook: 2 },
  { id: "belltower", name: "종탑", requires: { brick: 6, marble: 3, bronze: 3 }, income: 14, xp: 24, prereq: ["chapel"], minBook: 3 },
  { id: "bastion", name: "원형 보루", requires: { stone: 10, brick: 6, steel: 4, bronze: 2 }, income: 12, xp: 26, prereq: ["watchtower"], minBook: 3 },
  { id: "keeptower", name: "성탑", requires: { stone: 12, marble: 5, steel: 6, bronze: 3 }, income: 20, xp: 30, prereq: ["watchtower"], minBook: 3 },
  // 장식 (「대건축가의 설계도」 보유 시 해금 — 자재 불필요·즉시완공·수입0). 바닥(flat)은 지면으로 렌더.
  { id: "floor_grass", name: "잔디 바닥", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "floor_stone", name: "돌 바닥", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "floor_dirt", name: "흙 바닥", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "floor_path", name: "자갈길", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "wallpiece", name: "성벽 조각", requires: {}, income: 0, xp: 0, prereq: [], deco: true },
  { id: "gate", name: "성문", requires: {}, income: 0, xp: 0, prereq: [], deco: true },
  { id: "fence", name: "울타리", requires: {}, income: 0, xp: 0, prereq: [], deco: true },
];

// 경험치 누적으로 마법의 책이 오르는 임계치
export const BOOK_XP_THRESHOLDS = [0, 30, 60]; // Lv1=0, Lv2=30, Lv3=60

export const BOOK_LEVEL_DESC: Record<number, string> = {
  1: "취급 자재만 보인다.",
  2: "상인의 성향과 대략적인 가격대가 보인다.",
  3: "약점과 하한가 근사치가 보이고, 고물상의 옛 문명 부품을 거래할 수 있다.",
};
