"use client";
// 미션 목록 모달. 진행 중 미션은 현재 목표를 보여주고, 완료 미션은 비활성(회색·취소선·완료 뱃지)으로 처리한다.
import { GameIcon } from "@/shared/icon/GameIcon";
import type { MissionStatus } from "@/lib/missions";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

export function MissionListModal({
  missions,
  onRestart,
  onClose,
}: {
  missions: MissionStatus[];
  onRestart: () => void; // 진행 중 미션 클릭 → 튜토리얼 재활성화
  onClose: () => void;
}) {
  const dialogRef = useDialogA11y(onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-list-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-lg border border-amber-700/50 bg-stone-900 p-4 shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id="mission-list-title" className="font-display flex items-center gap-2 text-base font-bold text-amber-200">
            <GameIcon name="compass" className="h-5 w-5" /> 미션
          </h3>
          <button onClick={onClose} aria-label="닫기" className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {missions.map(({ mission, objective, done }) => {
            const inner = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold ${done ? "text-stone-400 line-through" : "text-stone-100"}`}>
                    {mission.title}
                  </span>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${
                      done ? "bg-emerald-900/40 text-emerald-400" : "bg-amber-900/40 text-amber-300"
                    }`}
                  >
                    {done ? "완료 ✓" : "진행 중"}
                  </span>
                </div>
                {!done && objective && <p className="mt-1 text-xs text-stone-400">▸ {objective.label}</p>}
              </>
            );
            return (
              <li key={mission.id}>
                {done ? (
                  <div className="rounded-lg border border-stone-800 bg-stone-900/40 p-3 opacity-50">{inner}</div>
                ) : (
                  // 진행 중 미션: 클릭하면 튜토리얼을 처음부터 다시 안내받는다.
                  <button
                    type="button"
                    onClick={onRestart}
                    className="w-full rounded-lg border border-amber-700/40 bg-stone-800/40 p-3 text-left transition hover:border-amber-500/70 hover:bg-stone-800"
                  >
                    {inner}
                    <p className="mt-1.5 text-[11px] text-amber-400/90">↻ 눌러서 튜토리얼 처음부터 다시 안내받기</p>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
