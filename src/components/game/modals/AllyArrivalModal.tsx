"use client";
// 지인 합류 연출 모달. 인구 임계를 넘으면 지인이 합류 — 초상화(아이콘 폴백)+AI 합류 대사+얻은 효과.
// [환영]으로 확인하면 그 지인은 합류 완료 처리(다음 지인 대기).
import { useEffect, useState } from "react";
import { type Ally, perkIcon } from "@/lib/allies";
import { GameIcon } from "@/shared/icon/GameIcon";
import { AllyAvatar } from "@/components/game/modals/AllyAvatar";

export function AllyArrivalModal({ ally, onWelcome }: { ally: Ally; onWelcome: () => void }) {
  const [greeting, setGreeting] = useState(ally.greeting);

  // AI 합류 대사(키 없으면 정적 폴백 유지).
  useEffect(() => {
    let alive = true;
    fetch("/api/ally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ally.id }),
    })
      .then((r) => r.json())
      .then((d: { greeting?: string }) => {
        if (alive && d.greeting) setGreeting(d.greeting);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ally.id]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-amber-600/50 bg-stone-900 p-5 text-center shadow-2xl ring-1 ring-amber-500/20">
        <p className="font-display text-xs font-semibold tracking-wide text-amber-400">새로운 조력자가 합류했다</p>
        <div className="mx-auto my-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-700/50 bg-stone-800">
          <AllyAvatar id={ally.id} iconClass="h-14 w-14 text-amber-300/80" />
        </div>
        <h3 className="font-display text-lg font-bold text-stone-100">{ally.name}</h3>
        <p className="text-xs text-amber-300/80">{ally.role}</p>
        <p className="mt-3 text-sm italic leading-relaxed text-stone-300">“{greeting}”</p>
        <div className="mt-4 flex items-center justify-center gap-1.5 rounded border border-emerald-800/40 bg-emerald-950/25 px-3 py-2 text-sm font-semibold text-emerald-300">
          <GameIcon name={perkIcon(ally.perk)} className="h-4 w-4" /> {ally.perkLabel}
        </div>
        <button
          onClick={onWelcome}
          className="mt-4 w-full rounded-lg bg-amber-600 py-2 font-semibold text-stone-950 transition hover:bg-amber-500"
        >
          환영한다
        </button>
      </div>
    </div>
  );
}
