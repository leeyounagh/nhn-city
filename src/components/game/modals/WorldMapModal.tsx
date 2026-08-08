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
        // 모바일: 상단 여백 최소 + 화면 높이를 꽉 채우는 세로 플렉스(맵이 남는 공간을 차지). 데스크톱은 기존 중앙 상단 카드.
        className="mt-4 flex h-[calc(100dvh-3rem)] w-full max-w-3xl flex-col focus:outline-none sm:mt-16 sm:block sm:h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex shrink-0 justify-end">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-700 bg-stone-900/80 text-stone-400 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 sm:flex-none">
          <WorldMap location={location} homeIcon={homeIconId} homeName={homeName} busy={busy} onTravel={onTravel} />
        </div>
      </div>
    </div>
  );
}
