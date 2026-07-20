"use client";
// 단서 노트. 수집한 소문을 지목 마을별로 묶어 보여준다. 진위 판정은 하지 않고 조각만 나열한다.
import type { Rumor, ClueKind } from "@/types/game";
import { groupCluesByTown } from "@/lib/game-state";

const KIND_LABEL: Record<ClueKind, string> = {
  location: "위치",
  wants: "원함",
  moving: "이동",
};

const KIND_STYLE: Record<ClueKind, string> = {
  location: "border-sky-700/60 text-sky-300",
  wants: "border-emerald-700/60 text-emerald-300",
  moving: "border-violet-700/60 text-violet-300",
};

export function ClueNotebook({ clues, onClose }: { clues: Rumor[]; onClose: () => void }) {
  const groups = groupCluesByTown(clues);
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 p-4 pt-16">
      <div className="w-full max-w-2xl rounded-lg border border-stone-700 bg-stone-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-700 px-5 py-3">
          <h2 className="flex items-center gap-1.5 font-bold text-amber-200">
            <img src="/ui/magicbook.png" alt="" draggable={false} className="h-6 w-6 object-contain" /> 단서 노트
          </h2>
          <button
            onClick={onClose}
            aria-label="단서 노트 닫기"
            className="text-stone-400 hover:text-stone-200"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              아직 들은 소문이 없다. 마을을 돌며 소문을 모아라.
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.townId}>
                  <h3 className="mb-2 text-sm font-semibold text-stone-300">
                    {g.townName}
                    <span className="ml-2 text-xs font-normal text-stone-500">
                      소문 {g.rumors.length}
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {g.rumors.map((r) => (
                      <ClueRow key={r.id} rumor={r} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClueRow({ rumor: r }: { rumor: Rumor }) {
  return (
    <li className="rounded border border-stone-700/70 bg-stone-800/40 px-3 py-2">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span className={`rounded border px-1.5 py-0.5 text-[11px] ${KIND_STYLE[r.kind]}`}>
          {KIND_LABEL[r.kind]}
        </span>
        <span className="text-xs text-stone-400">{r.archetypeTitle}</span>
        {r.materialName && (
          <span className="text-xs text-emerald-400">· {r.materialName}</span>
        )}
        {r.suspect && (
          <span className="rounded border border-rose-700/60 px-1.5 py-0.5 text-[11px] text-rose-300">
            의심스러움
          </span>
        )}
        <span className="ml-auto text-[11px] text-stone-500">{r.source}</span>
      </div>
      <p className="text-sm text-stone-200">{r.text}</p>
    </li>
  );
}
