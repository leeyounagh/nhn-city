"use client";
// 창고 모달. 사 모은 자재를 티어(기본·가공·희귀)별로 묶어 보여준다. 푸터의 「창고」 버튼으로 어디서든 연다.
import { MATERIALS } from "@/lib/game-data";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

const TIER_LABEL: Record<number, string> = { 1: "1티어 (기본)", 2: "2티어 (가공)", 3: "3티어 (희귀)" };

export function InventoryPanel({
  inventory,
  onClose,
}: {
  inventory: Record<string, number>;
  onClose: () => void;
}) {
  const tiers = [1, 2, 3] as const;
  const total = Object.values(inventory).reduce((a, b) => a + b, 0);
  const dialogRef = useDialogA11y(onClose);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 p-4 pt-16">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-panel-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg border border-stone-700 bg-stone-900 shadow-xl focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-stone-700 px-5 py-3">
          <h2 id="inventory-panel-title" className="flex items-center gap-1.5 font-bold text-amber-200">
            <img src="/buildings/warehouse.png" alt="" draggable={false} className="h-6 w-6 object-contain" /> 창고
          </h2>
          <button onClick={onClose} aria-label="창고 닫기" className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto px-5 py-4">
          {total === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">
              창고가 비었다. 마을에서 상인과 거래해 자재를 사 오라.
            </p>
          ) : (
            <div className="space-y-4">
              {tiers.map((tier) => {
                const rows = MATERIALS.filter((m) => m.tier === tier && (inventory[m.id] ?? 0) > 0);
                if (rows.length === 0) return null;
                return (
                  <section key={tier}>
                    <h3 className="mb-2 text-xs font-semibold text-stone-400">{TIER_LABEL[tier]}</h3>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {rows.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded border border-stone-700/70 bg-stone-800/40 px-3 py-2"
                        >
                          <span className="flex items-center gap-1.5 text-sm text-stone-200">
                            <MaterialIcon id={m.id} className="h-5 w-5" /> {m.name}
                          </span>
                          <b className="tabular-nums text-amber-300">{inventory[m.id]}</b>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
