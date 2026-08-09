"use client";
// 게임 엔진 훅. 클라이언트 상태를 소유하고 서버 라우트를 호출해 루프를 돈다.
// 화면 컴포넌트(Game)는 이 훅의 상태·액션을 받아 렌더만 담당한다(관심사 분리).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  DailyNews,
  HaggleCategory,
  LocationId,
  MaterialId,
  NewsWithProduction,
  PublicMerchant,
  Rumor,
} from "@/types/game";
import { BUILDINGS, HAGGLE_TURNS, MATERIAL_NAME, travelDays, locationName } from "@/lib/game-data";
import {
  type GameState,
  type HaggleState,
  type MerchantMemory,
  initialState,
  bookLevelFromXp,
  dailyIncome,
  population,
  dailyProduction,
  xpToNext,
  checkPlace,
  checkPlacement,
  decayRecentBuys,
  decayedDisposition,
  homeStage,
} from "@/lib/game-state";
import { activeMission, missionStatuses } from "@/lib/missions";
import {
  activeAllies,
  allyBonuses,
  ALLY_EVENT_CHANCE,
  ALLY_EVENT_KIND,
  allyHash,
  type Ally,
} from "@/lib/allies";
import { loadSave, writeSave, clearSave, SAVE_VERSION, type SaveData } from "@/lib/persist";

const INTRO_SEEN_KEY = "lc_intro_seen";
const TUTORIAL_SEEN_KEY = "lc_tutorial_seen"; // 도움말(튜토리얼 책) 자동 표시는 최초 1회만 (매 새로고침 반복 방지)
const EVENT_MERCHANT_CHANCE = 0.12; // 하루 넘길 때 떠돌이 상인 등장 확률

// 흥정 종료 시 그 상인과의 호감도·신표 수령을 기억에 저장한다(seed=정체성 키). 대화 없이 닫으면 유지.
function rememberMerchant(s: GameState): Record<number, MerchantMemory> {
  if (!s.merchant || !s.haggle || s.haggle.disposition === undefined) return s.merchantMemory ?? {};
  return {
    ...(s.merchantMemory ?? {}),
    [s.merchant.seed]: {
      disposition: s.haggle.disposition,
      lastDay: s.day,
      tokenTaken: s.haggle.tokenAwarded,
      name: s.merchant.name,
      title: s.merchant.title,
      portraitFile: s.merchant.portraitFile,
    },
  };
}

// 대목수(지인) perk = 완공 시 투입 자재의 rebatePct%(floor)를 인벤토리로 환급.
// 플레이어가 실제 투입한 완공(deposit/depositMax)에만 적용 — 조력 이벤트 무상 투입은 돌려줄 원본이 없어 제외.
function buildRebate(
  inventory: Record<string, number>,
  requires: Record<string, number>,
  rebatePct: number,
): { inventory: Record<string, number>; total: number } {
  if (rebatePct <= 0) return { inventory, total: 0 };
  const next = { ...inventory };
  let total = 0;
  for (const [id, need] of Object.entries(requires)) {
    const amt = Math.floor((need * rebatePct) / 100);
    if (amt > 0) {
      next[id] = (next[id] ?? 0) + amt;
      total += amt;
    }
  }
  return { inventory: next, total };
}

const TIER1: MaterialId[] = ["wood", "stone", "clay", "scrap", "rope"];
// 미완공 건물이 아직 필요로 하는 tier1 자재 하나 (재료 공수용).
function neededTier1(s: GameState): MaterialId | null {
  for (const p of s.placements) {
    if (p.built) continue;
    for (const slot of checkPlacement(p).slots) {
      if (slot.have < slot.need && TIER1.includes(slot.id)) return slot.id;
    }
  }
  return null;
}
// 미완공 건물의 아직 안 찬 슬롯 하나 (건설 도움용).
function unbuiltTarget(s: GameState): { idx: number; materialId: MaterialId } | null {
  for (let idx = 0; idx < s.placements.length; idx++) {
    const p = s.placements[idx];
    if (p.built) continue;
    const slot = checkPlacement(p).slots.find((sl) => sl.have < sl.need);
    if (slot) return { idx, materialId: slot.id };
  }
  return null;
}
type AllyEventView = { ally: Ally; label: string };

