"use client";
// 아침 시황 뉴스 모달. 이동으로 날이 바뀌면 하루 1회 뜬다. 이벤트·그날 생산량을 함께 보여준다.
import { GameIcon } from "@/shared/icon/GameIcon";
import { MATERIAL_NAME } from "@/lib/game-data";
import type { MaterialId, NewsWithProduction } from "@/types/game";

export function NewsModal({ news, onClose }: { news: NewsWithProduction; onClose: () => void }) {
  const ev = news.event;
  const prod = news.produced ? (Object.entries(news.produced) as [MaterialId, number][]) : [];
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        data-coach="mission-news"
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
        {prod.length > 0 && (
          <div className="mt-2 rounded border border-sky-800/50 bg-sky-950/30 px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm text-sky-300">
              <GameIcon name="factory" className="h-4 w-4" /> 오늘의 생산
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-200">
              {prod.map(([id, n]) => (
                <span key={id}>
                  {MATERIAL_NAME[id]} <span className="font-semibold text-emerald-300">+{n}</span>
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
