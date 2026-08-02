"use client";
// 월드맵을 오버레이 모달로 감싼다. 노드 클릭 시 이동 후 모달이 닫힌다. WorldMap 자체는 그대로 재사용.
import { WorldMap } from "@/components/WorldMap";
import type { LocationId } from "@/types/game";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

export function WorldMapModal({
  location,
  homeIconId,
  homeName,
  busy,
  onTravel,
  onClose,
}: {
  location: LocationId;
  homeIconId: string;
  homeName: string;
  busy: boolean;
  onTravel: (dest: LocationId) => void;
  onClose: () => void;
}) {
  const dialogRef = useDialogA11y(onClose);
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="월드맵"
        tabIndex={-1}
        className="mt-16 w-full max-w-3xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex justify-end">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-700 bg-stone-900/80 text-stone-400 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            ✕
          </button>
        </div>
        <WorldMap location={location} homeIcon={homeIconId} homeName={homeName} busy={busy} onTravel={onTravel} />
      </div>
    </div>
  );
}
