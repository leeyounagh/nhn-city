"use client";
// 월드맵. 폐허 고향 + 4개 상인 마을 노드. 노드를 고르면 이동일수만큼 시간이 흐른다(→상인 재배치).
import type { LocationId, TownId } from "@/types/game";
import { TOWN_BY_ID, TOWN_ICON, travelDays, locationName } from "@/lib/game-data";

// 3×3 격자 배치: 네 모서리에 마을, 중앙에 고향.
const CELL: Record<LocationId, string> = {
  nw: "col-start-1 row-start-1",
  ne: "col-start-3 row-start-1",
  home: "col-start-2 row-start-2",
  sw: "col-start-1 row-start-3",
  se: "col-start-3 row-start-3",
};

const NODES: LocationId[] = ["nw", "ne", "home", "sw", "se"];

export function WorldMap({
  location,
  homeIcon,
  busy,
  onTravel,
}: {
  location: LocationId;
  homeIcon: string; // 고향 대표 스프라이트 (완성도에 따라 진화)
  busy: boolean;
  onTravel: (dest: LocationId) => void;
}) {
  return (
    <section className="rounded-lg border border-stone-700/60 bg-stone-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-stone-200">🗺️ 월드맵</h2>
        <span className="text-xs text-stone-500">노드를 눌러 이동 (이동일수만큼 하루가 흐른다)</span>
      </div>
      <div className="relative grid grid-cols-3 grid-rows-3 gap-2 sm:gap-3">
        {/* 중앙 고향 → 네 모서리 마을로 뻗는 길. 배경 레이어(pointer-events 없음), 노드 버튼이 위에 옴. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {[
            [16.7, 16.7],
            [83.3, 16.7],
            [16.7, 83.3],
            [83.3, 83.3],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <line x1={50} y1={50} x2={x} y2={y} stroke="#78716c" strokeOpacity={0.3} strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <line x1={50} y1={50} x2={x} y2={y} stroke="#d97706" strokeOpacity={0.55} strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </svg>
        {NODES.map((id) => {
          const here = id === location;
          const isHome = id === "home";
          const town = isHome ? null : TOWN_BY_ID[id as TownId];
          const days = travelDays(location, id);
          return (
            <button
              key={id}
              type="button"
              disabled={here || busy}
              onClick={() => onTravel(id)}
              className={`${CELL[id]} relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-3 text-center transition ${
                here
                  ? "border-amber-500/70 bg-amber-900/40"
                  : isHome
                    ? "border-emerald-700/60 bg-emerald-950/30 enabled:hover:border-emerald-500 enabled:hover:bg-emerald-900/40"
                    : "border-stone-600/60 bg-stone-800/50 enabled:hover:border-amber-600/60 enabled:hover:bg-stone-800"
              } disabled:cursor-default`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-stone-950/50 ${
                  isHome ? "border-emerald-700/50" : "border-stone-600/50"
                }`}
              >
                <img
                  src={`/buildings/${isHome ? homeIcon : TOWN_ICON[id as TownId]}.png`}
                  alt=""
                  draggable={false}
                  className="h-8 w-8 object-contain"
                />
              </span>
              <span className="text-sm font-semibold text-stone-100">{locationName(id)}</span>
              {town && <span className="text-[11px] text-stone-400">{town.industryName}</span>}
              {here ? (
                <span className="mt-0.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-stone-950">
                  현재 위치
                </span>
              ) : (
                <span className="mt-0.5 rounded bg-stone-700 px-1.5 py-0.5 text-[10px] text-stone-200">
                  {days}일
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
