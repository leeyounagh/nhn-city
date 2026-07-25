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
import { MATERIAL_NAME, TOWN_BY_ID, TOWNS } from "@/lib/game-data";

const TOWN_IDS: TownId[] = TOWNS.map((t) => t.id);

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

// 하루치 시장 이벤트(대풍작). 결정론(day). 약 45% 날에 한 마을 특산품이 폭락한다.
export interface DailyEvent {
  townId: TownId;
  multiplier: number; // 그 마을 특산 물품에 곱하는 이벤트배수 (<1 = 폭락)
}
const EVENT_CRASH = 0.5;
const EVENT_DURATION = 4; // 대풍작 지속일 (≥ 최대 이동거리 3 → 뉴스 듣고 이동해도 유효).
const EVENT_START_CHANCE = 0.14; // 하루가 대풍작을 '시작'할 확률 → 약 45% 날이 이벤트 (1-(1-0.14)^4).

// 특정 날에 대풍작이 시작되면 그 마을을 결정론으로 정한다. 시작 안 하면 null.
function eventStartingOn(startDay: number): TownId | null {
  const rng = mulberry32((Math.imul(startDay, 0x9e3779b1) ^ 0x632be5ab) >>> 0);
  if (rng() >= EVENT_START_CHANCE) return null;
  return TOWN_IDS[Math.floor(rng() * TOWN_IDS.length)];
}

// 슬라이딩 윈도우: 최근 DURATION일 안에 시작된 이벤트가 오늘 유효(지속 DURATION일).
// 고정 4일 격자와 달리 아무 날에나 시작 → 경계 아티팩트 없음. 가장 최근 시작을 채택해
// 남은 지속일을 최대화(뉴스 듣고 이동할 여지↑).
export function dailyEvent(day: number): DailyEvent | null {
  for (let s = day; s > day - EVENT_DURATION; s--) {
    if (s < 1) break;
    const townId = eventStartingOn(s);
    if (townId) return { townId, multiplier: EVENT_CRASH };
  }
  return null;
}

// 이벤트배수: 오늘 대풍작 마을의 특산 물품을 그 마을에서 사면 폭락가, 아니면 1.0.
export function eventMultiplier(
  day: number | undefined,
  townId: TownId | undefined,
  id: MaterialId,
): number {
  if (day === undefined || !townId) return 1;
  const ev = dailyEvent(day);
  if (ev && ev.townId === townId && TOWN_BY_ID[townId].specialMaterials.includes(id)) {
    return ev.multiplier;
  }
  return 1;
}

// 자재별 기준가/하한가 (단가). 하한가 ≈ 기준가의 60%.
const PRICES: Record<MaterialId, { base: number; floor: number; tier: Tier }> = {
  wood: { base: 10, floor: 6, tier: 1 },
  stone: { base: 12, floor: 7, tier: 1 },
  clay: { base: 10, floor: 6, tier: 1 },
  scrap: { base: 15, floor: 9, tier: 1 },
  rope: { base: 8, floor: 5, tier: 1 },
  planks: { base: 30, floor: 18, tier: 2 },
  brick: { base: 35, floor: 21, tier: 2 },
  glass: { base: 45, floor: 27, tier: 2 },
  steel: { base: 50, floor: 30, tier: 2 },
  cloth: { base: 30, floor: 18, tier: 2 },
  marble: { base: 100, floor: 60, tier: 3 },
  bronze: { base: 90, floor: 54, tier: 3 },
  stainedglass: { base: 130, floor: 78, tier: 3 },
  relic: { base: 200, floor: 120, tier: 3 },
  token: { base: 0, floor: 0, tier: 3 }, // 상인의 신표 — 사고팔지 않음(값 미사용). 흥정 고호감도로만 획득.
  blueprint: { base: 700, floor: 520, tier: 3 }, // 대건축가의 설계도 — 최고가. 하한도 높아 잘 안 깎임(프리미엄).
};

// 상인이 하루에 '대건축가의 설계도'를 재고에 낼 확률 (극히 드물게). 책 Lv3에서만 잠금 해제.
const BLUEPRINT_CHANCE = 0.06;

