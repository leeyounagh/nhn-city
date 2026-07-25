"use client";
// 게임 오케스트레이터 — 엔진 훅(useGameEngine)의 상태·액션을 화면에 조립한다(렌더 전담).
import type { TownId } from "@/types/game";
import { MAX_BOOK_LEVEL, TOWN_BY_ID, locationName } from "@/lib/game-data";
import { homeIcon } from "@/lib/game-state";
import { TownView } from "@/components/TownView";
import { IsoCityMap } from "@/components/IsoCityMap";
import { HaggleDialog } from "@/components/HaggleDialog";
import { ClueNotebook } from "@/components/ClueNotebook";
import { BookCodex } from "@/components/BookCodex";
import { GameIcon } from "@/components/GameIcon";
import { InventoryPanel } from "@/components/InventoryPanel";
import { IntroCutscene } from "@/components/IntroCutscene";
import { NewsModal } from "@/components/game/modals/NewsModal";
import { RelationsModal } from "@/components/game/modals/RelationsModal";
import { WorldMapModal } from "@/components/game/modals/WorldMapModal";
import { Tutorial } from "@/components/game/modals/Tutorial";
import { ResChip } from "@/components/game/hud/ResChip";
import { useGameEngine } from "@/hooks/useGameEngine";

export function Game() {
  const {
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
    news,
    setNews,
    finishIntro,
    bookLevel,
    income,
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
    reclaim,
    moveBuilding,
    rotateBuilding,
  } = useGameEngine();

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
              merchantMemory={state.merchantMemory}
              day={state.day}
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

      {showRelations && (
        <RelationsModal memory={state.merchantMemory} day={state.day} onClose={() => setShowRelations(false)} />
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
              onClick={() => setShowRelations(true)}
              className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
            >
              <GameIcon name="merchant" className="h-4 w-4" /> 단골
              {Object.keys(state.merchantMemory).length > 0 ? ` (${Object.keys(state.merchantMemory).length})` : ""}
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
