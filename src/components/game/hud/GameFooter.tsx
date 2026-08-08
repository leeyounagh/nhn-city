"use client";
// 하단 푸터 HUD — 리소스 배지(골드·일차·수입)·마법의 책·이동/하루넘기기·보조 액션 버튼들.
// 모바일(md 미만)에선 액션 버튼 라벨을 숨기고 아이콘만 보여 한 줄을 유지한다(i18n로 텍스트가 길어져도 안 깨짐).
import { useEffect, useRef, useState } from "react";
import { GameIcon, type GameIconName } from "@/shared/icon/GameIcon";
import { ResChip } from "@/components/game/hud/ResChip";
import { MAX_BOOK_LEVEL } from "@/lib/game-data";
import type { GameEngine } from "@/hooks/useGameEngine";

// 보조 액션 버튼 — md 미만은 아이콘만(라벨 숨김·카운트는 배지), md 이상은 아이콘+라벨.
// 라벨 숨김에 대비해 aria-label을 항상 부여한다(스크린리더·접근성).
function AuxButton({
  icon,
  label,
  count,
  onClick,
  dataCoach,
  danger,
}: {
  icon: GameIconName;
  label: string;
  count?: number;
  onClick: () => void;
  dataCoach?: string;
  danger?: boolean;
}) {
  const hasCount = count !== undefined && count > 0;
  return (
    <button
      data-coach={dataCoach}
      onClick={onClick}
      aria-label={label}
      className={`relative flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-700/70 px-2 text-sm transition md:px-3 ${
        danger
          ? "text-stone-500 hover:border-rose-600/50 hover:text-rose-300"
          : "text-stone-300 hover:border-amber-600/50 hover:text-amber-200"
      }`}
    >
      <GameIcon name={icon} className="h-4 w-4" />
      <span className="hidden md:inline">
        {label}
        {hasCount ? ` (${count})` : ""}
      </span>
      {/* 라벨을 숨긴 모바일에서 카운트를 잃지 않도록 아이콘 우상단 배지로 표시. */}
      {hasCount && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-stone-950 md:hidden">
          {count}
        </span>
      )}
    </button>
  );
}

// 모바일 전용 보조 액션 오버플로 메뉴 — ⋯ 버튼 + 위로 뜨는 팝업. 데스크톱은 md:hidden으로 숨는다.
// 온보딩 코치가 가리키는 mission-list-btn을 이 버튼에 달아, 인라인 미션 버튼이 숨는 모바일에서도 정확히 강조된다.
function MoreMenu({
  items,
}: {
  items: { icon: GameIconName; label: string; count?: number; onClick: () => void; danger?: boolean; dataCoach?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative md:hidden">
      <button
        data-coach="mission-list-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="더 보기"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center justify-center rounded-lg border border-stone-700/70 px-3 text-lg leading-none text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
      >
        <span aria-hidden>⋯</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-lg border border-stone-700 bg-stone-900/95 py-1 shadow-2xl ring-1 ring-amber-900/30 backdrop-blur"
        >
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition ${
                it.danger ? "text-stone-400 hover:bg-rose-950/40 hover:text-rose-300" : "text-stone-200 hover:bg-stone-800"
              }`}
            >
              <GameIcon name={it.icon} className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{it.label}</span>
              {it.count !== undefined && it.count > 0 && (
                <span className="rounded-full bg-amber-600/90 px-1.5 text-[11px] font-bold text-stone-950">{it.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    setShowResetConfirm,
    openMissions,
    allies,
    setShowAllies,
  } = engine;

  // 보조 액션 정의 — 데스크톱 인라인 버튼과 모바일 ⋯ 메뉴가 같은 목록을 공유한다.
  const auxItems: { icon: GameIconName; label: string; count?: number; onClick: () => void; danger?: boolean; dataCoach?: string }[] = [
    ...(state.location !== "home" ? [{ icon: "chest" as GameIconName, label: "창고", count: invCount, onClick: () => setShowInventory(true) }] : []),
    { icon: "compass", label: "미션", onClick: openMissions, dataCoach: "mission-list-btn" },
    { icon: "scroll", label: "단서 노트", count: state.clues.length, onClick: () => setShowNotebook(true) },
    { icon: "people", label: "지인", count: allies.length, onClick: () => setShowAllies(true) },
    { icon: "merchant", label: "단골", count: Object.keys(state.merchantMemory).length, onClick: () => setShowRelations(true) },
    { icon: "candle", label: "도움말", onClick: () => setShowTutorial((v) => !v) },
    { icon: "clockwiseRotation", label: "새 게임", onClick: () => setShowResetConfirm(true), danger: true },
  ];

  return (
    <footer className="pb-safe shrink-0 border-t border-amber-900/40 bg-gradient-to-t from-stone-950 via-stone-950/95 to-stone-900/90 shadow-[0_-6px_20px_rgba(0,0,0,0.55)] backdrop-blur">
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
            <span className="hidden text-[10px] font-medium uppercase tracking-wide text-sky-500/80 sm:inline">마법의 책</span>
            <span className="text-sm font-bold text-sky-300">Lv.{bookLevel}</span>
            {bookLevel >= MAX_BOOK_LEVEL ? (
              <span className="text-[10px] font-semibold text-amber-300">최대</span>
            ) : (
              next && <span className="hidden text-[10px] text-stone-500 sm:inline">· 다음 {next.need}</span>
            )}
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {/* 메인 액션 — 색으로 위계. 하루 넘기기(주)=금색, 이동=stone. 모바일은 아이콘만. */}
          <button
            data-coach="mission-worldmap"
            onClick={() => setShowWorldMap(true)}
            aria-label="이동"
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-600 bg-stone-800 px-2 text-sm font-medium tracking-wide text-stone-100 transition hover:bg-stone-700 md:px-4"
          >
            <GameIcon name="footprint" className="h-5 w-5" /> <span className="hidden md:inline">이동</span>
          </button>
          {state.location === "home" && (
            <button
              onClick={passDay}
              disabled={busy}
              aria-label="하루 넘기기"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-2 text-sm font-semibold tracking-wide text-stone-950 shadow-md shadow-amber-950/40 transition hover:bg-amber-500 disabled:opacity-50 md:px-4"
            >
              <GameIcon name="hourglass" className="h-5 w-5" /> <span className="hidden md:inline">하루 넘기기</span>
            </button>
          )}

          {/* 구분선 */}
          <span className="mx-0.5 hidden h-6 w-px bg-stone-700/60 sm:block" />

          {/* 보조 액션 — 데스크톱(md+)은 인라인 아이콘 버튼, 모바일은 ⋯ 오버플로 메뉴 하나로 접는다. */}
          <div className="hidden md:contents">
            {auxItems.map((it) => (
              <AuxButton
                key={it.label}
                icon={it.icon}
                label={it.label}
                count={it.count}
                onClick={it.onClick}
                danger={it.danger}
                dataCoach={it.dataCoach}
              />
            ))}
          </div>
          <MoreMenu items={auxItems} />
        </div>
      </div>
    </footer>
  );
}
