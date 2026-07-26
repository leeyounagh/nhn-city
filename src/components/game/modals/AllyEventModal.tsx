"use client";
// 지인 조력 이벤트 모달. 날 경과 시 지인이 도운 결과(재료·건설·골드·경험치)를 초상화 + AI 대사로.
import { useEffect, useState } from "react";
import type { Ally } from "@/lib/allies";
import { AllyAvatar } from "@/components/game/modals/AllyAvatar";

export function AllyEventModal({ ally, label, onClose }: { ally: Ally; label: string; onClose: () => void }) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/ally", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ally.id, deed: label }),
    })
      .then((r) => r.json())
      .then((d: { greeting?: string }) => {
        if (alive && d.greeting) setLine(d.greeting);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ally.id, label]);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-amber-700/50 bg-stone-900 p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-xs font-semibold tracking-wide text-amber-400">지인의 손길</p>
        <div className="mx-auto my-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-amber-700/50 bg-stone-800">
          <AllyAvatar id={ally.id} iconClass="h-12 w-12 text-amber-300/80" />
        </div>
        <h3 className="font-display text-base font-bold text-stone-100">
          {ally.name} <span className="text-xs font-normal text-amber-300/80">· {ally.role}</span>
        </h3>
        {line && <p className="mt-2 text-sm italic leading-relaxed text-stone-300">“{line}”</p>}
        <div className="mt-3 rounded border border-sky-800/40 bg-sky-950/25 px-3 py-2 text-sm font-semibold text-sky-200">
          {label}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-amber-600 py-2 font-semibold text-stone-950 transition hover:bg-amber-500"
        >
          확인
        </button>
      </div>
    </div>
  );
}
