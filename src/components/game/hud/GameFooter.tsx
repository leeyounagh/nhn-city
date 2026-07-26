"use client";
// 하단 푸터 HUD — 리소스 배지(골드·일차·수입)·마법의 책·이동/하루넘기기·보조 액션 버튼들.
import { GameIcon } from "@/shared/icon/GameIcon";
import { ResChip } from "@/components/game/hud/ResChip";
import { MAX_BOOK_LEVEL } from "@/lib/game-data";
import type { GameEngine } from "@/hooks/useGameEngine";

export function GameFooter({ engine }: { engine: GameEngine }) {
  const {
    state,
    income,
    population,
    bookLevel,
    next,
    invCount,
    busy,
    passDay,
    setShowBook,
    setShowWorldMap,
    setShowInventory,
    setShowNotebook,
    setShowRelations,
    setShowTutorial,
    openMissions,
    allies,
    setShowAllies,
  } = engine;
  return (
    <footer className="shrink-0 border-t border-amber-900/40 bg-gradient-to-t from-stone-950 via-stone-950/95 to-stone-900/90 shadow-[0_-6px_20px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <span className="font-display hidden pr-1 text-lg font-bold tracking-wider text-amber-200 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] sm:inline">
          Ashen Kingdom
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <ResChip label="골드" value={`${state.gold}`} accent="text-amber-300" icon="coins" />
          <ResChip label="일차" value={`${state.day}일`} />
          <ResChip label="수입" value={`+${income}`} accent="text-emerald-300" icon="income" />
          <ResChip label="인구" value={`${population}`} accent="text-sky-300" icon="people" />
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
            data-coach="mission-worldmap"
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
            data-coach="mission-list-btn"
            onClick={openMissions}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            <GameIcon name="compass" className="h-4 w-4" /> 미션
          </button>
          <button
            onClick={() => setShowNotebook(true)}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            <GameIcon name="scroll" className="h-4 w-4" /> 단서 노트{state.clues.length > 0 ? ` (${state.clues.length})` : ""}
          </button>
          <button
            onClick={() => setShowAllies(true)}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-stone-700/70 px-3 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            <GameIcon name="people" className="h-4 w-4" /> 지인{allies.length > 0 ? ` (${allies.length})` : ""}
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
  );
}
