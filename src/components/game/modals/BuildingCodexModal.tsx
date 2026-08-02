"use client";
// 건물 도감 모달 (마법의 책 Lv.1). 모든 건물의 완공 효과(골드·생산·경험치)와 필요 자재·선행 조건을 한눈에.
import type { MaterialId } from "@/types/game";
import { BUILDINGS, MATERIAL_NAME } from "@/lib/game-data";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { GameIcon } from "@/shared/icon/GameIcon";
import { buildingSprite } from "@/components/city/sprite";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

// 도감은 완공 효과(골드·생산·경험치)가 있는 건물만. 나무·밭(효과 없는 조경)·건축·장식(설계도 장식)은 제외.
const CATEGORIES: { key: string; label: string }[] = [
  { key: "core", label: "도시" },
  { key: "commerce", label: "상업" },
  { key: "tower", label: "타워" },
  { key: "church", label: "교회" },
  { key: "castle", label: "성채" },
  { key: "farm", label: "농장" },
  { key: "military", label: "군사" },
  { key: "forge", label: "공방" },
];

const buildingName = (id: string) => BUILDINGS.find((b) => b.id === id)?.name ?? id;

export function BuildingCodexModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useDialogA11y(onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="building-codex-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg border border-amber-800/50 bg-stone-900 p-4 shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 id="building-codex-title" className="font-display flex items-center gap-2 text-base font-bold text-amber-200">
            <GameIcon name="hammer" className="h-5 w-5" /> 건물 도감
          </h3>
          <button onClick={onClose} aria-label="닫기" className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-stone-500">마법의 책 Lv.1 — 지을 수 있는 건물과 완공 효과를 미리 본다.</p>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
          {CATEGORIES.map(({ key, label }) => {
            const items = BUILDINGS.filter((b) => !b.deco && (b.category ?? "core") === key);
            if (items.length === 0) return null;
            return (
              <section key={key}>
                <h4 className="mb-1.5 text-xs font-semibold text-stone-400">{label}</h4>
                <ul className="flex flex-col gap-1.5">
                  {items.map((b) => {
                    const req = Object.entries(b.requires) as [MaterialId, number][];
                    return (
                      <li
                        key={b.id}
                        className={`flex gap-2 rounded-lg border px-2.5 py-2 ${
                          b.produces
                            ? "border-sky-600/60 bg-sky-950/25 ring-1 ring-sky-500/20"
                            : "border-stone-700/60 bg-stone-900/40"
                        }`}
                      >
                        <img
                          src={buildingSprite(b.id)}
                          alt=""
                          draggable={false}
                          className="h-10 w-10 shrink-0 object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-sm font-semibold text-stone-100">{b.name}</span>
                            {b.income > 0 && (
                              <span className="text-[11px] font-medium text-emerald-300">매일 +{b.income}골드</span>
                            )}
                            {b.produces &&
                              (Object.entries(b.produces) as [MaterialId, number][]).map(([id, n]) => (
                                <span
                                  key={id}
                                  className="flex items-center gap-0.5 rounded bg-sky-900/60 px-1.5 py-0.5 text-[11px] font-semibold text-sky-100 ring-1 ring-sky-500/30"
                                >
                                  <GameIcon name="factory" className="h-3 w-3 shrink-0" />
                                  {MATERIAL_NAME[id]} +{n} 생산
                                </span>
                              ))}
                            <span className="ml-auto text-[10px] text-stone-500">경험치 +{b.xp}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-400">
                            <span className="flex flex-wrap items-center gap-x-1.5">
                              {req.map(([id, n]) => (
                                <span key={id} className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                  <MaterialIcon id={id} className="h-3 w-3" />
                                  {n}
                                </span>
                              ))}
                            </span>
                            {b.prereq.length > 0 && (
                              <span className="text-stone-500">· 선행 {b.prereq.map(buildingName).join("·")}</span>
                            )}
                            {b.minBook && (
                              <span className="rounded bg-sky-950/50 px-1 text-[10px] text-sky-300">책 Lv{b.minBook}</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {/* 조경 — 효과 없는 나무·밭(자재만 소모). 완공 효과가 없어 컴팩트 그리드로 자재비만 보여준다. */}
          {(() => {
            const landscape = BUILDINGS.filter(
              (b) => !b.deco && (b.category === "nature" || b.category === "field"),
            );
            if (landscape.length === 0) return null;
            return (
              <section>
                <h4 className="mb-1.5 text-xs font-semibold text-stone-400">
                  조경 <span className="font-normal text-stone-500">· 효과 없이 자재만 드는 꾸밈</span>
                </h4>
                <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {landscape.map((b) => {
                    const req = Object.entries(b.requires) as [MaterialId, number][];
                    return (
                      <li
                        key={b.id}
                        className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/40 px-2 py-1.5"
                      >
                        <img
                          src={buildingSprite(b.id)}
                          alt=""
                          draggable={false}
                          className="h-8 w-8 shrink-0 object-contain"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-stone-200">{b.name}</span>
                          <span className="flex flex-wrap items-center gap-1 text-[11px] text-stone-400">
                            {req.map(([id, n]) => (
                              <span key={id} className="inline-flex items-center gap-0.5">
                                <MaterialIcon id={id} className="h-3 w-3" />
                                {n}
                              </span>
                            ))}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
