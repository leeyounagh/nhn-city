"use client";
// 떠돌이 상인 이벤트 모달. 하루 넘길 때 낮은 확률로 등장 — 초상화 + 말풍선(인사)으로 희귀템을 권유하고,
// [흥정한다]를 누르면 물물교환 흥정창으로 이어진다(프린세스메이커 「떠돌이 상인」 연출).
import type { MaterialId, PublicMerchant } from "@/types/game";
import { MATERIAL_NAME } from "@/lib/game-data";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

export function EventMerchantModal({
  merchant,
  rareId,
  payId,
  onAccept,
  onDismiss,
}: {
  merchant: PublicMerchant;
  rareId: MaterialId;
  payId: MaterialId;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const dialogRef = useDialogA11y(onDismiss);
  const src = `/merchants/${merchant.portraitFile ?? merchant.portrait}.png`;
  return (
    <div
      className="fixed inset-0 z-[88] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-merchant-title"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-amber-600/50 bg-stone-900 shadow-2xl shadow-black/70 ring-1 ring-amber-500/20 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* 초상화 + 말풍선 (모바일 세로, sm+ 가로) */}
          <div className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:items-start">
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-32 w-32 shrink-0 rounded-xl border border-amber-800/40 bg-stone-800 object-cover shadow-lg sm:h-40 sm:w-40"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-semibold tracking-wide text-amber-400">돌연 — 떠돌이 상인</p>
              <h3 id="event-merchant-title" className="font-display mt-0.5 text-lg font-bold text-stone-100">
                {merchant.name}
              </h3>
              {/* 말풍선 */}
              <div className="relative mt-2 rounded-xl border border-amber-700/40 bg-stone-800/70 px-3 py-2.5 text-sm leading-relaxed text-stone-200">
                “{merchant.greeting}”
              </div>
              {/* 권유하는 희귀템 */}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2">
                <MaterialIcon id={rareId} className="h-6 w-6 shrink-0" />
                <div className="min-w-0 text-sm">
                  <span className="font-semibold text-amber-200">{MATERIAL_NAME[rareId]}</span>
                  <span className="text-stone-400"> · 희귀템</span>
                  <p className="text-xs text-stone-400">
                    <MaterialIcon id={payId} className="mr-0.5 inline-block h-3.5 w-3.5 align-text-bottom" />
                    {MATERIAL_NAME[payId]}(으)로 물물교환 — 흥정으로 교환비를 깎을 수 있다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 액션 */}
        <div className="flex shrink-0 gap-2 border-t border-stone-700/60 bg-stone-950/40 p-3">
          <button
            onClick={onDismiss}
            className="flex-1 rounded-lg border border-stone-600 py-2.5 text-sm font-medium text-stone-300 transition hover:bg-stone-800"
          >
            돌려보낸다
          </button>
          <button
            onClick={onAccept}
            className="flex-[2] rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-stone-950 shadow-md shadow-amber-950/40 transition hover:bg-amber-500"
          >
            흥정한다 ▸
          </button>
        </div>
      </div>
    </div>
  );
}
