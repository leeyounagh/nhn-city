"use client";
// 게임 오케스트레이터. 클라이언트 상태를 소유하고 서버 라우트를 호출해 루프를 돈다.
import { useCallback, useLayoutEffect, useState } from "react";
import type { DailyNews, HaggleCategory, LocationId, MaterialId, PublicMerchant, Rumor, TownId } from "@/types/game";
import { BUILDINGS, HAGGLE_TURNS, MATERIAL_NAME, MAX_BOOK_LEVEL, TOWN_BY_ID, travelDays, locationName } from "@/lib/game-data";
import {
  type GameState,
  type HaggleState,
  type MerchantMemory,
  initialState,
  bookLevelFromXp,
  dailyIncome,
  dailyProduction,
  xpToNext,
  checkPlace,
  decayRecentBuys,
  decayedDisposition,
  homeIcon,
} from "@/lib/game-state";
import { WorldMap } from "@/components/WorldMap";
import { TownView } from "@/components/TownView";
import { IsoCityMap } from "@/components/IsoCityMap";
import { HaggleDialog } from "@/components/HaggleDialog";
import { ClueNotebook } from "@/components/ClueNotebook";
import { BookCodex } from "@/components/BookCodex";
import { GameIcon, type GameIconName } from "@/components/GameIcon";
import { InventoryPanel } from "@/components/InventoryPanel";
import { IntroCutscene } from "@/components/IntroCutscene";

const INTRO_SEEN_KEY = "lc_intro_seen";

// 흥정 종료 시 그 상인과의 호감도·신표 수령을 기억에 저장한다(seed=정체성 키). 대화 없이 닫으면 유지.
function rememberMerchant(s: GameState): Record<number, MerchantMemory> {
  if (!s.merchant || !s.haggle || s.haggle.disposition === undefined) return s.merchantMemory ?? {};
  return {
    ...(s.merchantMemory ?? {}),
    [s.merchant.seed]: {
      disposition: s.haggle.disposition,
      lastDay: s.day,
      tokenTaken: s.haggle.tokenAwarded,
    },
  };
}

