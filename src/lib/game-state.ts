// 클라이언트 게임 상태와 순수 헬퍼. 서버 비밀(성향·하한가)은 여기 없다.
import type {
  BookLevel,
  MaterialId,
  PublicMerchant,
  HaggleStatus,
  HaggleCategory,
  LocationId,
  Rumor,
  TownId,
} from "@/types/game";
import {
  BUILDINGS,
  BOOK_XP_THRESHOLDS,
  STARTING_GOLD,
  MAX_BOOK_LEVEL,
} from "@/lib/game-data";

export interface HaggleState {
  materialId: MaterialId; // 획득 대상 (골드=구매 자재, 물물교환=희귀템)
  materialName: string;
  offer: number; // 초기 제시가 (물물교환은 첫 턴 전까지 0)
  currentPrice: number; // 골드=현재가, 물물교환=희귀템 1개당 지불 개수(N)
  disposition?: number; // 첫 턴 전엔 undefined (서버가 시드)
  turnsLeft: number;
  qualityApplied: boolean;
  tokenAwarded: boolean; // 이번 흥정에서 상인의 신표를 이미 받았는지 (1회 제한)
  status: HaggleStatus;
  log: HaggleLine[];
  pending: boolean;
  mode: "gold" | "barter";
  payMaterialId?: MaterialId; // 물물교환: 지불 물품
  payMaterialName?: string;
}

export interface HaggleLine {
  role: "player" | "merchant" | "system";
  text: string;
  category?: HaggleCategory;
  dispositionDelta?: number; // 이 턴 호감도 변화 (첫 턴엔 undefined)
  priceDelta?: number; // 이 턴 현재가 변화 (음수 = 값 내림)
}

// 맵에 배치된 건물 한 채. 같은 종류를 여러 채 지을 수 있어 인스턴스 id로 구분한다.
export interface Placement {
  id: string; // 인스턴스 고유 id
  buildingId: string; // 건물 종류 id (BUILDINGS)
  x: number; // 그리드 열
  y: number; // 그리드 행
  progress: Record<string, number>; // 자재 id → 투입된 수량
  built: boolean; // 완공 여부
  flipped?: boolean; // 좌우 반전(회전) 여부
}

export interface GameState {
  gold: number;
  day: number;
  xp: number;
  inventory: Record<string, number>;
  placements: Placement[]; // 고향 맵에 배치·건설 중인 건물들
  location: LocationId; // 현재 위치 (home = 건설, 4마을 = 거래·소문)
  townMerchants: PublicMerchant[]; // 현재 마을의 오늘 상인 목록 (home이면 빈 배열)
  merchant: PublicMerchant | null; // 흥정 중인 상인 (townMerchants에서 선택)
  haggle: HaggleState | null;
  clues: Rumor[]; // 오늘 수집한 소문 (날이 바뀌면 비움)
  recentBuys: Partial<Record<MaterialId, number>>; // 자재별 최근 구매량 (품귀 배수 산정, 이동으로 감쇠)
  sellPrices: Partial<Record<MaterialId, number>>; // 현재 마을의 자재별 판매가 (마을 진입 시 서버가 채움, home이면 빈값)
  merchantMemory: Record<number, MerchantMemory>; // 상인 seed(정체성) → 누적 호감도·신표 수령 (흥정을 넘어 유지)
}

// 상인과 쌓은 관계의 지속 기억. 흥정이 끝나도 남고, 안 만나면 호감도가 식는다.
export interface MerchantMemory {
  disposition: number; // 마지막 흥정 종료 시 호감도
  lastDay: number; // 그때의 day (감쇠 계산 기준)
  tokenTaken: boolean; // 「상인의 신표」를 이미 받았는지 (상인별 1회)
}

// 호감도는 안 만난 날마다 식는다. 재등장 평균 4일 기준 하루 -5 (4일이면 -20으로 흥정 상승분 상쇄).
export const DISPOSITION_DECAY_PER_DAY = 5;
export function decayedDisposition(mem: MerchantMemory, currentDay: number): number {
  const days = Math.max(0, currentDay - mem.lastDay);
  return Math.max(0, mem.disposition - days * DISPOSITION_DECAY_PER_DAY);
}

export function initialState(): GameState {
  return {
    gold: STARTING_GOLD,
    day: 1,
    xp: 0,
    inventory: {},
    placements: [],
    location: "home",
    townMerchants: [],
    merchant: null,
    haggle: null,
    clues: [],
    recentBuys: {},
    sellPrices: {},
    merchantMemory: {},
  };
}

// 이동으로 날이 흐르면 최근 구매 기억이 옅어진다(품귀 완화). 하루당 일정량 감소, 0 이하는 제거.
export const RECENT_BUY_DECAY_PER_DAY = 3;
export function decayRecentBuys(
  rb: Partial<Record<MaterialId, number>>,
  days: number,
): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  for (const [id, v] of Object.entries(rb)) {
    const nv = Math.max(0, (v ?? 0) - days * RECENT_BUY_DECAY_PER_DAY);
    if (nv > 0) out[id as MaterialId] = nv;
  }
  return out;
}

// 수집 소문을 누적한다. 같은 id는 최신으로 덮어써 중복을 막는다.
export function mergeClues(existing: Rumor[], incoming: Rumor[]): Rumor[] {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  return [...byId.values()];
}

