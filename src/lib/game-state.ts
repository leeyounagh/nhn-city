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
  };
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

// 완공된 건물 종류 집합 (선행 게이팅 판정용).
export function builtTypes(placements: Placement[]): Set<string> {
  return new Set(placements.filter((p) => p.built).map((p) => p.buildingId));
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
