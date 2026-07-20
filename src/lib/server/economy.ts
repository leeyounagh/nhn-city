// 서버 전용 "진실" 데이터. 상인 성향·하한가·호감도 수식은 이 파일 밖으로 나가지 않는다.
import "server-only";
import type {
  BookLevel,
  HaggleCategory,
  MaterialId,
  MerchantMaterialView,
  PublicMerchant,
  Tier,
  TownId,
} from "@/types/game";
import { MATERIAL_NAME, TOWN_BY_ID } from "@/lib/game-data";

// 특산 물품을 그 업종 마을에서 사면 싸다 (마을배수). P3 가격식: base × markup × townMult.
const SPECIAL_TOWN_DISCOUNT = 0.8;

// 마을배수: 자재가 그 마을의 특산이면 할인, 아니면 1.0. (day/상인과 무관한 결정론)
export function townMultiplier(townId: TownId | undefined, id: MaterialId): number {
  if (!townId) return 1;
  return TOWN_BY_ID[townId].specialMaterials.includes(id) ? SPECIAL_TOWN_DISCOUNT : 1;
}

// 품귀배수: 플레이어가 최근 그 자재를 많이 살수록 시세가 오른다(≥1.0). 구매 1개당 +5%, 최대 +80%.
const SCARCITY_PER_UNIT = 0.05;
const SCARCITY_CAP = 0.8;
export function scarcityMultiplier(
  recentBuys: Partial<Record<MaterialId, number>> | undefined,
  id: MaterialId,
): number {
  const c = recentBuys?.[id] ?? 0;
  return 1 + Math.min(SCARCITY_CAP, c * SCARCITY_PER_UNIT);
}

// 자재별 기준가/하한가 (단가). 하한가 ≈ 기준가의 60%.
const PRICES: Record<MaterialId, { base: number; floor: number; tier: Tier }> = {
  wood: { base: 10, floor: 6, tier: 1 },
  stone: { base: 12, floor: 7, tier: 1 },
  clay: { base: 10, floor: 6, tier: 1 },
  scrap: { base: 15, floor: 9, tier: 1 },
  planks: { base: 30, floor: 18, tier: 2 },
  brick: { base: 35, floor: 21, tier: 2 },
  glass: { base: 45, floor: 27, tier: 2 },
  steel: { base: 50, floor: 30, tier: 2 },
  cloth: { base: 30, floor: 18, tier: 2 },
  marble: { base: 100, floor: 60, tier: 3 },
  bronze: { base: 90, floor: 54, tier: 3 },
  stainedglass: { base: 130, floor: 78, tier: 3 },
  relic: { base: 200, floor: 120, tier: 3 },
};

export type ProfileId = "proud" | "greedy" | "lonely" | "pragmatic";

export interface Specialization {
  id: string;
  title: string; // 표시 명칭
  portrait: string; // 초상화 아키타입 태그
  materials: MaterialId[];
  markup: number; // 기준가 배수 (만물상 +15%)
  tone: string; // LLM 페르소나용 톤 힌트
}

const SPECIALIZATIONS: Specialization[] = [
  {
    id: "woodmonger",
    title: "목재상",
    portrait: "woodmonger",
    materials: ["wood", "planks"],
    markup: 1,
    tone: "투박하고 성실한 벌목꾼 출신",
  },
  {
    id: "mason",
    title: "석공상",
    portrait: "mason",
    materials: ["stone", "brick", "marble"],
    markup: 1,
    tone: "자부심 강한 석재 장인",
  },
  {
    id: "junker",
    title: "고물상",
    portrait: "junker",
    materials: ["scrap", "steel", "relic"],
    markup: 1,
    tone: "수상하고 능글맞은 폐품 수집가",
  },
  {
    id: "glazier",
    title: "유리세공상",
    portrait: "glazier",
    materials: ["glass", "bronze", "stainedglass"],
    markup: 1,
    tone: "예민하고 까다로운 유리 세공사",
  },
  {
    id: "draper",
    title: "직물잡화상",
    portrait: "draper",
    materials: ["clay", "cloth"],
    markup: 1,
    tone: "수다스럽고 친화적인 잡화 행상",
  },
  {
    id: "general",
    title: "만물상",
    portrait: "general",
    materials: ["wood", "stone", "clay", "scrap"],
    markup: 1.15,
    tone: "두루뭉술하고 능구렁이 같은 만물 장수",
  },
];