// 소문을 지목 마을별로 묶는다 (노트 표시 축).
export function groupCluesByTown(clues: Rumor[]): { townId: TownId; townName: string; rumors: Rumor[] }[] {
  const groups = new Map<TownId, { townId: TownId; townName: string; rumors: Rumor[] }>();
  for (const r of clues) {
    const g = groups.get(r.townId);
    if (g) g.rumors.push(r);
    else groups.set(r.townId, { townId: r.townId, townName: r.townName, rumors: [r] });
  }
  return [...groups.values()];
}

// 대건축가의 설계도 보유 여부 → 바닥·성벽 장식 배치 해금.
export function hasBlueprint(inventory: Record<string, number>): boolean {
  return (inventory.blueprint ?? 0) > 0;
}

export function bookLevelFromXp(xp: number): BookLevel {
  let level = 1;
  for (let i = 0; i < BOOK_XP_THRESHOLDS.length; i++) {
    if (xp >= BOOK_XP_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, MAX_BOOK_LEVEL) as BookLevel;
}

// 다음 레벨까지 남은 경험치 (최고 레벨이면 null).
export function xpToNext(xp: number): { need: number; nextLevel: BookLevel } | null {
  const lv = bookLevelFromXp(xp);
  if (lv >= MAX_BOOK_LEVEL) return null;
  const threshold = BOOK_XP_THRESHOLDS[lv]; // 다음 레벨 임계치
  return { need: threshold - xp, nextLevel: (lv + 1) as BookLevel };
}

export function dailyIncome(placements: Placement[]): number {
  return placements.reduce((sum, p) => {
    if (!p.built) return sum;
    const b = BUILDINGS.find((x) => x.id === p.buildingId);
    return sum + (b ? b.income : 0);
  }, 0);
}

// 완공 건물들이 하루에 생산하는 자재 합계 (고정 산출). 이동 시 일수만큼 인벤토리에 쌓인다.
export function dailyProduction(placements: Placement[]): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  for (const p of placements) {
    if (!p.built) continue;
    const b = BUILDINGS.find((x) => x.id === p.buildingId);
    if (!b?.produces) continue;
    for (const [id, n] of Object.entries(b.produces) as [MaterialId, number][]) {
      out[id] = (out[id] ?? 0) + n;
    }
  }
  return out;
}

// 완공된 건물 종류 집합 (선행 게이팅 판정용).
export function builtTypes(placements: Placement[]): Set<string> {
  return new Set(placements.filter((p) => p.built).map((p) => p.buildingId));
}

// 고향 대표 아이콘 (완성도에 따라 진화). 완공 건물이 없으면 기본 폐허 타일,
// 있으면 그중 가장 난이도 높은(경험치 최대) 건물의 스프라이트를 쓴다. 장식은 제외.
export function homeIcon(placements: Placement[]): string {
  let best: string | null = null;
  let bestXp = -1;
  for (const p of placements) {
    if (!p.built) continue;
    const b = BUILDINGS.find((x) => x.id === p.buildingId);
    if (!b || b.deco) continue;
    if (b.xp > bestXp) {
      bestXp = b.xp;
      best = p.buildingId;
    }
  }
  return best ?? "floor_dirt";
}

export interface PlaceCheck {
  prereqMet: boolean;
  bookMet: boolean;
  canPlace: boolean; // 이 종류를 새로 배치할 수 있는가 (선행·책 충족)
  missingPrereq: string[]; // 아직 완공되지 않은 선행 건물 id
}

// 건물 종류를 새로 배치할 수 있는지 (선행·책 게이팅). 복수 배치 허용 → alreadyBuilt 제한 없음.
export function checkPlace(buildingId: string, state: GameState): PlaceCheck {
  const b = BUILDINGS.find((x) => x.id === buildingId)!;
  // 장식물은 선행·책 대신 「대건축가의 설계도」 보유로 게이팅.
  if (b.deco) {
    const unlocked = hasBlueprint(state.inventory);
    return { prereqMet: unlocked, bookMet: unlocked, canPlace: unlocked, missingPrereq: [] };
  }
  const types = builtTypes(state.placements);
  const missingPrereq = b.prereq.filter((p) => !types.has(p));
  const prereqMet = missingPrereq.length === 0;
  const bookMet = !b.minBook || bookLevelFromXp(state.xp) >= b.minBook;
  return { prereqMet, bookMet, canPlace: prereqMet && bookMet, missingPrereq };
}

export interface BuildSlot {
  id: MaterialId;
  need: number;
  have: number; // 이 건물에 이미 투입된 수량
}

export interface PlacementCheck {
  slots: BuildSlot[];
  hasProgress: boolean; // 투입된 자재가 하나라도 있음 (회수 가능)
  complete: boolean; // 모든 슬롯 충족
}

// 배치된 건물 한 채의 자재 진행 상태.
export function checkPlacement(placement: Placement): PlacementCheck {
  const b = BUILDINGS.find((x) => x.id === placement.buildingId)!;
  const slots: BuildSlot[] = (Object.entries(b.requires) as [MaterialId, number][]).map(
    ([id, need]) => ({ id, need, have: placement.progress[id] ?? 0 }),
  );
  const hasProgress = slots.some((s) => s.have > 0);
  const complete = slots.every((s) => s.have >= s.need);
  return { slots, hasProgress, complete };
}

// 특정 건물 인스턴스에 자재 1종을 투입할 수 있는지 (미완공 + 잔여 요구 + 재고).
export function canDeposit(placement: Placement, materialId: MaterialId, state: GameState): boolean {
  const b = BUILDINGS.find((x) => x.id === placement.buildingId);
  if (!b || placement.built) return false;
  const need = b.requires[materialId];
  if (!need) return false;
  const have = placement.progress[materialId] ?? 0;
  return have < need && (state.inventory[materialId] ?? 0) > 0;
}
