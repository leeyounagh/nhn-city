"use client";
// 새 게임 확인 모달 — 저장된 진행을 지우고 처음부터 시작할지 되묻는다(되돌릴 수 없는 동작).
import { useDialogA11y } from "@/shared/use-dialog-a11y";
import { GameIcon } from "@/shared/icon/GameIcon";

export function ResetConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const dialogRef = useDialogA11y(onCancel);
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-lg border border-rose-800/50 bg-stone-900 p-5 shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="reset-title" className="font-display mb-2 flex items-center gap-2 text-base font-bold text-rose-200">
          <GameIcon name="candle" className="h-5 w-5" /> 새 게임을 시작할까
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-stone-300">
          지금까지의 진행(건물·골드·지인·상인 관계)이 모두 사라지고 처음부터 시작한다. 되돌릴 수 없다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-stone-600 px-4 py-2 text-sm text-stone-300 transition hover:bg-stone-800"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-rose-600"
          >
            새로 시작
          </button>
        </div>
      </div>
    </div>
  );
}
