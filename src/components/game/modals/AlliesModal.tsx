"use client";
// 지인 명부. 합류한 조력자와 아직 안 온(잠긴) 지인을 인구 임계·효과와 함께 보여준다.
import { ALLIES, perkIcon } from "@/lib/allies";
import { GameIcon } from "@/shared/icon/GameIcon";
import { AllyAvatar } from "@/components/game/modals/AllyAvatar";

export function AlliesModal({ population, onClose }: { population: number; onClose: () => void }) {
  const joinedCount = ALLIES.filter((a) => population >= a.popThreshold).length;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-amber-700/50 bg-stone-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-base font-bold text-amber-200">
            <GameIcon name="people" className="h-5 w-5" /> 지인
          </h3>
          <button onClick={onClose} aria-label="닫기" className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-stone-500">
          인구 {population} · {joinedCount}/{ALLIES.length}명 합류. 도시가 커지면 옛 지인들이 돌아와 돕는다.
        </p>
        <ul className="flex flex-col gap-2">
          {ALLIES.map((a) => {
            const joined = population >= a.popThreshold;
            return (
              <li
                key={a.id}
                className={`rounded-lg border p-3 ${
                  joined ? "border-amber-700/40 bg-stone-800/40" : "border-stone-800 bg-stone-900/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-stone-600 bg-stone-800">
                      {joined ? (
                        <AllyAvatar id={a.id} iconClass="h-4 w-4 text-amber-300/80" />
                      ) : (
                        <GameIcon name="padlock" className="h-3.5 w-3.5 text-stone-500" />
                      )}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${joined ? "text-stone-100" : "text-stone-400"}`}>
                        {a.name}
                      </span>
                      <span className="block text-[11px] text-stone-400">{a.role}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block rounded px-2 py-0.5 text-[11px] font-medium ${
                        joined ? "bg-emerald-900/40 text-emerald-400" : "bg-stone-800 text-stone-500"
                      }`}
                    >
                      {joined ? "합류 ✓" : `인구 ${a.popThreshold}`}
                    </span>
                    <span className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-sky-300">
                      <GameIcon name={perkIcon(a.perk)} className="h-3 w-3" />
                      {a.perkLabel}
                    </span>
                  </span>
                </div>
                {joined && <p className="mt-1.5 text-[11px] italic text-stone-400">“{a.greeting}”</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