// 조력 이벤트를 순수하게 계산 (효과가 반영된 다음 상태 + 모달 뷰). 이벤트 없으면 null.
// setState updater 밖에서도 뷰를 얻을 수 있게 순수 분리 — updater 안에서 view를 대입해 동기로 읽으면
// passDay/travelTo의 선행 setState 탓에 React eager-update가 건너뛰어져 모달이 누락된다.
function computeAllyEvent(s: GameState, newDay: number): { next: GameState; view: AllyEventView } | null {
  const active = activeAllies(population(s.placements));
  if (active.length === 0 || allyHash(newDay, 1) >= ALLY_EVENT_CHANCE) return null;
  const ally = active[Math.floor(allyHash(newDay, 2) * active.length)];
  const kind = ALLY_EVENT_KIND[ally.id];
  if (kind === "gold") {
    const amt = 20 + Math.floor(allyHash(newDay, 3) * 31); // 20~50
    return { next: { ...s, gold: s.gold + amt }, view: { ally, label: `거래처를 살펴 ${amt}골드를 벌어다 줬다.` } };
  }
  if (kind === "xp") {
    const amt = 3 + Math.floor(allyHash(newDay, 3) * 3); // 3~5
    return { next: { ...s, xp: s.xp + amt }, view: { ally, label: `기록을 도와 경험치 +${amt}.` } };
  }
  if (kind === "material") {
    const mat = neededTier1(s);
    if (!mat) return null;
    const amt = 1 + Math.floor(allyHash(newDay, 3) * 3); // 1~3
    return {
      next: { ...s, inventory: { ...s.inventory, [mat]: (s.inventory[mat] ?? 0) + amt } },
      view: { ally, label: `${MATERIAL_NAME[mat]} ${amt}을(를) 구해왔다.` },
    };
  }
  // build: 미완공 건물에 자재 1 무료 투입 (마지막 슬롯이면 완공)
  const target = unbuiltTarget(s);
  if (!target) return null;
  const pl = s.placements[target.idx];
  const b = BUILDINGS.find((x) => x.id === pl.buildingId);
  const progress = { ...pl.progress, [target.materialId]: (pl.progress[target.materialId] ?? 0) + 1 };
  const complete = b
    ? (Object.entries(b.requires) as [MaterialId, number][]).every(([id, n]) => (progress[id] ?? 0) >= n)
    : false;
  const placements = [...s.placements];
  placements[target.idx] = { ...pl, progress, built: complete };
  return {
    next: complete ? { ...s, placements, xp: s.xp + (b?.xp ?? 0) } : { ...s, placements },
    view: { ally, label: `${b?.name ?? "건물"}에 ${MATERIAL_NAME[target.materialId]} 1을(를) 채워줬다.` },
  };
}

