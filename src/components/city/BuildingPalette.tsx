"use client";
// 건설할 건물 팔레트. 하단 카테고리 탭으로 목록을 바꾸고, 카드를 끌거나 골라 빈 터에 놓는다.
import { useState } from "react";
import type { MaterialId } from "@/types/game";
import { BUILDINGS, MATERIAL_NAME } from "@/lib/game-data";
import { GameIcon } from "@/shared/icon/GameIcon";
import { type GameState, checkPlace, hasBlueprint } from "@/lib/game-state";
import { buildingSprite } from "./sprite";

export function BuildingPalette({
  state,
  selectedBuilding,
  onCardPointerDown,
  onCardClick,
  onStripPointerDown,
}: {
  state: GameState;
  selectedBuilding: string | null;
  onCardPointerDown: (e: React.PointerEvent, buildingId: string) => void;
  onCardClick: (buildingId: string) => void;
  onStripPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const unlocked = hasBlueprint(state.inventory);
  const [tab, setTab] = useState<string>("core");
  // 탭별 건물 목록 (category 없으면 core). deco 탭은 「설계도」 해금 시만.
  const listFor = (cat: string) =>
    cat === "deco"
      ? BUILDINGS.filter((b) => b.deco)
      : BUILDINGS.filter((b) => !b.deco && (b.category ?? "core") === cat);
  const TABS: { key: string; label: string }[] = [
    { key: "core", label: "도시" },
    { key: "commerce", label: "상업" },
    { key: "tower", label: "타워" },
    { key: "church", label: "교회" },
    { key: "castle", label: "성" },
    ...(unlocked ? [{ key: "deco", label: "장식" }] : []),
  ];
  const cards = (list: typeof BUILDINGS) =>
    list.map((b) => (
      <PaletteCard
        key={b.id}
        b={b}
        state={state}
        selected={selectedBuilding === b.id}
        onCardPointerDown={onCardPointerDown}
        onCardClick={onCardClick}
      />
    ));
  return (
    <div className="shrink-0 space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-300">
        <GameIcon name="hammer" className="h-4 w-4 text-amber-400/80" /> 건설할 건물 — 끌어다 놓거나, 골라서 빈 터를 탭
      </p>
      {/* 건물 스크롤 (선택된 카테고리) */}
      <div onPointerDown={onStripPointerDown} className="flex min-h-[96px] cursor-grab gap-2 overflow-x-auto pb-1 select-none active:cursor-grabbing">
        {cards(listFor(tab))}
      </div>
      {/* 하단 카테고리 탭 */}
      <div className="flex flex-wrap gap-1 border-t border-stone-800 pt-1.5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/50"
                  : "bg-stone-800/60 text-stone-400 hover:text-stone-200"
              }`}
            >
              {t.label}
              <span className="ml-1 opacity-60">{listFor(t.key).length}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaletteCard({
  b,
  state,
  selected,
  onCardPointerDown,
  onCardClick,
}: {
  b: (typeof BUILDINGS)[number];
  state: GameState;
  selected: boolean;
  onCardPointerDown: (e: React.PointerEvent, buildingId: string) => void;
  onCardClick: (buildingId: string) => void;
}) {
  const c = checkPlace(b.id, state);
  return (
    <button
      type="button"
      disabled={!c.canPlace}
      onPointerDown={(e) => onCardPointerDown(e, b.id)}
      onClick={() => onCardClick(b.id)}
      className={`flex min-w-[92px] shrink-0 touch-none select-none flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition ${
        selected
          ? "border-amber-500 bg-amber-500/15"
          : "border-stone-700/60 bg-stone-900/40 enabled:cursor-grab enabled:hover:border-amber-600/60 enabled:active:cursor-grabbing"
      } disabled:cursor-not-allowed disabled:opacity-40`}
      title={
        !c.prereqMet
          ? `선행 필요: ${c.missingPrereq.map((p) => BUILDINGS.find((x) => x.id === p)?.name).join(", ")}`
          : !c.bookMet
            ? `마법의 책 Lv.${b.minBook} 필요`
            : b.name
      }
    >
      <img src={buildingSprite(b.id)} alt="" draggable={false} className="pointer-events-none h-12 w-12 select-none object-contain" />
      <span className="text-xs font-semibold text-stone-100">{b.name}</span>
      {b.income > 0 && <span className="text-[10px] text-emerald-300">+{b.income}/day</span>}
      {b.produces && (
        <span className="flex items-center gap-1 text-[10px] text-sky-300">
          <GameIcon name="factory" className="h-3 w-3 shrink-0" /> {(Object.entries(b.produces) as [MaterialId, number][]).map(([id, n]) => `${MATERIAL_NAME[id]}+${n}`).join(" ")}
        </span>
      )}
      {!b.deco && !c.canPlace && (
        <span className="text-[10px] text-rose-400">{!c.prereqMet ? "선행 필요" : `책 Lv.${b.minBook}`}</span>
      )}
    </button>
  );
}
