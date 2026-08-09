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
  { id: "rope", name: "밧줄", tier: 1 },
  { id: "planks", name: "판자", tier: 2 },
  { id: "brick", name: "벽돌", tier: 2 },
  { id: "glass", name: "유리", tier: 2 },
  { id: "steel", name: "강철", tier: 2 },
  { id: "cloth", name: "천", tier: 2 },
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
  // 고향 장식 트리 (팩 Isometric Realm — Medieval / Trees, tree4~tree12)
  tree4: 0.5,
  tree5: 0.5,
  tree6: 0.55,
  tree7: 0.5,
  tree8: 0.5,
  tree9: 0.55,
  tree10: 0.5,
  tree11: 0.55,
  tree12: 0.5,
  // 건축 장식 (팩 Architecture) — 원본 크기 편차가 커 개별 스케일.
  arch1: 0.5,
  arch2: 0.5,
  block1: 0.55,
  block2: 0.7,
  bridge1: 0.95,
  buttress1: 0.55,
  cairn1: 0.4,
  guardshack1: 0.5,
  platform_a: 1.2,
  square1: 0.6,
  statue1: 0.45,
  rubble1: 0.3,
  rubble2: 0.3,
  stonecircle1: 1.0,
  towertop1: 0.6,
  // 농장 (팩 Barns Stables)
  barn_01: 0.9,
  barn_02: 1.0,
  barn_03: 0.7,
  barn_04: 0.8,
  barn_05: 0.7,
  barn_06: 0.85,
  barn_07: 0.75,
  stables_01: 1.0,
  stables_02: 0.85,
  stables_03: 0.85,
  stables_04: 0.95,
  // 군사 (팩 Barracks)
  barracks_01: 0.95,
  barracks_02: 1.05,
  barracks_03: 1.0,
  barracks_04: 1.05,
  barracks_05: 0.9,
  barracks_06: 1.0,
  camp_01: 0.8,
  camp_02: 0.8,
  guardhouse_01: 0.8,
  guardhouse_02: 0.8,
  guardhouse_03: 0.75,
  // 공방 (팩 Blacksmiths) + 소품(모루·물통)
  blacksmith_01: 0.95,
  blacksmith_02: 0.85,
  blacksmith_03: 0.85,
  kiln_01: 0.5,
  workshop_02: 0.9,
  workshop_03: 0.9,
  anvil_01: 0.3,
  trough_01: 0.3,
  // 농지 직립 소품 (밭 field는 flat이라 스케일 불필요 — 타일 지면에 렌더)
  crop_01: 0.35,
  orchard_a: 1.1,
  orchard_b: 1.1,
  yard_01: 1.0,
  yard_02: 1.0,
  yard_03: 1.0,
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
    specialMaterials: ["cloth", "clay", "brick", "rope"],
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
  { id: "hut", name: "오두막", requires: { wood: 5 }, income: 8, xp: 10, prereq: [] }, // 첫 건물: 단일 자재(나무) = 최근접 1마을 1회 왕복으로 완공 → 초반 템포 개선
  { id: "well", name: "우물", requires: { stone: 6, scrap: 3, rope: 2 }, income: 3, xp: 8, prereq: [] },
  { id: "warehouse", name: "창고", requires: { wood: 4, clay: 4, scrap: 2 }, income: 5, xp: 10, prereq: [] },
  // T1 생활 (방앗간·대장간 = 첫 생산 건물 → tier2 자재 자급 시작)
  { id: "mill", name: "방앗간", requires: { wood: 6, stone: 4, cloth: 2 }, income: 14, xp: 15, prereq: ["hut", "well"], produces: { cloth: 1 } },
  { id: "smithy", name: "대장간", requires: { stone: 5, scrap: 4, steel: 3 }, income: 12, xp: 15, prereq: ["warehouse", "well"], produces: { steel: 1, bronze: 1 } },
  { id: "inn", name: "여관", requires: { planks: 5, brick: 4, cloth: 3 }, income: 20, xp: 18, prereq: ["hut", "warehouse"] },
  // T2 발전 (책 Lv2)
  { id: "market", name: "시장", requires: { planks: 5, cloth: 4, glass: 3, rope: 2 }, income: 22, xp: 20, prereq: ["mill", "inn"], minBook: 2, produces: { glass: 1 } },
  { id: "workshop", name: "작업장", requires: { planks: 6, brick: 5, steel: 3 }, income: 16, xp: 20, prereq: ["smithy"], minBook: 2, produces: { planks: 2, brick: 1 } },
  { id: "chapel", name: "예배당", requires: { brick: 6, glass: 4, bronze: 2 }, income: 6, xp: 22, prereq: ["inn"], minBook: 2, produces: { stainedglass: 1 } },
  // T3 권위·방어
  { id: "wall", name: "성벽", requires: { stone: 10, brick: 8, steel: 5, rope: 3 }, income: 5, xp: 25, prereq: ["workshop"], minBook: 2 },
  { id: "watchtower", name: "망루", requires: { stone: 8, steel: 5, bronze: 2, rope: 2 }, income: 10, xp: 25, prereq: ["wall"], minBook: 3 },
  { id: "guildhall", name: "길드회관", requires: { marble: 4, planks: 8, glass: 5 }, income: 30, xp: 28, prereq: ["market", "workshop"], minBook: 3, produces: { marble: 1 } },
  // T4 대업 (대성당은 목표가 아니라 최고난도 건물)
  { id: "manor", name: "영주관", requires: { marble: 6, brick: 10, stainedglass: 2, bronze: 3, token: 1 }, income: 40, xp: 30, prereq: ["guildhall"], minBook: 3 },
  { id: "cathedral", name: "대성당", requires: { marble: 8, stainedglass: 4, bronze: 3, relic: 2, token: 1 }, income: 25, xp: 35, prereq: ["chapel", "manor"], minBook: 3 },
  // 상업 (Shops Markets 팩) — 완공 시 골드 수입을 주는 상점·시장 건물
  { id: "storeshed", name: "곳간", requires: { wood: 4, planks: 2 }, income: 5, xp: 10, prereq: ["warehouse"], category: "commerce" },
  { id: "stall", name: "노점", requires: { planks: 2, cloth: 2, rope: 1 }, income: 10, xp: 12, prereq: ["hut"], category: "commerce" },
  { id: "pavilion", name: "장옥", requires: { planks: 4, brick: 2, cloth: 3 }, income: 16, xp: 16, prereq: ["market"], minBook: 2, category: "commerce" },
  { id: "shop", name: "상점", requires: { planks: 4, brick: 3, glass: 2 }, income: 18, xp: 18, prereq: ["market"], minBook: 2, category: "commerce" },
  { id: "shop2", name: "잡화점", requires: { planks: 3, brick: 4, cloth: 3 }, income: 17, xp: 18, prereq: ["market"], minBook: 2, category: "commerce" },
  { id: "tavern", name: "선술집", requires: { planks: 6, brick: 5, cloth: 4 }, income: 26, xp: 22, prereq: ["inn"], minBook: 2, category: "commerce" },
  { id: "marketbuilding", name: "교역소", requires: { planks: 8, glass: 5, marble: 2, bronze: 1 }, income: 34, xp: 26, prereq: ["market", "shop"], minBook: 3, category: "commerce" },
  { id: "produce", name: "청과 가판", requires: { planks: 2, cloth: 1 }, income: 9, xp: 11, prereq: ["hut"], category: "commerce" },
  { id: "markethall", name: "장터 회랑", requires: { planks: 5, brick: 3, cloth: 3 }, income: 19, xp: 18, prereq: ["market"], minBook: 2, category: "commerce" },
  { id: "markethouse", name: "시장 상가", requires: { planks: 6, brick: 5, glass: 3 }, income: 24, xp: 22, prereq: ["market", "shop"], minBook: 2, category: "commerce" },
  { id: "marketplaza", name: "시장 광장", requires: { planks: 8, brick: 6, glass: 4, marble: 2 }, income: 30, xp: 26, prereq: ["market"], minBook: 3, category: "commerce" },
  { id: "grandmarket", name: "대시장", requires: { planks: 10, glass: 6, marble: 3, bronze: 2 }, income: 36, xp: 28, prereq: ["market", "shop"], minBook: 3, category: "commerce" },
  { id: "bazaar", name: "대장터", requires: { planks: 12, glass: 8, marble: 4, bronze: 3 }, income: 40, xp: 30, prereq: ["market", "shop"], minBook: 3, category: "commerce" },
  // 방어·상징 타워 (Towers 팩)
  { id: "tower", name: "석조 망루", requires: { stone: 8, brick: 5, steel: 3 }, income: 10, xp: 24, prereq: ["wall"], minBook: 2, category: "tower" },
  { id: "belltower", name: "종탑", requires: { brick: 6, marble: 3, bronze: 3 }, income: 14, xp: 24, prereq: ["chapel"], minBook: 3, category: "tower" },
  { id: "bastion", name: "원형 보루", requires: { stone: 10, brick: 6, steel: 4, bronze: 2 }, income: 12, xp: 26, prereq: ["watchtower"], minBook: 3, category: "tower" },
  { id: "keeptower", name: "성탑", requires: { stone: 12, marble: 5, steel: 6, bronze: 3 }, income: 20, xp: 30, prereq: ["watchtower"], minBook: 3, category: "tower" },
  // 교회 (Churches 팩) — 권위·경험치 위주(수입은 적고 xp 높음), 도시 위신
  { id: "shrine", name: "사당", requires: { brick: 4, glass: 3, bronze: 1 }, income: 5, xp: 20, prereq: ["chapel"], minBook: 2, category: "church" },
  { id: "church", name: "교회", requires: { brick: 6, glass: 4, bronze: 2 }, income: 8, xp: 26, prereq: ["chapel"], minBook: 2, category: "church" },
  { id: "church_belfry", name: "종탑 교회", requires: { brick: 8, marble: 2, glass: 5, bronze: 2 }, income: 12, xp: 30, prereq: ["church"], minBook: 3, category: "church" },
  { id: "church_great", name: "대교회", requires: { marble: 4, stainedglass: 2, glass: 6, bronze: 3 }, income: 15, xp: 34, prereq: ["church_belfry"], minBook: 3, category: "church" },
  // 성 (Castles 팩) — 랜드마크. 높은 수입·경험치, 고급 자재. 선행 사슬로 점진 해금. 최고 성채는 relic·신표 요구.
  { id: "keep_small", name: "작은 성채", requires: { stone: 12, brick: 8, steel: 5 }, income: 22, xp: 30, prereq: ["watchtower"], minBook: 3, category: "castle" },
  { id: "keep_stone", name: "석성채", requires: { stone: 16, brick: 10, steel: 6 }, income: 25, xp: 31, prereq: ["keep_small"], minBook: 3, category: "castle" },
  { id: "keep_square", name: "사각 성채", requires: { stone: 16, brick: 14, steel: 4, bronze: 2 }, income: 27, xp: 32, prereq: ["keep_small"], minBook: 3, category: "castle" },
  { id: "keep_fort", name: "요새", requires: { stone: 16, brick: 12, steel: 8, bronze: 2 }, income: 28, xp: 33, prereq: ["keep_stone"], minBook: 3, category: "castle" },
  { id: "keep_tower", name: "탑성", requires: { stone: 18, brick: 10, steel: 8, bronze: 3 }, income: 30, xp: 34, prereq: ["keep_stone"], minBook: 3, category: "castle" },
  { id: "keep_red", name: "붉은 성채", requires: { stone: 18, brick: 16, steel: 5, bronze: 3 }, income: 31, xp: 34, prereq: ["keep_square"], minBook: 3, category: "castle" },
  { id: "keep_round", name: "원형 요새", requires: { stone: 20, brick: 14, steel: 8, bronze: 2 }, income: 32, xp: 35, prereq: ["keep_fort"], minBook: 3, category: "castle" },
  { id: "keep_garden", name: "정원 성채", requires: { stone: 18, brick: 12, glass: 6, bronze: 4 }, income: 33, xp: 35, prereq: ["keep_tower"], minBook: 3, category: "castle" },
  { id: "keep_hall", name: "성채 회당", requires: { stone: 20, brick: 16, steel: 6, glass: 6 }, income: 34, xp: 36, prereq: ["keep_red"], minBook: 3, category: "castle" },
  { id: "keep_manor", name: "증축 성", requires: { stone: 20, brick: 14, steel: 10, stainedglass: 2 }, income: 36, xp: 37, prereq: ["keep_round"], minBook: 3, category: "castle" },
  { id: "keep_spire", name: "첨탑 성", requires: { brick: 12, marble: 4, stainedglass: 3, glass: 8, bronze: 4 }, income: 38, xp: 38, prereq: ["keep_garden"], minBook: 3, category: "castle" },
  { id: "keep_grand", name: "대성", requires: { brick: 18, marble: 4, stainedglass: 3, bronze: 4 }, income: 40, xp: 38, prereq: ["keep_hall"], minBook: 3, category: "castle" },
  { id: "keep_royal", name: "왕성", requires: { brick: 14, marble: 6, stainedglass: 4, bronze: 5, steel: 10 }, income: 44, xp: 39, prereq: ["keep_manor", "keep_grand"], minBook: 3, category: "castle" },
  { id: "keep_citadel", name: "대성채", requires: { brick: 16, marble: 6, stainedglass: 4, bronze: 5, relic: 1, token: 1 }, income: 48, xp: 40, prereq: ["keep_royal"], minBook: 3, category: "castle" },
  // 농장 (팩 Barns Stables) — 다른 건물처럼 자재를 들여 짓는 정식 건물. 곡창·마구간 계열.
  { id: "barn_03", name: "작은 헛간", requires: { wood: 4, clay: 3 }, income: 7, xp: 10, prereq: [], category: "farm" },
  { id: "barn_05", name: "여물 헛간", requires: { wood: 5, clay: 3, rope: 1 }, income: 9, xp: 11, prereq: ["hut"], category: "farm" },
  { id: "barn_07", name: "농기구 헛간", requires: { wood: 5, clay: 4, planks: 1 }, income: 10, xp: 12, prereq: ["warehouse"], category: "farm" },
  { id: "barn_01", name: "큰 헛간", requires: { wood: 6, clay: 5, planks: 2 }, income: 14, xp: 15, prereq: ["warehouse"], category: "farm" },
  { id: "barn_04", name: "이층 헛간", requires: { wood: 7, clay: 4, planks: 3 }, income: 16, xp: 16, prereq: ["warehouse"], category: "farm" },
  { id: "barn_06", name: "농막", requires: { planks: 4, clay: 5, brick: 2 }, income: 18, xp: 18, prereq: ["warehouse"], minBook: 2, category: "farm" },
  { id: "barn_02", name: "대형 곡창", requires: { planks: 6, clay: 6, brick: 3 }, income: 24, xp: 22, prereq: ["barn_01"], minBook: 2, category: "farm" },
  { id: "stables_03", name: "작은 마구간", requires: { wood: 5, planks: 2, cloth: 1 }, income: 11, xp: 12, prereq: ["hut"], category: "farm" },
  { id: "stables_02", name: "마구간", requires: { wood: 6, planks: 3, cloth: 2 }, income: 15, xp: 15, prereq: ["warehouse"], category: "farm" },
  { id: "stables_04", name: "큰 마구간", requires: { planks: 5, brick: 3, cloth: 3 }, income: 20, xp: 20, prereq: ["stables_02"], minBook: 2, category: "farm" },
  { id: "stables_01", name: "종마장", requires: { planks: 6, brick: 4, cloth: 3, steel: 2 }, income: 26, xp: 24, prereq: ["stables_04"], minBook: 2, category: "farm" },
  // 군사 (팩 Barracks) — 다른 건물처럼 자재를 들여 짓는 정식 건물. 야영지·파수막·병영 계열.
  { id: "camp_01", name: "야영지", requires: { wood: 3, rope: 2, cloth: 2 }, income: 6, xp: 10, prereq: [], category: "military" },
  { id: "camp_02", name: "막사 천막", requires: { wood: 4, cloth: 3, rope: 2 }, income: 8, xp: 11, prereq: ["hut"], category: "military" },
  { id: "guardhouse_03", name: "파수막", requires: { wood: 5, stone: 4, scrap: 2 }, income: 10, xp: 12, prereq: ["warehouse"], category: "military" },
  { id: "guardhouse_02", name: "수비 초소", requires: { stone: 5, wood: 4, steel: 2 }, income: 12, xp: 14, prereq: ["warehouse"], category: "military" },
  { id: "guardhouse_01", name: "위병소", requires: { stone: 6, planks: 3, steel: 3 }, income: 14, xp: 15, prereq: ["warehouse"], minBook: 2, category: "military" },
  { id: "barracks_05", name: "병영", requires: { stone: 6, planks: 4, steel: 3 }, income: 16, xp: 16, prereq: ["warehouse"], minBook: 2, category: "military" },
  { id: "barracks_01", name: "주둔지", requires: { stone: 7, brick: 4, steel: 4 }, income: 18, xp: 18, prereq: ["barracks_05"], minBook: 2, category: "military" },
  { id: "barracks_03", name: "막사", requires: { stone: 8, brick: 5, steel: 4 }, income: 20, xp: 20, prereq: ["barracks_05"], minBook: 2, category: "military" },
  { id: "barracks_06", name: "대막사", requires: { brick: 6, steel: 5, marble: 2 }, income: 24, xp: 22, prereq: ["barracks_01"], minBook: 3, category: "military" },
  { id: "barracks_02", name: "요새 병영", requires: { brick: 8, steel: 6, marble: 3 }, income: 28, xp: 24, prereq: ["barracks_03"], minBook: 3, category: "military" },
  { id: "barracks_04", name: "대주둔지", requires: { brick: 9, steel: 6, marble: 3, bronze: 2 }, income: 32, xp: 26, prereq: ["barracks_02"], minBook: 3, category: "military" },
  // 공방 (팩 Blacksmiths) — 다른 건물처럼 자재를 들여 짓는 정식 건물. 금속·자재 생산.
  { id: "kiln_01", name: "화덕", requires: { clay: 5, stone: 3, scrap: 2 }, income: 10, xp: 14, prereq: ["warehouse"], produces: { brick: 1 }, category: "forge" },
  { id: "workshop_02", name: "공방", requires: { planks: 5, brick: 4, steel: 2 }, income: 15, xp: 18, prereq: ["warehouse"], minBook: 2, produces: { planks: 1 }, category: "forge" },
  { id: "blacksmith_01", name: "철공소", requires: { stone: 5, scrap: 4, steel: 2 }, income: 13, xp: 15, prereq: ["warehouse", "well"], minBook: 2, produces: { steel: 1 }, category: "forge" },
  { id: "blacksmith_03", name: "제련소", requires: { stone: 6, brick: 3, steel: 3 }, income: 16, xp: 18, prereq: ["blacksmith_01"], minBook: 2, produces: { bronze: 1 }, category: "forge" },
  { id: "blacksmith_02", name: "대장간 공방", requires: { stone: 6, brick: 4, steel: 4 }, income: 20, xp: 20, prereq: ["blacksmith_01"], minBook: 2, produces: { steel: 1, bronze: 1 }, category: "forge" },
  { id: "workshop_03", name: "장인 공방", requires: { planks: 6, brick: 5, glass: 3 }, income: 22, xp: 22, prereq: ["workshop_02"], minBook: 3, produces: { glass: 1 }, category: "forge" },
  // 장식 (「대건축가의 설계도」 보유 시 해금 — 자재 불필요·즉시완공·수입0). 바닥(flat)은 지면으로 렌더.
  { id: "floor_grass", name: "잔디 바닥", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "floor_stone", name: "돌 바닥", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "floor_dirt", name: "흙 바닥", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "floor_path", name: "자갈길", requires: {}, income: 0, xp: 0, prereq: [], deco: true, flat: true },
  { id: "wallpiece", name: "성벽 조각", requires: {}, income: 0, xp: 0, prereq: [], deco: true },
  { id: "gate", name: "성문", requires: {}, income: 0, xp: 0, prereq: [], deco: true },
  { id: "fence", name: "울타리", requires: {}, income: 0, xp: 0, prereq: [], deco: true },
  // 나무 (팩 Trees, 자연 장식 — 폐허에 나무를 심는다. 목재 소량으로 완성, 수입0). category "nature".
  { id: "tree4", name: "나무 1", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree5", name: "나무 2", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree6", name: "나무 3", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree7", name: "나무 4", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree8", name: "나무 5", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree9", name: "나무 6", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree10", name: "나무 7", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree11", name: "나무 8", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  { id: "tree12", name: "나무 9", requires: { wood: 2 }, income: 0, xp: 0, prereq: [], category: "nature" },
  // 밭·농지 (팩 Fields Farms, 자연 장식 — 폐허를 개간한다. 소량 자재로 완성, 수입0). category "field".
  // 밭(field)은 flat 바닥으로 렌더(타일 지면). 짚단·과수원·우리는 직립.
  { id: "field_01", name: "밭 1", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_02", name: "밭 2", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_03", name: "밭 3", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_04", name: "밭 4", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_05", name: "밭 5", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_6", name: "밭 6", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_7", name: "밭 7", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_8", name: "밭 8", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_9", name: "밭 9", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_10", name: "밭 10", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_11", name: "밭 11", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_12", name: "밭 12", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "field_13", name: "밭 13", requires: { clay: 2 }, income: 0, xp: 0, prereq: [], category: "field", flat: true },
  { id: "crop_01", name: "낟가리", requires: { wood: 1 }, income: 0, xp: 0, prereq: [], category: "field" },
  { id: "orchard_a", name: "과수원 1", requires: { wood: 3, clay: 2 }, income: 0, xp: 0, prereq: [], category: "field" },
  { id: "orchard_b", name: "과수원 2", requires: { wood: 3, clay: 2 }, income: 0, xp: 0, prereq: [], category: "field" },
  { id: "yard_01", name: "가축 우리 1", requires: { wood: 4 }, income: 0, xp: 0, prereq: [], category: "field" },
  { id: "yard_02", name: "가축 우리 2", requires: { wood: 4 }, income: 0, xp: 0, prereq: [], category: "field" },
  { id: "yard_03", name: "가축 우리 3", requires: { wood: 4 }, income: 0, xp: 0, prereq: [], category: "field" },
  // 건축 (팩 Architecture, 폐허 장식 — 「대건축가의 설계도」 보유 시 배치. deco + category "arch"로 별도 탭 분리).
  { id: "arch1", name: "돌아치", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "arch2", name: "무너진 아치", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "block1", name: "석괴", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "block2", name: "돌더미", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "bridge1", name: "돌다리", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "buttress1", name: "버팀벽", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "cairn1", name: "돌무덤", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "guardshack1", name: "초소", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "platform_a", name: "돌 단", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "square1", name: "포장 광장", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "statue1", name: "석상", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "rubble1", name: "바위", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "rubble2", name: "돌무리", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "stonecircle1", name: "환상열석", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "towertop1", name: "탑 꼭대기", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "anvil_01", name: "모루", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
  { id: "trough_01", name: "물통", requires: {}, income: 0, xp: 0, prereq: [], deco: true, category: "arch" },
];

// 건물별 인구 기여(주거·규모 반영). 완공 시 인구 증가 → 지인 합류 임계에 사용. 장식·유틸은 0.
// 없는 id는 수입 기반 추정(income/4)으로 폴백 → 새 건물 추가 시 자동 반영.
export const BUILDING_POP: Record<string, number> = {
  hut: 3, well: 0, warehouse: 1, mill: 2, smithy: 2, inn: 8, market: 5, workshop: 3, chapel: 4,
  wall: 0, watchtower: 1, guildhall: 6, manor: 10, cathedral: 12,
  // 상업
  storeshed: 1, stall: 2, produce: 2, pavilion: 3, shop: 3, shop2: 3, tavern: 6,
  markethall: 3, markethouse: 4, marketbuilding: 5, marketplaza: 5, grandmarket: 6, bazaar: 7,
  // 타워(방어 — 낮음)
  tower: 1, belltower: 2, bastion: 1, keeptower: 2,
  // 교회
  shrine: 3, church: 5, church_belfry: 6, church_great: 8,
  // 성채(규모↑)
  keep_small: 12, keep_stone: 14, keep_square: 15, keep_fort: 16, keep_tower: 18, keep_red: 18,
  keep_round: 20, keep_garden: 22, keep_hall: 24, keep_manor: 26, keep_spire: 28, keep_grand: 30,
  keep_royal: 34, keep_citadel: 40,
};

// 경험치 누적으로 마법의 책이 오르는 임계치.
// 데모 훅: 책 Lv2에서 "시작"해 상인 성향을 첫 흥정부터 보여준다(추리 루프가 킬러 콘텐츠).
// 약점(Lv3)은 첫 건물(최소 xp 8) 완공 직후 드러난다 — 짧은 성장 비트는 유지.
export const BOOK_XP_THRESHOLDS = [0, 0, 8]; // Lv2 시작(성향), 첫 건물 → Lv3(약점)

export const BOOK_LEVEL_DESC: Record<number, string> = {
  1: "취급 자재만 보인다.",
  2: "상인의 성향과 대략적인 가격대가 보인다.",
  3: "약점과 하한가 근사치가 보이고, 고물상의 옛 문명 부품을 거래할 수 있다.",
};