export function Game() {
  const [state, setState] = useState<GameState>(initialState);
  const [notice, setNotice] = useState<string>("퇴직기사와 함께 국보 「마법의 책」을 품고 폐허가 된 고향으로 돌아왔다. 소문을 읽어 상인을 찾고, 거래로 도시를 다시 세워라.");
  const [busy, setBusy] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  // null = 판정 전(첫 프레임) · true = 재생 · false = 종료. 판정 전엔 검은 커버로 게임 노출을 막는다.
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [news, setNews] = useState<DailyNews | null>(null); // 오늘 아침 시황 (모달)
  const [lastNewsDay, setLastNewsDay] = useState(1); // 뉴스를 마지막으로 띄운 날 (하루 1회)

  // 세션에 한 번만 자동 재생 (새로고침 반복 방지). sessionStorage는 SSR에 없어 마운트 후 읽는다.
  // 페인트 직전에 판정해 게임 메인이 한 프레임 노출되는 깜빡임을 막는다.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(sessionStorage) 동기화용 정당한 마운트 1회 세팅
    setShowIntro(!sessionStorage.getItem(INTRO_SEEN_KEY));
  }, []);

  const finishIntro = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setShowIntro(false);
  }, []);

  const bookLevel = bookLevelFromXp(state.xp);
  const income = dailyIncome(state.placements);

  // 목적지 노드 선택 → 이동일수만큼 하루가 흐르고(→수입 정산) 그 마을의 상인·소문을 새로 불러온다.
  const travelTo = useCallback(
    async (dest: LocationId) => {
      if (dest === state.location || busy) return;
      const days = travelDays(state.location, dest);
      const gain = dailyIncome(state.placements) * days;
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
      // 날이 바뀌면 아침 시황 뉴스를 하루 1회 띄운다 (목적지 무관, 논블로킹).
      if (newDay > lastNewsDay) {
        setLastNewsDay(newDay);
        fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: newDay }),
        })
          .then((r) => r.json())
          .then((n: DailyNews) => setNews(n))
          .catch(() => {});
      }
      if (dest === "home") {
        setNotice(
          (gain > 0
            ? `고향으로 돌아왔다. ${days}일간 완성 건물이 ${gain}골드를 벌었다.`
            : "폐허가 된 고향으로 돌아왔다.") + prodMsg,
        );
        return;
      }
      setBusy(true);
      setNotice(`${locationName(dest)}에 도착했다. (${days}일 이동)` + prodMsg);
      try {
        const res = await fetch("/api/town", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: newDay, town: dest, bookLevel, recentBuys: decayedBuys }),
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
    [state.location, state.day, state.placements, state.recentBuys, lastNewsDay, busy, bookLevel],
  );

  // 고향에서 하루를 넘긴다 — 이동 없이도 완성 건물의 수입·생산이 하루치 정산된다.
  const passDay = useCallback(() => {
    if (busy) return;
    const newDay = state.day + 1;
    const gain = dailyIncome(state.placements);
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
        gold: s.gold + dailyIncome(s.placements),
        inventory,
        recentBuys: decayRecentBuys(s.recentBuys, 1),
      };
    });
    setNotice(
      (gain > 0 ? `하루가 흘렀다. 완성 건물이 ${gain}골드를 벌었다.` : "하루가 흘렀다. 고요한 하루였다.") +
        prodMsg,
    );
    // 날이 바뀌면 아침 시황 뉴스를 하루 1회 띄운다.
    if (newDay > lastNewsDay) {
      setLastNewsDay(newDay);
      fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: newDay }),
      })
        .then((r) => r.json())
        .then((n: DailyNews) => setNews(n))
        .catch(() => {});
    }
  }, [state.day, state.placements, busy, lastNewsDay]);

  const startHaggle = useCallback((merchant: PublicMerchant, materialId: MaterialId) => {
    const mat = merchant.materials.find((x) => x.id === materialId);
    if (!mat || mat.locked) return;
    setState((s) => {
      // 이 상인과 쌓아둔 호감도가 있으면 감쇠 적용 후 이어간다(없으면 서버가 성향별 초기값 시드).
      const mem = s.merchantMemory?.[merchant.seed];
      const haggle: HaggleState = {
        materialId,
        materialName: mat.name,
        offer: mat.offer,
        currentPrice: mat.offer,
        disposition: mem ? decayedDisposition(mem, s.day) : undefined,
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
        const haggle: HaggleState = {
          materialId: rareId,
          materialName: mat.name,
          offer: 0,
          currentPrice: 0,
          disposition: mem ? decayedDisposition(mem, s.day) : undefined,
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
      } = await res.json();
      setState((s) => {
        if (!s.haggle) return s;
        const dispositionDelta =
          s.haggle.disposition === undefined ? undefined : d.disposition - s.haggle.disposition;
        const priceDelta = d.currentPrice - s.haggle.currentPrice;
        const log: HaggleState["log"] = [
          ...s.haggle.log,
          { role: "merchant", text: d.line, category: d.category, dispositionDelta, priceDelta },
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
  }, [state.merchant, state.haggle, state.day, state.recentBuys]);

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
      msg = `${qty}개를 사들였다.`;
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
      if (s.placements.some((p) => p.x === x && p.y === y)) return s; // 이미 점유된 타일
      if (!checkPlace(buildingId, s).canPlace) return s;
      const b = BUILDINGS.find((x2) => x2.id === buildingId);
      if (!b) return s;
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
      return complete
        ? { ...s, inventory, placements, xp: s.xp + b.xp }
        : { ...s, inventory, placements };
    });
    if (finished) {
      const b = finished as (typeof BUILDINGS)[number];
      setNotice(`${b.name}을(를) 완성했다. 경험치 +${b.xp}.`);
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

  // 건물을 빈 타일로 옮긴다 (점유 타일이면 무시).
  const moveBuilding = useCallback((placementId: string, x: number, y: number) => {
    setState((s) => {
      if (s.placements.some((p) => p.x === x && p.y === y)) return s; // 점유된 타일엔 못 옮김
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

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-stone-950 to-stone-900 text-stone-200">
      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} onReplayStory={() => setShowIntro(true)} />
      )}

      {state.location === "home" ? (
        // 고향맵: 한 화면 고정. 맵이 남는 공간(flex-1)을 전부 차지하고 세로 스크롤 없음.
        <main className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2">
          <p className="mb-1.5 shrink-0 truncate px-1 text-xs italic text-stone-400">{notice}</p>
          <IsoCityMap
            state={state}
            onPlace={placeBuilding}
            onDeposit={deposit}
            onReclaim={reclaim}
            onMove={moveBuilding}
            onRotate={rotateBuilding}
          />
        </main>
      ) : (
        // 마을뷰: 한 화면 고정. 미리보기는 위에 고정, 상인/소문/판매만 내부 스크롤.
        <main className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2">
          <p className="mb-1.5 shrink-0 truncate px-1 text-xs italic text-stone-400">{notice}</p>
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
            <TownView
              townId={state.location as TownId}
              townName={locationName(state.location)}
              industryName={TOWN_BY_ID[state.location as TownId].industryName}
              merchants={state.townMerchants}
              rumors={state.clues}
              bookLevel={bookLevel}
              busy={busy}
              inventory={state.inventory}
              sellPrices={state.sellPrices}
              onHaggle={startHaggle}
              onBarter={startBarter}
              onSell={sell}
            />
          </div>
        </main>
      )}

      {state.haggle && state.merchant && (
        <HaggleDialog
          merchant={state.merchant}
          haggle={state.haggle}
          gold={state.gold}
          inventory={state.inventory}
          onSend={sendUtterance}
          onBuy={buy}
          onClose={closeHaggle}
        />
      )}

      {showWorldMap && (
        <WorldMapModal
          location={state.location}
          homeIconId={homeIcon(state.placements)}
          busy={busy}
          onTravel={(dest) => {
            setShowWorldMap(false);
            travelTo(dest);
          }}
          onClose={() => setShowWorldMap(false)}
        />
      )}

      {showInventory && (
        <InventoryPanel inventory={state.inventory} onClose={() => setShowInventory(false)} />
      )}

      {showNotebook && (
        <ClueNotebook clues={state.clues} onClose={() => setShowNotebook(false)} />
      )}

      {showBook && (
        <BookCodex bookLevel={bookLevel} xp={state.xp} onClose={() => setShowBook(false)} />
      )}

      {showIntro === null && <div className="fixed inset-0 z-[60] bg-black" />}
      {showIntro === true && <IntroCutscene onFinish={finishIntro} />}

      {news && <NewsModal news={news} onClose={() => setNews(null)} />}

      <footer className="shrink-0 border-t border-amber-900/40 bg-gradient-to-t from-stone-950 via-stone-950/95 to-stone-900/90 shadow-[0_-6px_20px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <span className="font-display hidden pr-1 text-lg font-bold tracking-wider text-amber-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] sm:inline">
            Ashen Kingdom
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <ResChip label="골드" value={`${state.gold}`} accent="text-amber-300" icon="coins" />
            <ResChip label="일차" value={`${state.day}일`} />
            <ResChip label="수입" value={`+${income}`} accent="text-emerald-300" icon="income" />
            <button
              onClick={() => setShowBook(true)}
              className="flex items-center gap-1.5 rounded-md border border-sky-900/50 bg-sky-950/30 px-2.5 py-1 shadow-sm transition hover:border-sky-600/60 hover:bg-sky-900/40"
            >
              <GameIcon name="spellBook" className="h-4 w-4 text-sky-300" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-sky-500/80">마법의 책</span>
              <span className="text-sm font-bold text-sky-300">Lv.{bookLevel}</span>
              {bookLevel >= MAX_BOOK_LEVEL ? (
                <span className="text-[10px] font-semibold text-amber-300">최대</span>
              ) : (
                next && <span className="text-[10px] text-stone-500">· 다음 {next.need}</span>
              )}
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* 메인 액션 — 색으로 위계. 하루 넘기기(주)=금색, 이동=stone. */}
            <button
              onClick={() => setShowWorldMap(true)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-600 bg-stone-800 px-4 text-sm font-medium tracking-wide text-stone-100 transition hover:bg-stone-700"
            >
              <GameIcon name="footprint" className="h-5 w-5" /> 이동
            </button>
            {state.location === "home" && (
              <button
                onClick={passDay}
                disabled={busy}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-sm font-semibold tracking-wide text-stone-950 shadow-md shadow-amber-950/40 transition hover:bg-amber-500 disabled:opacity-50"
              >
                <GameIcon name="hourglass" className="h-5 w-5" /> 하루 넘기기
              </button>
            )}

            {/* 구분선 */}
            <span className="mx-0.5 hidden h-6 w-px bg-stone-700/60 sm:block" />

            {/* 보조 액션 — ghost */}
            {state.location !== "home" && (
              <button
                onClick={() => setShowInventory(true)}
                className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
              >
                <GameIcon name="chest" className="h-4 w-4" /> 창고{invCount > 0 ? ` (${invCount})` : ""}
              </button>
            )}
            <button
              onClick={() => setShowNotebook(true)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
            >
              <GameIcon name="scroll" className="h-4 w-4" /> 단서 노트{state.clues.length > 0 ? ` (${state.clues.length})` : ""}
            </button>
            <button
              onClick={() => setShowTutorial((v) => !v)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-400 transition hover:border-amber-600/50 hover:text-amber-200"
            >
              <GameIcon name="candle" className="h-4 w-4" /> 도움말
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 아침 시황 뉴스 모달. 이동으로 날이 바뀌면 하루 1회 뜬다. 이벤트가 있으면 폭락 마을·물품을 보여준다.
function NewsModal({ news, onClose }: { news: DailyNews; onClose: () => void }) {
  const ev = news.event;
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-amber-700/60 bg-stone-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="뉴스 닫기"
          className="absolute right-3 top-3 text-stone-400 hover:text-stone-200"
        >
          ✕
        </button>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-400"><GameIcon name="newspaper" className="h-4 w-4" /> 아침 시황</p>
        <p className="mb-3 text-base font-bold leading-snug text-stone-100">{news.headline}</p>
        {ev ? (
          <div className="rounded border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm">
            <p className="text-emerald-300">
              <b>{ev.townName}</b> {ev.industryName} 대풍작 — 특산품{" "}
              <span className="font-semibold text-amber-300">−{ev.pct}%</span>
            </p>
            <p className="mt-1 text-xs text-stone-400">{ev.materialNames.join(" · ")} 지금이 살 때.</p>
          </div>
        ) : (
          <p className="text-sm text-stone-400">특별한 사건은 없다. 장세가 잔잔하다.</p>
        )}
      </div>
    </div>
  );
}

// 월드맵을 오버레이 모달로 감싼다. 노드 클릭 시 이동 후 모달이 닫힌다. WorldMap 자체는 그대로 재사용.
function WorldMapModal({
  location,
  homeIconId,
  busy,
  onTravel,
  onClose,
}: {
  location: LocationId;
  homeIconId: string;
  busy: boolean;
  onTravel: (dest: LocationId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="mt-16 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex justify-end">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-700 bg-stone-900/80 text-stone-400 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            ✕
          </button>
        </div>
        <WorldMap location={location} homeIcon={homeIconId} busy={busy} onTravel={onTravel} />
      </div>
    </div>
  );
}

// 도움말 — 세계관 속 "고서"처럼 연출. 카드형 5장 + 오프닝 다시보기.
const GUIDE: { icon: GameIconName; title: string; body: React.ReactNode }[] = [
  {
    icon: "compass",
    title: "길을 떠나는 법",
    body: <>월드맵에서 마을을 눌러 이동한다. 이동한 날수만큼 하루가 흐르고, <span className="text-amber-300">완성된 건물</span>이 골드를 벌어준다.</>,
  },
  {
    icon: "scroll",
    title: "소문을 읽는 법",
    body: <>마을에 도는 소문으로 <span className="text-amber-300">어느 상인이 무엇을 가졌는지</span> 추리한다. 소문은 단서 노트에 자동 기록된다.</>,
  },
  {
    icon: "trade",
    title: "상인을 설득하는 법",
    body: <>자연어로 흥정한다. 성향에 맞는 말(아부·논리·대량구매…)로 <span className="text-amber-300">호감도</span>를 올리면 값이 내려간다. 협박은 대개 역효과.</>,
  },
  {
    icon: "hammer",
    title: "폐허를 복원하는 법",
    body: <>사 온 자재를 고향 건물에 채우면 완성된다. 완성 건물은 매일 <span className="text-amber-300">골드·자재</span>를 낸다.</>,
  },
  {
    icon: "spellBook",
    title: "마법의 책을 성장시키는 법",
    body: <>건물을 지어 경험치를 쌓으면 <span className="text-sky-300">마법의 책</span> 레벨이 올라 상인의 성향·약점·하한가가 드러난다.</>,
  },
];

function Tutorial({ onClose, onReplayStory }: { onClose: () => void; onReplayStory: () => void }) {
  return (
    <div
      className="book-backdrop fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="book-open relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-amber-700/50 bg-stone-900 shadow-2xl shadow-black/70 ring-1 ring-amber-900/40 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,164,65,0.12),transparent_60%)]" />

        {/* 표지 헤더 */}
        <div className="relative shrink-0 border-b border-amber-800/40 bg-gradient-to-b from-amber-950/40 to-transparent px-5 pb-4 pt-5 text-center">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            ✕
          </button>
          <GameIcon name="spellBook" className="mx-auto mb-1 h-9 w-9 text-amber-300 drop-shadow-[0_2px_6px_rgba(217,164,65,0.4)]" />
          <h2 className="font-display text-xl font-bold tracking-wide text-amber-200 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
            마법의 책
          </h2>
          <p className="mt-0.5 text-[11px] tracking-wide text-amber-500/70">초보 후계자를 위한 기록</p>
        </div>

        <div className="book-ink space-y-2.5 overflow-y-auto px-5 py-4">
          <p className="mb-1 text-center text-sm leading-6 text-stone-300">
            폐허가 된 고향을 다시 세우려면 — 상인을 <span className="text-amber-300">찾고</span>, 자재를 <span className="text-amber-300">거래하고</span>, 건물을 <span className="text-amber-300">복원</span>하라.
          </p>
          {GUIDE.map((g) => (
            <div key={g.title} className="flex items-start gap-3 rounded-xl border border-stone-700/70 bg-stone-800/40 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-800/40 bg-amber-950/30">
                <GameIcon name={g.icon} className="h-5 w-5 text-amber-400" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-100">{g.title}</p>
                <p className="text-sm leading-6 text-stone-400">{g.body}</p>
              </div>
            </div>
          ))}
          <div className="pt-1 text-center">
            <button
              onClick={onReplayStory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700/70 px-4 py-2 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
            >
              <GameIcon name="scroll" className="h-4 w-4" /> 오프닝 다시 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 하단 푸터의 리소스 배지 (골드·일차·수입). 라벨은 작게, 값은 굵게 강조색으로.
function ResChip({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: GameIconName }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-stone-700/60 bg-stone-900/60 px-2.5 py-1 shadow-sm">
      {icon && <GameIcon name={icon} className={`h-4 w-4 ${accent ?? "text-stone-400"}`} />}
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${accent ?? "text-stone-100"}`}>{value}</span>
    </div>
  );
}
