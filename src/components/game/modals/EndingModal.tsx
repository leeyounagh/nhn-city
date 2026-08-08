"use client";
// 재건 완성 엔딩 모달 — 인구 180(재건된 왕국) 도달 시 1회. 축하 + 플레이 요약. 닫고 계속 플레이 가능(오픈엔드).
import { useDialogA11y } from "@/shared/use-dialog-a11y";
import { GameIcon } from "@/shared/icon/GameIcon";

export function EndingModal({
  day,
  population,
  buildings,
  gold,
  patrons,
  allies,
  onContinue,
  onNewGame,
}: {
  day: number;
  population: number;
  buildings: number;
  gold: number;
  patrons: number;
  allies: number;
  onContinue: () => void;
  onNewGame: () => void;
}) {
  const dialogRef = useDialogA11y(onContinue);
  const stats = [
    { label: "재건까지", value: `${day}일` },
    { label: "인구", value: `${population}` },
    { label: "세운 건물", value: `${buildings}` },
    { label: "보유 골드", value: `${gold}` },
    { label: "단골 상인", value: `${patrons}` },
    { label: "합류한 지인", value: `${allies}` },
  ];
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md"
      onClick={onContinue}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ending-title"
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-600/50 bg-stone-900 p-6 text-center shadow-2xl shadow-black/70 ring-1 ring-amber-500/20 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,164,65,0.18),transparent_65%)]" />
        <div className="relative">
          <GameIcon name="spellBook" className="mx-auto mb-2 h-12 w-12 text-amber-300 drop-shadow-[0_2px_8px_rgba(217,164,65,0.5)]" />
          <p className="font-display text-xs tracking-[0.3em] text-amber-500/70">ASHEN KINGDOM</p>
          <h2 id="ending-title" className="font-display mt-1 text-2xl font-bold text-amber-200 [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
            재건된 왕국
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-stone-300">
            잿더미였던 고향에 다시 종이 울린다. 폐허를 딛고 왕국을 되살렸다 — 후계자의 이름이 거리마다 새겨졌다.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-stone-700/60 bg-stone-800/40 px-2 py-2">
                <p className="text-[10px] uppercase tracking-wide text-stone-400">{s.label}</p>
                <p className="text-sm font-bold tabular-nums text-amber-200">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={onContinue}
              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-500"
            >
              계속 이어가기
            </button>
            <button
              onClick={onNewGame}
              className="rounded-lg border border-stone-600 px-5 py-2 text-sm text-stone-300 transition hover:bg-stone-800"
            >
              새 게임
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
