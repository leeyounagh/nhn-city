"use client";
// 게임 오케스트레이터. 클라이언트 상태를 소유하고 서버 라우트를 호출해 루프를 돈다.
import { useCallback, useEffect, useState } from "react";
import type { DailyNews, HaggleCategory, LocationId, MaterialId, PublicMerchant, Rumor, TownId } from "@/types/game";
import { BUILDINGS, HAGGLE_TURNS, MATERIAL_NAME, MAX_BOOK_LEVEL, TOWN_BY_ID, travelDays, locationName } from "@/lib/game-data";
import {
  type GameState,
  type HaggleState,
  initialState,
  bookLevelFromXp,
  dailyIncome,
  dailyProduction,
  xpToNext,
  checkPlace,
  decayRecentBuys,
  homeIcon,
} from "@/lib/game-state";
import { WorldMap } from "@/components/WorldMap";
import { TownView } from "@/components/TownView";
import { IsoCityMap } from "@/components/IsoCityMap";
import { HaggleDialog } from "@/components/HaggleDialog";
import { ClueNotebook } from "@/components/ClueNotebook";
import { InventoryPanel } from "@/components/InventoryPanel";
import { IntroCutscene } from "@/components/IntroCutscene";

const INTRO_SEEN_KEY = "lc_intro_seen";