export function useGameEngine() {
  const [state, setState] = useState<GameState>(initialState);
  const [notice, setNotice] = useState<string>("퇴직기사와 함께 국보 「마법의 책」을 품고 폐허가 된 고향으로 돌아왔다. 소문을 읽어 상인을 찾고, 거래로 도시를 다시 세워라.");
  const [busy, setBusy] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false); // 자동 표시는 아래 마운트 effect에서 "최초 1회"만 켠다
  const [showNotebook, setShowNotebook] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [missionDismissed, setMissionDismissed] = useState(false); // 튜토리얼 건너뛰기(세션 로컬)
  const [acked, setAcked] = useState<ReadonlySet<string>>(() => new Set()); // [다음]으로 넘긴 정보 단계 id
  const [showMissions, setShowMissions] = useState(false); // 미션 목록 모달
  const [showPriceChart, setShowPriceChart] = useState(false); // 시세 그래프 모달 (책 Lv.1)
  const [showBuildingCodex, setShowBuildingCodex] = useState(false); // 건물 도감 모달 (책 Lv.1)
  const [alliesSeen, setAlliesSeen] = useState<ReadonlySet<string>>(() => new Set()); // 합류 연출 본 지인
  const [showAllies, setShowAllies] = useState(false); // 지인 명부 모달
  const [allyEvent, setAllyEvent] = useState<AllyEventView | null>(null); // 조력 이벤트 모달
  // 떠돌이 상인 이벤트 — 등장 모달용. seed·rareId·payId는 서버가 그날 실상인에서 결정(흥정 검증 통과).
  const [eventMerchant, setEventMerchant] = useState<{ merchant: PublicMerchant; rareId: MaterialId; payId: MaterialId } | null>(null);
  // null = 판정 전(첫 프레임) · true = 재생 · false = 종료. 판정 전엔 검은 커버로 게임 노출을 막는다.
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [news, setNews] = useState<NewsWithProduction | null>(null); // 오늘 아침 시황 (모달)
  const [newsPending, setNewsPending] = useState(false); // 뉴스 fetch 진행 중 (async 공백에 코치 깜빡임 방지)
  const [lastNewsDay, setLastNewsDay] = useState(1); // 뉴스를 마지막으로 띄운 날 (하루 1회)
  const [hydrated, setHydrated] = useState(false); // IndexedDB 저장분 로드 완료 여부 (전까지 검은 커버)
  const [showResetConfirm, setShowResetConfirm] = useState(false); // 새 게임 확인 모달
  const [endingSeen, setEndingSeen] = useState(false); // 재건 완성 엔딩을 본 적 있는지 (1회만)
  const [showEnding, setShowEnding] = useState(false); // 엔딩 모달 표시
  const pendingSave = useRef<SaveData | null>(null); // 디바운스 대기 중인 최신 저장 데이터 (탭 숨김 시 즉시 flush)

  // 인트로는 "한 번 본 사람"에겐 다시 재생하지 않는다. 진행이 IndexedDB로 영속되는 것과 정합을 위해
  // 세션 스코프(sessionStorage) 대신 영속 스토리지(localStorage)에 seen 플래그를 둔다 → 탭/브라우저를
  // 닫고 재방문해도 인트로가 반복되지 않는다. localStorage는 SSR에 없어 마운트 후 읽는다.
  // 페인트 직전에 판정해 게임 메인이 한 프레임 노출되는 깜빡임을 막는다.
  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(INTRO_SEEN_KEY);
    } catch {
      // 프라이빗 모드 등 접근 불가 → 못 본 것으로 간주(인트로 재생).
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(localStorage) 동기화용 정당한 마운트 1회 세팅
    setShowIntro(!seen);
  }, []);

  // 도움말(튜토리얼 책)은 최초 1회만 자동으로 연다. 이후엔 푸터 「도움말」 버튼으로 수동 열람.
  // 매 새로고침마다 자동으로 뜨던 문제 수정(영속 플래그, 인트로와 동일 패턴).
  useEffect(() => {
    let show = false;
    try {
      if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
        show = true;
        localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
      }
    } catch {
      show = true; // 프라이빗 모드 등 접근 불가 → 이번엔 한 번 보여준다(폴백).
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(localStorage) 동기화용 마운트 1회 세팅
    setShowTutorial(show);
  }, []);

  const finishIntro = useCallback(() => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // 저장 불가(프라이빗 모드·쿼터) 시 조용히 무시 — 이번 표시만 끈다.
    }
    setShowIntro(false);
  }, []);

  // 마운트 시 IndexedDB 저장분을 1회 로드해 이전 진행을 복원한다(비동기 → 완료까지 검은 커버).
  // 저장이 없거나 손상·IDB 불가면 새 게임 그대로 두고 hydrated만 켠다.
  useEffect(() => {
    let alive = true;
    loadSave().then((save) => {
      if (!alive) return;
      if (save) {
        setState(save.gameState);
        setAlliesSeen(new Set(save.flags.alliesSeen));
        setAcked(new Set(save.flags.acked));
        setMissionDismissed(save.flags.missionDismissed);
        setLastNewsDay(save.flags.lastNewsDay);
        setEndingSeen(save.flags.endingSeen);
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 상태·플래그가 바뀌면 디바운스 후 저장한다. 로드 완료(hydrated) 전엔 초기 상태로 덮어쓰지 않도록 건너뛴다.
  useEffect(() => {
    if (!hydrated) return;
    const data: SaveData = {
      version: SAVE_VERSION,
      gameState: state,
      flags: { alliesSeen: [...alliesSeen], acked: [...acked], missionDismissed, lastNewsDay, endingSeen },
    };
    pendingSave.current = data;
    const t = setTimeout(() => void writeSave(data), 500);
    return () => clearTimeout(t);
  }, [hydrated, state, alliesSeen, acked, missionDismissed, lastNewsDay, endingSeen]);

  // 탭이 숨겨지면 디바운스 대기 없이 마지막 상태를 즉시 저장(직전 행동 유실 방지).
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && pendingSave.current) void writeSave(pendingSave.current);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  // 새 게임 — 저장분을 지우고 상태·플래그를 초기화한다(되돌릴 수 없음, 확인 모달을 거친다).
  const resetGame = useCallback(() => {
    void clearSave();
    setState(initialState());
    setAlliesSeen(new Set());
    setAcked(new Set());
    setMissionDismissed(false);
    setLastNewsDay(1);
    setEndingSeen(false);
    setShowEnding(false);
    setEventMerchant(null);
    setNews(null);
    setAllyEvent(null);
    setShowResetConfirm(false);
    setNotice("처음부터 다시 시작한다. 폐허가 된 고향을 다시 세워라.");
  }, []);

  // 재건 완성(최고 단계 "재건된 왕국", 인구 180+) 최초 도달 시 엔딩을 1회 띄운다. 오픈엔드라 닫으면 계속 플레이.
  useEffect(() => {
    if (!hydrated || endingSeen) return;
    if (homeStage(state.placements).tier >= 4) {
      // 파생 조건(최고 단계 도달) 최초 1회 트리거 — 정당한 setState-in-effect(모달 표시 + 영속 플래그).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEndingSeen(true);
      setShowEnding(true);
    }
  }, [hydrated, endingSeen, state.placements]);

  const dismissEnding = useCallback(() => setShowEnding(false), []);

  const dismissMission = useCallback(() => setMissionDismissed(true), []);
  const acknowledgeStep = useCallback(
    (id: string) => setAcked((prev) => new Set(prev).add(id)),
    [],
  );
  // 미션 목록 열기 = 온보딩 완료 안내를 본 것으로 처리(완료 코치 종료).
  const openMissions = useCallback(() => {
    setShowMissions(true);
    setAcked((prev) => new Set(prev).add("onboarding-done"));
  }, []);
  // 진행 중 미션을 리스트에서 다시 눌러 튜토리얼 재활성화(건너뛰기 해제 + 안내 기록 초기화). 게임 상태는 유지.
  const restartMission = useCallback(() => {
    setMissionDismissed(false);
    setAcked(new Set());
    setShowMissions(false);
  }, []);

  const bookLevel = bookLevelFromXp(state.xp);
  const income = dailyIncome(state.placements);
  const pop = population(state.placements); // 완공 건물 인구 합
  const allies = activeAllies(pop); // 합류한 지인들
  const pendingAlly = allies.find((a) => !alliesSeen.has(a.id)) ?? null; // 아직 합류 연출 안 본 지인
  const acknowledgeAlly = useCallback(
    (id: string) => setAlliesSeen((prev) => new Set(prev).add(id)),
    [],
  );
  const clearAllyEvent = useCallback(() => setAllyEvent(null), []);
  // 날 경과 시 결정론 확률로 활성 지인 하나가 조력(재료·건설·골드·경험치). 효과 적용 + 모달 표시.
  // ⚠️ 모달은 setState 밖에서 띄운다. passDay/travelTo가 먼저 setState를 부른 뒤 이 함수를 호출하므로
  //    updater 안에서 view를 대입해 동기로 읽으면 eager-update가 건너뛰어져 모달이 누락됐다(이전 버그).
  //    updater가 최신 상태로 효과를 적용하고, 그 때 얻은 view를 flush 이후(queueMicrotask)에 표시한다.
  const applyAllyEvent = useCallback((newDay: number) => {
    let view: AllyEventView | null = null;
    setState((s) => {
      const res = computeAllyEvent(s, newDay);
      view = res?.view ?? null;
      return res ? res.next : s;
    });
    queueMicrotask(() => {
      if (view) setAllyEvent(view);
    });
  }, []);

  // 목적지 노드 선택 → 이동일수만큼 하루가 흐르고(→수입 정산) 그 마을의 상인·소문을 새로 불러온다.
  const travelTo = useCallback(
    async (dest: LocationId) => {
      if (dest === state.location || busy) return;
      const days = travelDays(state.location, dest);
      const gain = Math.round(
        dailyIncome(state.placements) * days * (1 + allyBonuses(pop).incomePct / 100),
      );
      const newDay = state.day + days;
      // 이동으로 날이 흐르면 최근 구매 기억이 옅어진다(품귀 완화).
      const decayedBuys = decayRecentBuys(state.recentBuys, days);
      // 완공 건물이 일수만큼 생산한 자재를 정리(알림용). 실제 인벤토리 반영은 아래 setState에서 최신 상태로.
      const produced = dailyProduction(state.placements);
      const prodEntries = Object.entries(produced) as [MaterialId, number][];
      const prodMsg =
        prodEntries.length > 0
          ? ` 생산: ${prodEntries.map(([id, n]) => `${MATERIAL_NAME[id]} ${n * days}`).join(", ")}.`
          : "";
      // 이동하면 이전 마을의 상인·소문·흥정은 모두 정리한다 (소문은 하루치 진실).
      setState((s) => {
        const inventory = { ...s.inventory };
        for (const [id, n] of Object.entries(dailyProduction(s.placements)) as [MaterialId, number][]) {
          inventory[id] = (inventory[id] ?? 0) + n * days;
        }
        return {
          ...s,
          day: newDay,
          gold: s.gold + gain,
          inventory,
          location: dest,
          townMerchants: [],
          merchant: null,
          haggle: null,
          clues: [],
          recentBuys: decayedBuys,
          sellPrices: {},
        };
      });
      applyAllyEvent(newDay); // 날 경과 → 지인 조력 이벤트 판정
      // 날이 바뀌면 아침 시황 뉴스를 하루 1회 띄운다 (목적지 무관, 논블로킹).
      if (newDay > lastNewsDay) {
        setLastNewsDay(newDay);
        setNewsPending(true);
        fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: newDay }),
        })
          .then((r) => r.json())
          .then((n: DailyNews) =>
            setNews({
              ...n,
              produced: prodEntries.length
                ? Object.fromEntries(prodEntries.map(([id, n2]) => [id, n2 * days]))
                : undefined,
            }),
          )
          .catch(() => {})
          .finally(() => setNewsPending(false));
      }
      if (dest === "home") {
        // 고향 귀환 시에도 떠돌이 상인 이벤트 판정 — 하루 넘기기와 동일 확률·결정론(도착일 기준).
        if (allyHash(newDay, 11) < EVENT_MERCHANT_CHANCE) {
          fetch("/api/event-merchant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ day: newDay, bookLevel, recentBuys: decayedBuys }),
          })
            .then((r) => r.json())
            .then((res: { merchant: PublicMerchant | null; rareId?: MaterialId; payId?: MaterialId }) => {
              if (res.merchant && res.rareId && res.payId) {
                setEventMerchant({ merchant: res.merchant, rareId: res.rareId, payId: res.payId });
              }
            })
            .catch(() => {});
        }
        setNotice(
          (gain > 0
            ? `고향으로 돌아왔다. ${days}일간 완성 건물이 ${gain}골드를 벌었다.`
            : "폐허가 된 고향으로 돌아왔다.") + prodMsg,
        );
        return;
      }
      setBusy(true);
      setNotice(`${locationName(dest)}에 도착했다. (${days}일 이동)` + prodMsg);
      // 튜토리얼(오두막 미완공) 중엔 코치가 가리킨 마을에서 반드시 살 수 있게 특산 자재를 보장한다.
      const hutBuilt = state.placements.some((p) => p.buildingId === "hut" && p.built);
      const guarantee = !missionDismissed && !hutBuilt ? (["wood", "stone"] as MaterialId[]) : undefined;
      try {
        const res = await fetch("/api/town", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: newDay, town: dest, bookLevel, recentBuys: decayedBuys, guarantee }),
        });
        const data: {
          merchants?: PublicMerchant[];
          rumors?: Rumor[];
          sellPrices?: Partial<Record<MaterialId, number>>;
        } = await res.json();
        setState((s) => ({
          ...s,
          townMerchants: data.merchants ?? [],
          clues: data.rumors ?? [],
          sellPrices: data.sellPrices ?? {},
        }));
      } catch {
        setNotice("마을 정보를 불러오지 못했다.");
      } finally {
        setBusy(false);
      }
    },
    [state.location, state.day, state.placements, state.recentBuys, lastNewsDay, busy, bookLevel, missionDismissed, pop, applyAllyEvent],
  );

  // 고향에서 하루를 넘긴다 — 이동 없이도 완성 건물의 수입·생산이 하루치 정산된다.
  const passDay = useCallback(() => {
    if (busy) return;
    const newDay = state.day + 1;
    const gain = Math.round(dailyIncome(state.placements) * (1 + allyBonuses(pop).incomePct / 100));
    const produced = dailyProduction(state.placements);
    const prodEntries = Object.entries(produced) as [MaterialId, number][];
    const prodMsg =
      prodEntries.length > 0
        ? ` 생산: ${prodEntries.map(([id, n]) => `${MATERIAL_NAME[id]} ${n}`).join(", ")}.`
        : "";
    setState((s) => {
      const inventory = { ...s.inventory };
      for (const [id, n] of Object.entries(dailyProduction(s.placements)) as [MaterialId, number][]) {
        inventory[id] = (inventory[id] ?? 0) + n;
      }
      return {
        ...s,
        day: newDay,
        gold: s.gold + gain,
        inventory,
        recentBuys: decayRecentBuys(s.recentBuys, 1),
      };
    });
    setNotice(
      (gain > 0 ? `하루가 흘렀다. 완성 건물이 ${gain}골드를 벌었다.` : "하루가 흘렀다. 고요한 하루였다.") +
        prodMsg,
    );
    applyAllyEvent(newDay); // 날 경과 → 지인 조력 이벤트 판정
    // 날이 바뀌면 아침 시황 뉴스를 하루 1회 띄운다.
    if (newDay > lastNewsDay) {
      setLastNewsDay(newDay);
      setNewsPending(true);
      fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: newDay }),
      })
        .then((r) => r.json())
        .then((n: DailyNews) =>
          setNews({ ...n, produced: prodEntries.length ? produced : undefined }),
        )
        .catch(() => {})
        .finally(() => setNewsPending(false));
    }
    // 떠돌이 상인 이벤트 — 낮은 확률로 등장(초상화 모달 → 흥정). 그날 tier3 파는 상인이 없으면 서버가 null 반환.
    if (allyHash(newDay, 11) < EVENT_MERCHANT_CHANCE) {
      fetch("/api/event-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: newDay, bookLevel, recentBuys: state.recentBuys }),
      })
        .then((r) => r.json())
        .then((res: { merchant: PublicMerchant | null; rareId?: MaterialId; payId?: MaterialId }) => {
          if (res.merchant && res.rareId && res.payId) {
            setEventMerchant({ merchant: res.merchant, rareId: res.rareId, payId: res.payId });
          }
        })
        .catch(() => {});
    }
  }, [state.day, state.placements, state.recentBuys, busy, lastNewsDay, pop, bookLevel, applyAllyEvent]);

  const startHaggle = useCallback((merchant: PublicMerchant, materialId: MaterialId) => {
    const mat = merchant.materials.find((x) => x.id === materialId);
    if (!mat || mat.locked) return;
    setState((s) => {
      // 이 상인과 쌓아둔 호감도가 있으면 감쇠 적용 후 이어간다(없으면 서버가 성향별 초기값 시드).
      // 노상인(지인) perk = 흥정 시작 호감도 보너스. 기억 있으면 여기서 가산, 없으면 서버 시드에 가산(2레이어).
      const mem = s.merchantMemory?.[merchant.seed];
      const startBonus = allyBonuses(population(s.placements)).haggleStartBonus;
      const haggle: HaggleState = {
        materialId,
        materialName: mat.name,
        offer: mat.offer,
        currentPrice: mat.offer,
        disposition: mem ? Math.min(100, decayedDisposition(mem, s.day) + startBonus) : undefined,
        turnsLeft: HAGGLE_TURNS,
        qualityApplied: false,
        tokenAwarded: mem?.tokenTaken ?? false,
        status: "ongoing",
        log: [{ role: "merchant", text: merchant.greeting }],
        pending: false,
        mode: "gold",
      };
      return { ...s, merchant, haggle };
    });
  }, []);

  // 물물교환 시작. 희귀템(tier3) 1개를 상인이 원하는 물품 N개로 교환. N은 흥정으로 깎이며 첫 턴 후 확정된다.
  const startBarter = useCallback(
    (merchant: PublicMerchant, rareId: MaterialId, payId: MaterialId) => {
      const mat = merchant.materials.find((x) => x.id === rareId);
      const pay = merchant.wants.find((w) => w.id === payId);
      if (!mat || mat.locked || mat.tier !== 3 || !pay) return;
      setState((s) => {
        const mem = s.merchantMemory?.[merchant.seed];
        const startBonus = allyBonuses(population(s.placements)).haggleStartBonus;
        const haggle: HaggleState = {
          materialId: rareId,
          materialName: mat.name,
          offer: 0,
          currentPrice: 0,
          disposition: mem ? Math.min(100, decayedDisposition(mem, s.day) + startBonus) : undefined,
          turnsLeft: HAGGLE_TURNS,
          qualityApplied: false,
          tokenAwarded: mem?.tokenTaken ?? false,
          status: "ongoing",
          log: [{ role: "merchant", text: merchant.greeting }],
          pending: false,
          mode: "barter",
          payMaterialId: payId,
          payMaterialName: pay.name,
        };
        return { ...s, merchant, haggle };
      });
    },
    [],
  );

  // 떠돌이 상인 [흥정한다] → 그 상인과 물물교환 흥정 시작(기존 startBarter 재사용). [돌려보낸다] → 그냥 닫기.
  const acceptEventMerchant = useCallback(() => {
    if (!eventMerchant) return;
    startBarter(eventMerchant.merchant, eventMerchant.rareId, eventMerchant.payId);
    setEventMerchant(null);
  }, [eventMerchant, startBarter]);
  const dismissEventMerchant = useCallback(() => setEventMerchant(null), []);

  const sendUtterance = useCallback(async (text: string) => {
    const m = state.merchant;
    const h = state.haggle;
    if (!m || !h || h.pending || h.status !== "ongoing") return;
    setState((s) => (s.haggle ? { ...s, haggle: { ...s.haggle, pending: true, log: [...s.haggle.log, { role: "player", text }] } } : s));
    try {
      const res = await fetch("/api/haggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: m.seed,
          materialId: h.materialId,
          utterance: text,
          disposition: h.disposition,
          turnsLeft: h.turnsLeft,
          qualityApplied: h.qualityApplied,
          tokenAwarded: h.tokenAwarded,
          mode: h.mode,
          payMaterialId: h.payMaterialId,
          day: state.day,
          recentBuys: state.recentBuys,
          // 노상인 perk: 서버가 첫 턴 시드(disposition undefined)에만 가산. 2턴+는 누적값이 넘어와 중복 없음.
          allyHaggleBonus: allyBonuses(population(state.placements)).haggleStartBonus,
          persona: {
            name: m.name,
            appearance: m.appearance,
            greeting: m.greeting,
            personalityTone: m.personalityTone,
          },
        }),
      });
      const d: {
        category?: HaggleCategory;
        line: string;
        disposition: number;
        currentPrice: number;
        turnsLeft: number;
        status: HaggleState["status"];
        qualityApplied: boolean;
        gotToken?: boolean;
        weaknessHit?: boolean;
        backfire?: boolean;
      } = await res.json();
      setState((s) => {
        if (!s.haggle) return s;
        const dispositionDelta =
          s.haggle.disposition === undefined ? undefined : d.disposition - s.haggle.disposition;
        const priceDelta = d.currentPrice - s.haggle.currentPrice;
        const log: HaggleState["log"] = [
          ...s.haggle.log,
          { role: "merchant", text: d.line, category: d.category, dispositionDelta, priceDelta, weaknessHit: d.weaknessHit, backfire: d.backfire },
        ];
        // 고호감도 보상: 상인이 「상인의 신표」를 선물 → 인벤토리에 1개 추가 (흥정 1회 1개).
        const inventory = d.gotToken
          ? { ...s.inventory, token: (s.inventory.token ?? 0) + 1 }
          : s.inventory;
        if (d.gotToken) log.push({ role: "system", text: "상인이 크게 감복해 「상인의 신표」를 건넸다." });
        return {
          ...s,
          inventory,
          haggle: {
            ...s.haggle,
            disposition: d.disposition,
            currentPrice: d.currentPrice,
            turnsLeft: d.turnsLeft,
            qualityApplied: d.qualityApplied,
            tokenAwarded: s.haggle.tokenAwarded || !!d.gotToken,
            status: d.status,
            pending: false,
            log,
          },
        };
      });
    } catch {
      setState((s) => (s.haggle ? { ...s, haggle: { ...s.haggle, pending: false, log: [...s.haggle.log, { role: "system", text: "말이 통하지 않았다…" }] } } : s));
    }
  }, [state.merchant, state.haggle, state.day, state.recentBuys, state.placements]);

  const buy = useCallback((qty: number) => {
    let msg = "";
    setState((s) => {
      const h = s.haggle;
      if (!h || qty <= 0 || h.currentPrice <= 0) return s;
      // 획득한 자재만큼 최근 구매량 누적 → 다음 시세에 품귀 반영.
      const recentBuys = { ...s.recentBuys, [h.materialId]: (s.recentBuys[h.materialId] ?? 0) + qty };
      if (h.mode === "barter" && h.payMaterialId) {
        const units = h.currentPrice * qty; // 지불 물품 총 개수
        if ((s.inventory[h.payMaterialId] ?? 0) < units) return s;
        const inventory = {
          ...s.inventory,
          [h.payMaterialId]: (s.inventory[h.payMaterialId] ?? 0) - units,
          [h.materialId]: (s.inventory[h.materialId] ?? 0) + qty,
        };
        msg = `${h.payMaterialName} ${units}개를 내주고 ${h.materialName} ${qty}개를 얻었다.`;
        return { ...s, inventory, recentBuys, haggle: null, merchantMemory: rememberMerchant(s) };
      }
      const cost = h.currentPrice * qty;
      if (cost > s.gold) return s;
      const inventory = { ...s.inventory, [h.materialId]: (s.inventory[h.materialId] ?? 0) + qty };
      msg = `${h.materialName} ${qty}개를 사들였다.`;
      return { ...s, gold: s.gold - cost, inventory, recentBuys, haggle: null, merchantMemory: rememberMerchant(s) };
    });
    if (msg) setNotice(msg);
  }, []);

  // 잉여 자재를 현재 마을 시세(sellPrices)로 팔아 골드화. 판매가는 마을 진입 시 서버가 채운다.
  const sell = useCallback((materialId: MaterialId, qty: number) => {
    let msg = "";
    setState((s) => {
      const have = s.inventory[materialId] ?? 0;
      const n = Math.min(qty, have);
      const price = s.sellPrices[materialId] ?? 0;
      if (n <= 0 || price <= 0) return s;
      const inventory = { ...s.inventory, [materialId]: have - n };
      msg = `${MATERIAL_NAME[materialId]} ${n}개를 팔아 ${price * n}골드를 얻었다.`;
      return { ...s, gold: s.gold + price * n, inventory };
    });
    if (msg) setNotice(msg);
  }, []);

  const closeHaggle = useCallback(
    () => setState((s) => ({ ...s, haggle: null, merchantMemory: rememberMerchant(s) })),
    [],
  );

  // 빈 타일에 건물 터를 놓는다 (선행·책 게이팅 통과 시). 같은 종류 복수 배치 허용.
  const placeBuilding = useCallback((buildingId: string, x: number, y: number) => {
    const id = crypto.randomUUID();
    let msg = "";
    setState((s) => {
      const b = BUILDINGS.find((x2) => x2.id === buildingId);
      if (!b) return s;
      // 바닥(flat)과 건물은 별개 레이어 — 같은 레이어끼리만 충돌. 건물은 바닥 위에 세울 수 있다.
      const newFlat = !!b.flat;
      const occupied = s.placements.some(
        (p) => p.x === x && p.y === y && !!BUILDINGS.find((z) => z.id === p.buildingId)?.flat === newFlat,
      );
      if (occupied) return s;
      if (!checkPlace(buildingId, s).canPlace) return s;
      // 장식물은 자재 불필요 → 즉시 완공 상태로 배치.
      msg = b.deco ? `${b.name}을(를) 놓았다.` : `${b.name} 터를 놓았다. 자재를 채워 완공하라.`;
      return {
        ...s,
        placements: [...s.placements, { id, buildingId, x, y, progress: {}, built: !!b.deco }],
      };
    });
    if (msg) setNotice(msg);
  }, []);

  // 자재 1개를 특정 건물 인스턴스에 투입. 마지막 슬롯이 채워지면 그 자리에서 완공 처리.
  const deposit = useCallback((placementId: string, materialId: MaterialId) => {
    let finished: (typeof BUILDINGS)[number] | null = null;
    let rebateTotal = 0;
    setState((s) => {
      const idx = s.placements.findIndex((p) => p.id === placementId);
      if (idx < 0) return s;
      const pl = s.placements[idx];
      if (pl.built) return s;
      const b = BUILDINGS.find((x) => x.id === pl.buildingId);
      if (!b) return s;
      const need = b.requires[materialId] ?? 0;
      const have = pl.progress[materialId] ?? 0;
      if (have >= need || (s.inventory[materialId] ?? 0) <= 0) return s;

      const inventory = { ...s.inventory, [materialId]: (s.inventory[materialId] ?? 0) - 1 };
      const progress = { ...pl.progress, [materialId]: have + 1 };
      const complete = (Object.entries(b.requires) as [MaterialId, number][]).every(
        ([id, n]) => (progress[id] ?? 0) >= n,
      );
      const placements = [...s.placements];
      placements[idx] = { ...pl, progress, built: complete };
      if (complete) finished = b;
      if (!complete) return { ...s, inventory, placements };
      const bonus = allyBonuses(population(s.placements));
      const rebated = buildRebate(inventory, b.requires, bonus.buildRebatePct);
      rebateTotal = rebated.total;
      return {
        ...s,
        inventory: rebated.inventory,
        placements,
        xp: s.xp + Math.round(b.xp * (1 + bonus.bookXpPct / 100)),
      };
    });
    if (finished) {
      const b = finished as (typeof BUILDINGS)[number];
      const rebate = rebateTotal > 0 ? ` 대목수가 자재 ${rebateTotal}개를 아껴 돌려줬다.` : "";
      setNotice(`${b.name}을(를) 완성했다. 경험치 +${b.xp}.${rebate}`);
    }
  }, []);

  // 부족분과 보유량 중 작은 만큼 그 자재를 한 번에 투입한다. 마지막 슬롯이 차면 완공 처리.
  const depositMax = useCallback((placementId: string, materialId: MaterialId) => {
    let finished: (typeof BUILDINGS)[number] | null = null;
    let rebateTotal = 0;
    setState((s) => {
      const idx = s.placements.findIndex((p) => p.id === placementId);
      if (idx < 0) return s;
      const pl = s.placements[idx];
      if (pl.built) return s;
      const b = BUILDINGS.find((x) => x.id === pl.buildingId);
      if (!b) return s;
      const need = b.requires[materialId] ?? 0;
      const have = pl.progress[materialId] ?? 0;
      const qty = Math.min(need - have, s.inventory[materialId] ?? 0);
      if (qty <= 0) return s;

      const inventory = { ...s.inventory, [materialId]: (s.inventory[materialId] ?? 0) - qty };
      const progress = { ...pl.progress, [materialId]: have + qty };
      const complete = (Object.entries(b.requires) as [MaterialId, number][]).every(
        ([id, n]) => (progress[id] ?? 0) >= n,
      );
      const placements = [...s.placements];
      placements[idx] = { ...pl, progress, built: complete };
      if (complete) finished = b;
      if (!complete) return { ...s, inventory, placements };
      const bonus = allyBonuses(population(s.placements));
      const rebated = buildRebate(inventory, b.requires, bonus.buildRebatePct);
      rebateTotal = rebated.total;
      return {
        ...s,
        inventory: rebated.inventory,
        placements,
        xp: s.xp + Math.round(b.xp * (1 + bonus.bookXpPct / 100)),
      };
    });
    if (finished) {
      const b = finished as (typeof BUILDINGS)[number];
      const rebate = rebateTotal > 0 ? ` 대목수가 자재 ${rebateTotal}개를 아껴 돌려줬다.` : "";
      setNotice(`${b.name}을(를) 완성했다. 경험치 +${b.xp}.${rebate}`);
    }
  }, []);

  // 건물을 헐고(완공 여부 무관) 투입·소모한 자재를 전부 인벤토리로 반환 + 타일 반납.
  const reclaim = useCallback((placementId: string) => {
    let name = "";
    setState((s) => {
      const pl = s.placements.find((p) => p.id === placementId);
      if (!pl) return s;
      const inventory = { ...s.inventory };
      for (const [id, n] of Object.entries(pl.progress)) {
        inventory[id] = (inventory[id] ?? 0) + n;
      }
      name = BUILDINGS.find((x) => x.id === pl.buildingId)?.name ?? "";
      return { ...s, inventory, placements: s.placements.filter((p) => p.id !== placementId) };
    });
    if (name) setNotice(`${name}을(를) 헐고 자재를 반환했다.`);
  }, []);

  // 건물/바닥을 옮긴다. 같은 레이어가 점유한 타일이면 무시(바닥 위로 건물 이동은 허용).
  const moveBuilding = useCallback((placementId: string, x: number, y: number) => {
    setState((s) => {
      const moving = s.placements.find((p) => p.id === placementId);
      if (!moving) return s;
      const movingFlat = !!BUILDINGS.find((z) => z.id === moving.buildingId)?.flat;
      const occupied = s.placements.some(
        (p) => p.id !== placementId && p.x === x && p.y === y && !!BUILDINGS.find((z) => z.id === p.buildingId)?.flat === movingFlat,
      );
      if (occupied) return s;
      return { ...s, placements: s.placements.map((p) => (p.id === placementId ? { ...p, x, y } : p)) };
    });
  }, []);

  // 건물 좌우 반전(회전).
  const rotateBuilding = useCallback((placementId: string) => {
    setState((s) => ({
      ...s,
      placements: s.placements.map((p) => (p.id === placementId ? { ...p, flipped: !p.flipped } : p)),
    }));
  }, []);

  const next = xpToNext(state.xp);
  const invCount = Object.values(state.inventory).reduce((a, b) => a + b, 0);
  // 엔딩 요약용 완공 건물 수 (장식·조경 제외).
  const builtCount = state.placements.filter(
    (p) => p.built && !BUILDINGS.find((b) => b.id === p.buildingId)?.deco,
  ).length;
  const mission = missionDismissed
    ? null
    : activeMission(state, acked, { worldMapOpen: showWorldMap }); // 현재 목표(상태에서 계산)
  const missionList = missionStatuses(state, acked, { worldMapOpen: showWorldMap }); // 목록 모달용

  return {
    state,
    notice,
    busy,
    showTutorial,
    setShowTutorial,
    showNotebook,
    setShowNotebook,
    showBook,
    setShowBook,
    showInventory,
    setShowInventory,
    showWorldMap,
    setShowWorldMap,
    showRelations,
    setShowRelations,
    showIntro,
    setShowIntro,
    hydrated,
    showResetConfirm,
    setShowResetConfirm,
    resetGame,
    showEnding,
    dismissEnding,
    builtCount,
    news,
    setNews,
    newsPending,
    finishIntro,
    mission,
    dismissMission,
    acknowledgeStep,
    acked,
    missionDismissed,
    missionList,
    showMissions,
    setShowMissions,
    openMissions,
    restartMission,
    showPriceChart,
    setShowPriceChart,
    showBuildingCodex,
    setShowBuildingCodex,
    bookLevel,
    income,
    population: pop,
    allies,
    pendingAlly,
    acknowledgeAlly,
    showAllies,
    setShowAllies,
    allyEvent,
    clearAllyEvent,
    eventMerchant,
    acceptEventMerchant,
    dismissEventMerchant,
    next,
    invCount,
    travelTo,
    passDay,
    startHaggle,
    startBarter,
    sendUtterance,
    buy,
    sell,
    closeHaggle,
    placeBuilding,
    deposit,
    depositMax,
    reclaim,
    moveBuilding,
    rotateBuilding,
  };
}

// 엔진 훅의 반환 전체 — 렌더 조각(GameFooter·ModalStack)에 통째로 넘겨 props 폭증을 피한다.
export type GameEngine = ReturnType<typeof useGameEngine>;
