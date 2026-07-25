"use client";
// 창고 인벤토리 스트립 + 줌 버튼. 자재 칩을 건물로 드래그해 채우는 상단 HUD 조각들.
import { MATERIAL_NAME } from "@/lib/game-data";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { GameIcon } from "@/shared/icon/GameIcon";

export function InventoryStrip({
  inv,
  onChipPointerDown,
}: {
  inv: [string, number][];
  onChipPointerDown: (e: React.PointerEvent, materialId: string) => void;
}) {
  return (
    <div className="mb-2 shrink-0 rounded-lg border border-stone-700/50 bg-stone-900/40 px-2.5 py-1.5">
      <p className="mb-1 text-xs font-semibold text-stone-300">
        <GameIcon name="chest" className="mr-1 inline-block h-4 w-4 align-text-bottom text-amber-400/80" /> 창고 <span className="font-normal text-stone-500">— 자재를 건물로 끌어다 채운다</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {inv.length > 0 ? (
          inv.map(([id, n]) => (
            <span
              key={id}
              onPointerDown={(e) => onChipPointerDown(e, id)}
              className="cursor-grab touch-none select-none rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-200 active:cursor-grabbing"
            >
              <MaterialIcon id={id} className="mr-0.5 h-3.5 w-3.5" />{MATERIAL_NAME[id]} <b className="tabular-nums text-amber-300">{n}</b>
            </span>
          ))
        ) : (
          <span className="rounded-md border border-dashed border-stone-700 px-2.5 py-1 text-xs text-stone-500">창고가 비었다 — 마을에서 자재를 사 오라.</span>
        )}
      </div>
    </div>
  );
}

export function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 w-7 rounded border border-stone-600 text-sm text-stone-300 transition hover:bg-stone-800"
    >
      {label}
    </button>
  );
}