export function Game() {
  const [state, setState] = useState<GameState>(initialState);
  const [notice, setNotice] = useState<string>("퇴직기사와 함께 국보 「마법의 책」을 품고 폐허가 된 고향으로 돌아왔다. 소문을 읽어 상인을 찾고, 거래로 도시를 다시 세워라.");
  const [busy, setBusy] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [news, setNews] = useState<DailyNews | null>(null); // 오늘 아침 시황 (모달)
  const [lastNewsDay, setLastNewsDay] = useState(1); // 뉴스를 마지막으로 띄운 날 (하루 1회)

  // 세션에 한 번만 자동 재생 (새로고침 반복 방지). sessionStorage는 SSR에 없어 마운트 후 읽는다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(sessionStorage) 동기화용 정당한 마운트 1회 세팅
    if (!sessionStorage.getItem(INTRO_SEEN_KEY)) setShowIntro(true);
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
    const haggle: HaggleState = {
      materialId,
      materialName: mat.name,
      offer: mat.offer,
      currentPrice: mat.offer,
      disposition: undefined,
      turnsLeft: HAGGLE_TURNS,
      qualityApplied: false,
      tokenAwarded: false,
      status: "ongoing",
      log: [{ role: "merchant", text: merchant.greeting }],
      pending: false,
      mode: "gold",
    };
    setState((s) => ({ ...s, merchant, haggle }));
  }, []);

  // 물물교환 시작. 희귀템(tier3) 1개를 상인이 원하는 물품 N개로 교환. N은 흥정으로 깎이며 첫 턴 후 확정된다.
  const startBarter = useCallback(
    (merchant: PublicMerchant, rareId: MaterialId, payId: MaterialId) => {
      const mat = merchant.materials.find((x) => x.id === rareId);
      const pay = merchant.wants.find((w) => w.id === payId);
      if (!mat || mat.locked || mat.tier !== 3 || !pay) return;
      const haggle: HaggleState = {
        materialId: rareId,
        materialName: mat.name,
        offer: 0,
        currentPrice: 0,
        disposition: undefined,
        turnsLeft: HAGGLE_TURNS,
        qualityApplied: false,
        tokenAwarded: false,
        status: "ongoing",
        log: [{ role: "merchant", text: merchant.greeting }],
        pending: false,
        mode: "barter",
        payMaterialId: payId,
        payMaterialName: pay.name,
      };
      setState((s) => ({ ...s, merchant, haggle }));
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
        return { ...s, inventory, recentBuys, haggle: null };
      }
      const cost = h.currentPrice * qty;
      if (cost > s.gold) return s;
      const inventory = { ...s.inventory, [h.materialId]: (s.inventory[h.materialId] ?? 0) + qty };
      msg = `${qty}개를 사들였다.`;
      return { ...s, gold: s.gold - cost, inventory, recentBuys, haggle: null };
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

  const closeHaggle = useCallback(() => setState((s) => ({ ...s, haggle: null })), []);

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
    <div className="min-h-screen w-full bg-gradient-to-b from-stone-950 to-stone-900 pb-24 text-stone-200">
      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} onReplayStory={() => setShowIntro(true)} />
      )}

      <p className="mx-auto max-w-6xl px-4 pt-3 text-sm italic text-stone-400">{notice}</p>

      {state.location === "home" ? (
        <main className="w-full px-4 py-4">
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
        <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
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

      {showIntro && <IntroCutscene onFinish={finishIntro} />}

      {news && <NewsModal news={news} onClose={() => setNews(null)} />}

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-amber-900/40 bg-gradient-to-t from-stone-950 via-stone-950/95 to-stone-900/90 shadow-[0_-6px_20px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <span className="font-display hidden pr-1 text-lg font-bold tracking-wider text-amber-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] sm:inline">
            Ashen Kingdom
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <ResChip label="골드" value={`${state.gold}`} accent="text-amber-300" />
            <ResChip label="일차" value={`${state.day}일`} />
            <ResChip label="수입" value={`+${income}`} accent="text-emerald-300" />
            <div className="flex items-center gap-1.5 rounded-md border border-sky-900/50 bg-sky-950/30 px-2.5 py-1 shadow-sm">
              <img src="/ui/magicbook.png" alt="" draggable={false} className="h-5 w-5 object-contain" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-sky-500/80">마법의 책</span>
              <span className="text-sm font-bold text-sky-300">Lv.{bookLevel}</span>
              {bookLevel >= MAX_BOOK_LEVEL ? (
                <span className="text-[10px] font-semibold text-amber-300">최대</span>
              ) : (
                next && <span className="text-[10px] text-stone-500">· 다음 {next.need}</span>
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowWorldMap(true)}
              className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-600/90 px-3.5 py-1.5 text-sm font-semibold text-stone-950 shadow-sm transition hover:bg-amber-500"
            >
              <img src="/ui/travel.png" alt="" draggable={false} className="h-5 w-5 object-contain" /> 이동
            </button>
            {state.location === "home" && (
              <button
                onClick={passDay}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md border border-indigo-400/40 bg-indigo-600/80 px-3 py-1.5 text-sm font-medium text-indigo-50 shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <img src="/ui/passday.png" alt="" draggable={false} className="h-5 w-5 object-contain" /> 하루 넘기기
              </button>
            )}
            {state.location !== "home" && (
              <button
                onClick={() => setShowInventory(true)}
                className="flex items-center gap-1.5 rounded-md border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm text-stone-300 shadow-sm transition hover:border-stone-500 hover:bg-stone-800"
              >
                <img src="/buildings/warehouse.png" alt="" draggable={false} className="h-4 w-4 object-contain" /> 창고{invCount > 0 ? ` (${invCount})` : ""}
              </button>
            )}
            <button
              onClick={() => setShowNotebook(true)}
              className="flex items-center gap-1.5 rounded-md border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm text-stone-300 shadow-sm transition hover:border-stone-500 hover:bg-stone-800"
            >
              <img src="/ui/magicbook.png" alt="" draggable={false} className="h-4 w-4 object-contain" /> 단서 노트{state.clues.length > 0 ? ` (${state.clues.length})` : ""}
            </button>
            <button
              onClick={() => setShowTutorial((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm text-stone-300 shadow-sm transition hover:border-stone-500 hover:bg-stone-800"
            >
              도움말
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
        <p className="mb-2 text-xs font-semibold tracking-wide text-amber-400">📰 아침 시황</p>
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
            className="rounded border border-stone-600 bg-stone-900/80 px-3 py-1 text-sm text-stone-300 transition hover:bg-stone-800"
          >
            닫기 ✕
          </button>
        </div>
        <WorldMap location={location} homeIcon={homeIconId} busy={busy} onTravel={onTravel} />
      </div>
    </div>
  );
}

function Tutorial({ onClose, onReplayStory }: { onClose: () => void; onReplayStory: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mt-16 w-full max-w-2xl rounded-lg border border-sky-800/60 bg-sky-950/95 p-4 pr-10 text-sm text-stone-300 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="튜토리얼 닫기"
          className="absolute right-3 top-3 text-stone-400 hover:text-stone-200"
        >
          ✕
        </button>
        <p className="font-display mb-2 text-base font-semibold text-sky-300">📖 Ashen Kingdom — 어떻게 하나?</p>
        <p className="mb-2 text-stone-400">
          목표 = 소문을 읽어 상인과 거래하고, 폐허 위에 도시를 다시 세운다.
        </p>
        <ol className="ml-4 list-decimal space-y-1 text-stone-300">
          <li><b>월드맵의 마을 노드</b>를 눌러 이동한다 — 이동일수만큼 하루가 흐르고 완성 건물이 골드 수입을 준다.</li>
          <li>마을의 <b>소문</b>을 읽어 어느 상인이 무엇을 가졌는지 추리하고, <b>상인을 골라</b> 흥정을 시작한다.</li>
          <li>자연어로 상인을 구워삶는다 — 아부·논리·대량구매·딱한사정·잡담·자재흠집으로 <b className="text-rose-300">호감도</b>를 올리면 값이 내려간다. <b>협박</b>은 대개 역효과.</li>
          <li>중앙의 <b className="text-emerald-300">폐허 고향</b>으로 돌아가 사 온 자재를 건물에 투입하면 자동으로 완성되고 경험치가 쌓여 <b className="text-sky-300">마법의 책</b> 레벨이 오른다. 고향에서 <b className="text-indigo-300">🌙 하루 넘기기</b>로 이동 없이도 수입·생산을 정산할 수 있다.</li>
          <li>책이 강해질수록 상인의 <b className="text-amber-300">약점·하한가</b>가 드러나 흥정이 유리해진다.</li>
        </ol>
        <button
          onClick={onReplayStory}
          className="mt-3 text-xs text-sky-400 underline underline-offset-2 hover:text-sky-300"
        >
          ▸ 오프닝 스토리 다시 보기
        </button>
      </div>
    </div>
  );
}

// 하단 푸터의 리소스 배지 (골드·일차·수입). 라벨은 작게, 값은 굵게 강조색으로.
function ResChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-stone-700/60 bg-stone-900/60 px-2.5 py-1 shadow-sm">
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${accent ?? "text-stone-100"}`}>{value}</span>
    </div>
  );
}
