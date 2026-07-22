"use client";
// 월드맵. 폐허 고향(허브) + 4개 상인 마을 노드. 카드가 아니라 "지역"처럼 — 방사형 길로 연결된 탐험 화면.
import type { IndustryId, LocationId, TownId } from "@/types/game";
import { TOWN_BY_ID, TOWN_ICON, travelDays, locationName } from "@/lib/game-data";
import { GameIcon } from "@/components/GameIcon";

// 3×3 격자 배치: 네 모서리에 마을, 중앙에 고향.
const CELL: Record<LocationId, string> = {
  nw: "col-start-1 row-start-1",
  ne: "col-start-3 row-start-1",
  home: "col-start-2 row-start-2",
  sw: "col-start-1 row-start-3",
  se: "col-start-3 row-start-3",
};

const NODES: LocationId[] = ["nw", "ne", "home", "sw", "se"];

// 업종별 지역 색 (텍스트 아님 — 작은 배지 점으로만).
const REGION_DOT: Record<IndustryId, string> = {
  forestry: "bg-emerald-500",
  mining: "bg-slate-400",
  textile: "bg-violet-500",
  glasswork: "bg-sky-400",
};

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
    <section className="relative overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950/60 p-4">
      {/* 안개 + 희미한 그리드 (지도 느낌) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,113,108,0.10),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:34px_34px] opacity-[0.04]" />

      <div className="relative mb-3 flex items-center justify-between">
        <h2 className="font-display flex items-center gap-1.5 text-base font-semibold tracking-wide text-stone-100">
          <GameIcon name="compass" className="h-5 w-5 text-amber-400" /> 월드맵
        </h2>
        <span className="text-xs text-stone-500">지역을 눌러 이동 (이동일수만큼 하루가 흐른다)</span>
      </div>

      <div className="relative grid grid-cols-3 grid-rows-3 gap-2 py-2 sm:gap-3">
        {/* 중앙 고향 → 네 모서리로 뻗는 길. 굵은 길바닥 + 은은히 빛나는 금색 점선. */}
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
              {/* 길바닥 */}
              <line x1={50} y1={50} x2={x} y2={y} stroke="#57534e" strokeOpacity={0.35} strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {/* 금색 광 */}
              <line x1={50} y1={50} x2={x} y2={y} stroke="#f59e0b" strokeOpacity={0.14} strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {/* 금색 점선 */}
              <line x1={50} y1={50} x2={x} y2={y} stroke="#fbbf24" strokeOpacity={0.6} strokeWidth={2.5} strokeDasharray="5 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
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
              className={`${CELL[id]} group relative z-10 flex flex-col items-center justify-center gap-1 px-1 py-2 text-center outline-none transition disabled:cursor-default ${
                here ? "" : "enabled:hover:-translate-y-1"
              }`}
            >
              <span className="relative flex items-center justify-center">
                {/* 현재 위치 은은한 펄스 */}
                {here && (
                  <span className="absolute inset-0 -m-1 animate-ping rounded-full bg-amber-500/20 [animation-duration:2.5s]" />
                )}
                <span
                  className={`relative flex items-center justify-center rounded-full border-2 bg-stone-950/70 shadow-lg transition ${
                    isHome ? "h-20 w-20" : "h-16 w-16"
                  } ${
                    here
                      ? "border-amber-500/80 shadow-[0_0_22px_rgba(217,164,65,0.35)]"
                      : "border-stone-600/60 group-enabled:group-hover:border-amber-500/70 group-enabled:group-hover:shadow-[0_0_18px_rgba(217,164,65,0.3)]"
                  }`}
                >
                  <img
                    src={`/buildings/${isHome ? homeIcon : TOWN_ICON[id as TownId]}.png`}
                    alt=""
                    draggable={false}
                    className={`object-contain ${isHome ? "h-14 w-14" : "h-11 w-11"}`}
                  />
                  {/* 지역 색 배지 */}
                  {town && (
                    <span
                      className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-stone-900 ${REGION_DOT[town.industry]}`}
                    />
                  )}
                </span>
              </span>

              <span className="font-display text-sm font-semibold text-stone-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                {locationName(id)}
              </span>
              {town && <span className="text-[11px] text-stone-400">{town.industryName}</span>}
              {here ? (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950">
                  현재 위치
                </span>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-[11px] font-medium tabular-nums text-stone-300"><GameIcon name="footprint" className="h-3 w-3" /> {days}일</span>
                  <span className="pointer-events-none text-[10px] font-semibold text-amber-300 opacity-0 transition group-enabled:group-hover:opacity-100">
                    이동하기 ▸
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