const PROFILES: ProfileId[] = ["proud", "greedy", "lonely", "pragmatic"];

// 호감도 Δ 표 (카테고리 × 성향). 서버 밖으로 노출 금지.
const EFFECT: Record<HaggleCategory, Record<ProfileId, number>> = {
  flattery: { proud: 24, greedy: 0, lonely: 10, pragmatic: -4 },
  logic: { proud: 2, greedy: 6, lonely: -2, pragmatic: 24 },
  bulk: { proud: 8, greedy: 24, lonely: 5, pragmatic: 12 },
  sob: { proud: 4, greedy: -6, lonely: 20, pragmatic: 0 },
  threat: { proud: -30, greedy: -14, lonely: -22, pragmatic: -10 },
  smalltalk: { proud: 6, greedy: -4, lonely: 24, pragmatic: -2 },
  quality: { proud: -6, greedy: -3, lonely: -3, pragmatic: 16 },
};

const INITIAL_DISPOSITION: Record<ProfileId, number> = {
  proud: 20,
  greedy: 25,
  lonely: 30,
  pragmatic: 25,
};

const PROFILE_HINT: Record<ProfileId, string> = {
  proud: "자존심이 강해 보인다.",
  greedy: "잇속에 밝고 셈이 빠르다.",
  lonely: "어딘가 외롭고 말상대를 그리워하는 눈치다.",
  pragmatic: "감정보다 계산으로 움직이는 실리형이다.",
};

const WEAKNESS_HINT: Record<ProfileId, string> = {
  proud: "칭찬·아부에 마음이 풀린다. 협박은 최악의 수.",
  greedy: "대량 구매 제안에 눈이 돌아간다. 딱한 사정은 씨알도 안 먹힌다.",
  lonely: "잡담과 딱한 사정에 마음을 연다. 협박엔 곧장 등을 돌린다.",
  pragmatic: "논리와 자재 흠집 지적에 반응한다. 값싼 아부는 역효과.",
};

// 초상화 풀(Midjourney 사전생성). archetype으로 거르고, mood가 성향과 맞으면 우선 후보.
// 아키타입당 여러 장을 넣을수록 다양성↑. mood 없는 항목은 항상 후보로 남는다.
const PORTRAITS: { file: string; archetype: string; mood?: ProfileId }[] = [
  { file: "woodmonger", archetype: "woodmonger" },
  { file: "mason", archetype: "mason" },
  { file: "junker", archetype: "junker" },
  { file: "glazier", archetype: "glazier" },
  { file: "draper", archetype: "draper" },
  { file: "general", archetype: "general" },
];

// 성향에 맞춰 풀에서 초상화 파일명을 seed 랜덤으로 고른다. 경제 rng와 독립 스트림.
function pickPortraitFile(archetype: string, profile: ProfileId, seed: number): string {
  const moodPool = PORTRAITS.filter((p) => p.archetype === archetype && p.mood === profile);
  const anyPool = PORTRAITS.filter((p) => p.archetype === archetype && p.mood === undefined);
  const pool = moodPool.length > 0 ? [...moodPool, ...anyPool] : anyPool;
  if (pool.length === 0) return archetype; // 폴백: 아키타입 기본 파일명
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  return pool[Math.floor(rng() * pool.length)].file;
}

// 결정론 PRNG. 같은 seed면 항상 같은 상인이 나온다.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function stockFor(tier: Tier, rng: () => number): number {
  if (tier === 1) return 5 + Math.floor(rng() * 8); // 5~12
  if (tier === 2) return 3 + Math.floor(rng() * 6); // 3~8
  return 1 + Math.floor(rng() * 3); // 1~3
}

export interface DerivedMaterial {
  id: MaterialId;
  tier: Tier;
  offer0: number; // 초기 제시가
  floor: number; // 하한가
  stock: number;
}

export interface DerivedMerchant {
  seed: number;
  spec: Specialization;
  profile: ProfileId;
  materials: DerivedMaterial[];
}

