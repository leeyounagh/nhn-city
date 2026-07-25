"use client";
// 관계 명부 모달. 거래하며 쌓은 상인들의 호감도(감쇠 반영)를 한눈에. 어디서나 열람.
import { useState } from "react";
import { GameIcon } from "@/shared/icon/GameIcon";
import { type MerchantMemory, decayedDisposition, dispositionRank } from "@/lib/game-state";

function RelationAvatar({ file }: { file?: string }) {
  const [ok, setOk] = useState(true);
  if (ok && file) {
    return (
      <img
        src={`/merchants/${file}.png`}
        alt=""
        draggable={false}
        onError={() => setOk(false)}
        className="h-10 w-10 shrink-0 rounded-lg border border-stone-600 object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-600 bg-stone-800">
      <GameIcon name="merchant" className="h-5 w-5 text-stone-500" />
    </span>
  );
}

export function RelationsModal({
  memory,
  day,
  onClose,
}: {
  memory: Record<number, MerchantMemory>;
  day: number;
  onClose: () => void;
}) {
  const rows = Object.entries(memory)
    .map(([seed, m]) => ({ seed, m, current: decayedDisposition(m, day) }))
    .sort((a, b) => b.current - a.current);
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg border border-amber-700/60 bg-stone-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 text-stone-400 hover:text-stone-200"
        >
          ✕
        </button>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-400">
          <GameIcon name="merchant" className="h-4 w-4" /> 관계 명부
        </p>
        <p className="mb-4 text-xs text-stone-500">거래하며 쌓은 상인들. 오래 안 만나면 호감도가 식는다.</p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            아직 흥정한 상인이 없다. 소문을 좇아 상인을 찾아라.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ seed, m, current }) => {
              const rank = dispositionRank(current);
              const daysAgo = day - m.lastDay;
              const cooling = current < m.disposition;
              return (
                <li
                  key={seed}
                  className="flex items-center gap-3 rounded-lg border border-stone-700/60 bg-stone-800/40 p-2.5"
                >
                  <RelationAvatar file={m.portraitFile} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-100">
                      {m.name} <span className="text-xs text-stone-500">{m.title}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${rank.tone}`}
                      >
                        {rank.label} · {current}
                      </span>
                      {m.tokenTaken && <span className="text-[10px] text-sky-400">신표</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-right text-[10px] leading-tight text-stone-500">
                    {daysAgo === 0 ? "오늘" : `${daysAgo}일 전`}
                    {cooling && (
                      <>
                        <br />
                        <span className="text-rose-400/70">식는 중</span>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