// 이 호감도 이상이면 상인이 감복해 '상인의 신표'를 1개 선물한다 (흥정 1회당 1개).
export const TOKEN_DISPOSITION = 90;

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
    materials: ["clay", "cloth", "rope"],
    markup: 1,
    tone: "수다스럽고 친화적인 잡화 행상",
  },
  {
    id: "general",
    title: "만물상",
    portrait: "general",
    materials: ["wood", "stone", "clay", "scrap", "rope"],
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

// 마법의 책 조언 라우트용 힌트 접근자 (레벨 게이팅은 호출부에서).
export function getProfileHint(profile: ProfileId): string {
  return PROFILE_HINT[profile];
}
export function getWeaknessHint(profile: ProfileId): string {
  return WEAKNESS_HINT[profile];
}

// 초상화 풀(Midjourney 사전생성). archetype당 여러 장(`{archetype}-{n}.png`)을 두어 상인마다 다른 얼굴.
// 없는 번호의 파일은 렌더 단에서 이모지로 폴백하므로, 이미지를 채우는 만큼 자동으로 반영된다.
const PORTRAIT_ARCHETYPES = ["woodmonger", "mason", "junker", "glazier", "draper", "general"];
const PORTRAITS_PER_ARCHETYPE = 6;
const PORTRAITS: { file: string; archetype: string }[] = PORTRAIT_ARCHETYPES.flatMap((a) =>
  Array.from({ length: PORTRAITS_PER_ARCHETYPE }, (_, i) => ({ file: `${a}-${i + 1}`, archetype: a })),
);

function portraitPool(archetype: string): string[] {
  return PORTRAITS.filter((p) => p.archetype === archetype).map((p) => p.file);
}

// 단건(/api/merchant)용: 풀에서 초상화 파일명을 seed로 고른다. 경제 rng와 독립 스트림.
function pickPortraitFile(archetype: string, _profile: ProfileId, seed: number): string {
  const pool = portraitPool(archetype);
  if (pool.length === 0) return archetype; // 폴백: 아키타입 기본 파일명
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  return pool[Math.floor(rng() * pool.length)];
}

// ── 영구 상인 정체성 (v2) ────────────────────────────────────────
// 상인 24명(전문화 6종×4명). 초상화·성별·외모는 미드저니 초상화와 1:1 고정.
// seed는 id로 결정론 파생 → deriveMerchant가 이 seed로 전문화·초상화를 복원한다.
// 성별/외모는 페르소나(이름·톤)가 초상화와 어긋나지 않도록 하는 힌트.
export interface MerchantIdentity {
  id: number;
  name: string;
  seed: number;
  specId: string;
  portraitFile: string;
  gender: "m" | "f";
  appearance: string;
}

// 이름은 초상화 성별에 맞춰 고정한다(정체성의 일부). 인사·톤·흥정 대사는 LLM이 연기.
const MERCHANT_APPEARANCES: { name: string; specId: string; gender: "m" | "f"; appearance: string }[] = [
  // woodmonger (목재상)
  { name: "옹이손 가르드", specId: "woodmonger", gender: "m", appearance: "백발에 수염을 기른 노년의 벌목꾼, 도끼를 짊어졌다" },
  { name: "삼나무 리나", specId: "woodmonger", gender: "f", appearance: "두건을 두른 여성 목재상, 그을린 얼굴" },
  { name: "톱밥 마야", specId: "woodmonger", gender: "f", appearance: "두건을 쓰고 환히 웃는 여성, 톱밥 자루를 안았다" },
  { name: "물푸레 이바", specId: "woodmonger", gender: "f", appearance: "청록빛 땋은 머리의 여성 목재상" },
  // mason (석공상)
  { name: "화강암 브렌", specId: "mason", gender: "m", appearance: "수염과 다부진 체구의 석공, 큰 망치를 들었다" },
  { name: "정 든 하롤", specId: "mason", gender: "m", appearance: "짧은 수염의 석공, 망치를 어깨에 걸쳤다" },
  { name: "끌잡이 오스카", specId: "mason", gender: "m", appearance: "수염 난 석공, 정을 쥐고 돌을 살핀다" },
  { name: "돌먼지 카일", specId: "mason", gender: "m", appearance: "젊은 석공, 헝클어진 어두운 머리" },
  // junker (고물상)
  { name: "넝마꾼 레브", specId: "junker", gender: "m", appearance: "이마에 고글을 올린 고물상, 능글맞은 미소" },
  { name: "고물장수 핀치", specId: "junker", gender: "m", appearance: "고글과 장신구를 주렁주렁 단 고물상" },
  { name: "고철 니카", specId: "junker", gender: "f", appearance: "머리를 질끈 묶은 여성 고물상" },
  { name: "잡동사니 셀라", specId: "junker", gender: "f", appearance: "나른한 눈빛의 여성 고물상" },
  // glazier (유리세공상)
  { name: "색유리 엘라", specId: "glazier", gender: "f", appearance: "유리병을 든 여성 유리세공사" },
  { name: "불집게 요른", specId: "glazier", gender: "m", appearance: "유리병을 매만지는 남성 유리세공사" },
  { name: "유리알 세라", specId: "glazier", gender: "f", appearance: "스테인드글라스 조각을 든 여성" },
  { name: "살얼음 코른", specId: "glazier", gender: "m", appearance: "유리 파편을 든 남성, 서늘한 분위기" },
  // draper (직물잡화상)
  { name: "비단발 카림", specId: "draper", gender: "m", appearance: "활짝 웃는 남성 직물상, 스카프를 둘렀다" },
  { name: "실타래 뮤엘", specId: "draper", gender: "m", appearance: "색색의 천을 두른 남성 직물상" },
  { name: "물레 톤", specId: "draper", gender: "m", appearance: "천을 늘어뜨려 보이는 남성 직물상" },
  { name: "행상 도티", specId: "draper", gender: "f", appearance: "흰옷의 여성 직물상, 손을 뻗어 권한다" },
  // general (만물상)
  { name: "잡화 미나", specId: "general", gender: "f", appearance: "집시풍 차림의 여성 만물상" },
  { name: "저울눈 하킴", specId: "general", gender: "m", appearance: "여유로운 미소의 남성 만물상" },
  { name: "봇짐 로사", specId: "general", gender: "f", appearance: "잡화를 두른 여성 만물상" },
  { name: "만물장수 곰보", specId: "general", gender: "m", appearance: "통통하고 수염 난 남성 만물상, 승리의 손짓" },
];

function identitySeed(id: number): number {
  return (Math.imul(id + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
}

// 전문화별로 초상화 번호(specId-1..4)를 매겨 24명을 확정한다.
export const MERCHANTS: MerchantIdentity[] = (() => {
  const counts: Record<string, number> = {};
  return MERCHANT_APPEARANCES.map((a, id) => {
    const n = (counts[a.specId] = (counts[a.specId] ?? 0) + 1);
    return {
      id,
      name: a.name,
      seed: identitySeed(id),
      specId: a.specId,
      portraitFile: `${a.specId}-${n}`,
      gender: a.gender,
      appearance: a.appearance,
    };
  });
})();

const MERCHANT_BY_SEED = new Map(MERCHANTS.map((m) => [m.seed, m]));
const SPEC_BY_ID: Record<string, Specialization> = Object.fromEntries(
  SPECIALIZATIONS.map((s) => [s.id, s]),
);

// seed로 영구 상인 정체성을 조회 (없으면 undefined = 이벤트/임시 상인).
export function merchantIdentity(seed: number): MerchantIdentity | undefined {
  return MERCHANT_BY_SEED.get(seed);
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
  day?: number,
): DerivedMerchant {
  const rng = mulberry32(seed);
  // 영구 상인이면 전문화를 그 정체성으로 고정한다. rng 소비 순서는 그대로 둬(가격 결정론 유지).
  const rolledSpec = pick(rng, SPECIALIZATIONS);
  const identity = MERCHANT_BY_SEED.get(seed);
  const spec = identity ? SPEC_BY_ID[identity.specId] : rolledSpec;
  const profile = pick(rng, PROFILES);
  const materials: DerivedMaterial[] = spec.materials.map((id) => {
    const p = PRICES[id];
    const variance = rng() * 0.2; // 0~0.2
    // 가격식: 마을배수 × 이벤트배수 × 품귀배수
    const mult =
      townMultiplier(townId, id) * eventMultiplier(day, townId, id) * scarcityMultiplier(recentBuys, id);
    const offer0 = Math.round(p.base * spec.markup * mult * (1 + variance));
    const floor = Math.min(offer0, Math.round(p.floor * spec.markup * mult)); // 하한 클램프
    return { id, tier: p.tier, offer0, floor, stock: stockFor(p.tier, rng) };
  });
  // 극히 드물게 '대건축가의 설계도'를 추가로 내놓는다 (rng 스트림 맨 끝 → 스펙 자재 결정론 불변). 책 게이팅은 공개뷰에서.
  if (rng() < BLUEPRINT_CHANCE) {
    const bp = PRICES.blueprint;
    materials.push({ id: "blueprint", tier: 3, offer0: bp.base, floor: bp.floor, stock: 1 });
  }
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

// 잉여 자재를 아무 상인에게 팔 때 개당 골드. 시세(마을배수·이벤트배수) 반영, 품귀·markup 제외.
// SELL_RATE(0.5) < 구매 하한 비율(floor≈0.6)이라 같은 마을 즉시 되팔기는 손해 = 무한차익 차단.
// 대신 대풍작 마을에서 싸게 사서 다른 마을에 팔면 차익(시세가 마을마다 다르므로).
const SELL_RATE = 0.5;
export function sellPrice(day: number | undefined, townId: TownId | undefined, id: MaterialId): number {
  const mult = townMultiplier(townId, id) * eventMultiplier(day, townId, id);
  return Math.max(1, Math.round(PRICES[id].base * mult * SELL_RATE));
}

// 그 마을·날의 전체 자재 판매가 표 (클라 표시용). 신표(token)는 거래 불가라 제외.
export function allSellPrices(day: number, townId: TownId): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  for (const id of Object.keys(PRICES) as MaterialId[]) {
    if (id === "token" || id === "blueprint") continue; // 신표·설계도는 되팔 수 없음
    out[id] = sellPrice(day, townId, id);
  }
  return out;
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
    const locked = (mat.id === "relic" || mat.id === "blueprint") && !relicUnlocked(bookLevel);
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
    portraitFile: MERCHANT_BY_SEED.get(m.seed)?.portraitFile ?? pickPortraitFile(m.spec.portrait, m.profile, m.seed),
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