// seed로부터 상인의 숨은 스펙을 결정론적으로 복원한다.
// townId=특산 할인(마을배수), recentBuys=품귀 배수를 offer0/floor에 반영. rng 호출 순서는 불변(결정론 유지).
export function deriveMerchant(
  seed: number,
  townId?: TownId,
  recentBuys?: Partial<Record<MaterialId, number>>,
): DerivedMerchant {
  const rng = mulberry32(seed);
  const spec = pick(rng, SPECIALIZATIONS);
  const profile = pick(rng, PROFILES);
  const materials: DerivedMaterial[] = spec.materials.map((id) => {
    const p = PRICES[id];
    const variance = rng() * 0.2; // 0~0.2
    const mult = townMultiplier(townId, id) * scarcityMultiplier(recentBuys, id); // 마을배수 × 품귀배수
    const offer0 = Math.round(p.base * spec.markup * mult * (1 + variance));
    const floor = Math.min(offer0, Math.round(p.floor * spec.markup * mult)); // 하한 클램프
    return { id, tier: p.tier, offer0, floor, stock: stockFor(p.tier, rng) };
  });
  return { seed, spec, profile, materials };
}

// 현재가 = floor + (offer0 - floor) × (1 - disposition/100).
export function priceAt(offer0: number, floor: number, disposition: number): number {
  const d = Math.max(0, Math.min(100, disposition));
  return Math.round(floor + (offer0 - floor) * (1 - d / 100));
}

// 자재 기준 단가 (물물교환 교환비 계산용). 서버 전용.
export function materialBase(id: MaterialId): number {
  return PRICES[id].base;
}

// 물물교환 교환비: 희귀템 1개당 지불 물품 개수의 시작값·하한값.
// 시작N = 희귀템 제시가 / 지불물품 기준가, 하한N = 희귀템 하한가 / 지불물품 기준가 (최소 1).
export function barterRatio(rareOffer0: number, rareFloor: number, payId: MaterialId): { baseN: number; floorN: number } {
  const unit = PRICES[payId].base;
  const baseN = Math.max(1, Math.ceil(rareOffer0 / unit));
  const floorN = Math.max(1, Math.ceil(rareFloor / unit));
  return { baseN, floorN };
}

// 카테고리·성향으로 호감도 변화량을 계산한다 (0~100 클램프).
export function applyCategory(
  disposition: number,
  category: HaggleCategory,
  profile: ProfileId,
): number {
  const delta = EFFECT[category][profile];
  return Math.max(0, Math.min(100, disposition + delta));
}

export function initialDisposition(profile: ProfileId): number {
  return INITIAL_DISPOSITION[profile];
}

// relic은 책 Lv3+에서만 거래 가능.
function relicUnlocked(bookLevel: BookLevel): boolean {
  return bookLevel >= 3;
}

// 책 레벨로 걸러진 공개 뷰를 만든다. persona는 LLM(또는 폴백)이 채운 서사 필드.
export function buildPublicMerchant(
  m: DerivedMerchant,
  bookLevel: BookLevel,
  persona: {
    name: string;
    appearance: string;
    greeting: string;
    personalityTone: string;
  },
  wants: MaterialId[] = [],
): PublicMerchant {
  const materials: MerchantMaterialView[] = m.materials.map((mat) => {
    const locked = mat.id === "relic" && !relicUnlocked(bookLevel);
    const view: MerchantMaterialView = {
      id: mat.id,
      name: MATERIAL_NAME[mat.id],
      tier: mat.tier,
      offer: mat.offer0,
      locked,
    };
    if (bookLevel >= 3) view.floorHint = mat.floor;
    return view;
  });

  const pub: PublicMerchant = {
    seed: m.seed,
    name: persona.name,
    title: m.spec.title,
    portrait: m.spec.portrait,
    portraitFile: pickPortraitFile(m.spec.portrait, m.profile, m.seed),
    appearance: persona.appearance,
    greeting: persona.greeting,
    personalityTone: persona.personalityTone,
    materials,
    wants: wants.map((id) => ({ id, name: MATERIAL_NAME[id] })),
  };
  if (bookLevel >= 2) pub.profileHint = PROFILE_HINT[m.profile];
  if (bookLevel >= 3) pub.weaknessHint = WEAKNESS_HINT[m.profile];
  return pub;
}

export { SPECIALIZATIONS, PROFILES, mulberry32 };
