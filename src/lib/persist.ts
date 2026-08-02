// IndexedDB 진행 세이브 스토어. GameState와 온보딩 플래그를 단일 키로 저장·복원·삭제한다.
// 클라 전용·비동기. IDB 비활성(프라이빗 모드·쿼터 등)이면 조용히 미영속으로 강등한다(throw 안 함).
import { BUILDINGS } from "@/lib/game-data";
import { type GameState, initialState } from "@/lib/game-state";

const DB_NAME = "ashen-kingdom";
const STORE = "save";
const KEY = "game";
// 저장 스키마 버전. GameState 형태가 바뀌어 하위 호환이 필요해지면 올리고 normalizeSave에서 마이그레이션한다.
export const SAVE_VERSION = 1;

// 저장하는 온보딩/세션 플래그(GameState 밖에 있어 따로 챙긴다). Set은 직렬화가 명확한 배열로 둔다.
export interface PersistedFlags {
  alliesSeen: string[]; // 합류 연출을 본 지인 id
  acked: string[]; // [다음]으로 넘긴 온보딩 정보 단계 id
  missionDismissed: boolean; // 튜토리얼 건너뛰기
  lastNewsDay: number; // 아침 시황을 마지막으로 띄운 날
}

export interface SaveData {
  version: number;
  gameState: GameState;
  flags: PersistedFlags;
}

function idbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 저장분을 읽어 검증·기본값 병합까지 끝낸 상태를 돌려준다. 없거나 손상·IDB 불가면 null(→ 새 게임).
export async function loadSave(): Promise<SaveData | null> {
  if (!idbAvailable()) return null;
  try {
    const db = await openDB();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return normalizeSave(raw);
  } catch {
    return null;
  }
}

// 진행 상태를 저장한다. 실패(프라이빗 모드·쿼터 등)는 조용히 무시 — 게임은 계속된다.
export async function writeSave(data: SaveData): Promise<void> {
  if (!idbAvailable()) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // 무시.
  }
}

// 저장분을 지운다(새 게임). 실패는 무시.
export async function clearSave(): Promise<void> {
  if (!idbAvailable()) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // 무시.
  }
}

// 저장 원본을 방어적으로 정규화한다. 형태가 안 맞거나 버전이 다르면 null(새 게임으로 폴백).
// 필드 누락은 initialState 기본값으로 메우고, 삭제된 건물을 참조하는 placement는 버린다(렌더/생산 크래시 방지).
function normalizeSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SaveData>;
  if (r.version !== SAVE_VERSION) return null; // 하위 호환 필요해지면 여기서 마이그레이션
  if (!r.gameState || typeof r.gameState !== "object") return null;

  const base = initialState();
  const g = r.gameState as Partial<GameState>;
  const validIds = new Set(BUILDINGS.map((b) => b.id));
  const placements = Array.isArray(g.placements)
    ? g.placements.filter((p) => p && typeof p === "object" && validIds.has(p.buildingId))
    : base.placements;

  const gameState: GameState = {
    ...base,
    ...g,
    inventory: g.inventory ?? base.inventory,
    placements,
    recentBuys: g.recentBuys ?? base.recentBuys,
    sellPrices: g.sellPrices ?? base.sellPrices,
    merchantMemory: g.merchantMemory ?? base.merchantMemory,
    townMerchants: Array.isArray(g.townMerchants) ? g.townMerchants : base.townMerchants,
    clues: Array.isArray(g.clues) ? g.clues : base.clues,
  };

  const f = (r.flags ?? {}) as Partial<PersistedFlags>;
  const flags: PersistedFlags = {
    alliesSeen: Array.isArray(f.alliesSeen) ? f.alliesSeen : [],
    acked: Array.isArray(f.acked) ? f.acked : [],
    missionDismissed: !!f.missionDismissed,
    lastNewsDay: typeof f.lastNewsDay === "number" ? f.lastNewsDay : gameState.day,
  };

  return { version: SAVE_VERSION, gameState, flags };
}
