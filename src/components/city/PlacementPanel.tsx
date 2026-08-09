"use client";
// 선택한 건물 모달. 자재 투입 진행 + 이동·회전·삭제 액션을 노출한다.
import type { MaterialId } from "@/types/game";
import { BUILDINGS, MATERIAL_NAME, MATERIAL_TOOLTIP } from "@/lib/game-data";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { GameIcon } from "@/shared/icon/GameIcon";
import { type GameState, type Placement, checkPlacement, canDeposit, buildingPop } from "@/lib/game-state";
import { buildingSprite } from "./sprite";

export function PlacementPanel({
  placement,
  state,
  onDeposit,
  onDepositMax,
  onReclaim,
  onRotate,
  onStartMove,
  onClose,
}: {
  placement: Placement;
  state: GameState;
  onDeposit: (placementId: string, materialId: MaterialId) => void;
  onDepositMax: (placementId: string, materialId: MaterialId) => void;
  onReclaim: (placementId: string) => void;
  onRotate: (placementId: string) => void;
  onStartMove: (placementId: string) => void;
  onClose: () => void;
}) {
  const b = BUILDINGS.find((x) => x.id === placement.buildingId)!;
  const chk = checkPlacement(placement);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-amber-700/50 bg-stone-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-stone-100">
            <img
              src={buildingSprite(b.id)}
              alt=""
              draggable={false}
              style={{ transform: placement.flipped ? "scaleX(-1)" : undefined }}
              className="h-10 w-10 object-contain"
            />
            {b.name}
            {b.income > 0 && <span className="text-xs text-emerald-300">+{b.income}/day</span>}
          </h3>
          <button onClick={onClose} aria-label="닫기" className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>

        {/* 이동 · 회전 · 삭제 — 상단 고정: 아래 자재 목록이 완공으로 짧아져도 버튼 위치가 안 바뀌어 삭제 오클릭 방지 */}
        <div className="mb-1 flex gap-2">
          <button
            onClick={() => onStartMove(placement.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-sky-700/60 bg-sky-950/40 px-2 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/50"
          >
            <GameIcon name="handTruck" className="h-4 w-4" /> 이동
          </button>
          <button
            onClick={() => onRotate(placement.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-stone-600 bg-stone-800/50 px-2 py-1.5 text-xs font-semibold text-stone-200 transition hover:bg-stone-700"
          >
            <GameIcon name="clockwiseRotation" className="h-4 w-4" /> 회전
          </button>
          <button
            onClick={() => onReclaim(placement.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded border border-rose-800/60 bg-rose-950/40 px-2 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/50"
          >
            <GameIcon name="trashCan" className="h-4 w-4" /> 삭제
          </button>
        </div>
        <p className="mb-3 border-b border-stone-700/60 pb-3 text-[11px] text-stone-500">
          삭제하면 투입·소모한 자재를 전부 돌려받는다.
        </p>

        {b.deco ? (
          <p className="text-sm text-stone-300">장식물 — 위 버튼으로 이동·회전·삭제할 수 있다.</p>
        ) : (
          <>
            {/* 완공 효과 미리보기 — 구체 수치로. 미완공=완공 시, 완성=매일 내는 효과. */}
            <div className="mb-3 rounded border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
              <p className="mb-1 text-xs font-semibold text-emerald-300">
                {placement.built ? "매일 내는 효과" : "완공 시 효과"}
              </p>
              <ul className="space-y-0.5 text-xs text-stone-200">
                {b.income > 0 && (
                  <li>
                    매일 골드 <b className="tabular-nums text-amber-300">+{b.income}</b> 생산
                  </li>
                )}
                {buildingPop(b) > 0 && (
                  <li>
                    인구 <b className="tabular-nums text-sky-300">+{buildingPop(b)}</b>
                  </li>
                )}
                {b.produces &&
                  (Object.entries(b.produces) as [MaterialId, number][]).map(([id, n]) => (
                    <li key={id} className="flex items-center gap-1">
                      매일 <MaterialIcon id={id} className="h-3.5 w-3.5" />
                      {MATERIAL_NAME[id]} <b className="tabular-nums text-sky-300">{n}개</b> 생산
                    </li>
                  ))}
                {!placement.built && (
                  <li className="text-stone-400">
                    완공 시 경험치 <b className="tabular-nums text-stone-200">+{b.xp}</b>
                  </li>
                )}
              </ul>
            </div>

            {placement.built ? (
              <p className="text-sm font-medium text-emerald-400">완성됨 — 위 효과를 매일 낸다.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {chk.slots.map((s) => {
              const have = state.inventory[s.id] ?? 0;
              const done = s.have >= s.need;
              const depositable = canDeposit(placement, s.id, state);
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 rounded bg-stone-800/60 px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-1 text-xs ${done ? "text-emerald-300" : "text-stone-200"}`}>
                      <MaterialIcon id={s.id} className="h-4 w-4" />{MATERIAL_NAME[s.id]} <span className="tabular-nums">{s.have}/{s.need}</span>
                      <span className="ml-1.5 text-[10px] text-stone-500">보유 {have}</span>
                    </span>
                    {done ? (
                      <span className="text-[11px] text-emerald-400">충족</span>
                    ) : (
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => onDeposit(placement.id, s.id)}
                          disabled={!depositable}
                          className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-stone-950 transition enabled:hover:bg-amber-500 disabled:opacity-40"
                        >
                          투입 +1
                        </button>
                        <button
                          onClick={() => onDepositMax(placement.id, s.id)}
                          disabled={!depositable}
                          className="rounded border border-amber-600/70 px-2 py-0.5 text-[11px] font-semibold text-amber-300 transition enabled:hover:bg-amber-950/50 disabled:opacity-40"
                        >
                          한번에
                        </button>
                      </div>
                    )}
                  </div>
                  {/* 특수 자재(신표·희귀템)를 하나도 안 가졌으면 획득 경로 안내 — "이거 어디서 구하지?" 방지. */}
                  {MATERIAL_TOOLTIP[s.id] && !done && have === 0 && (
                    <p className="text-[10px] leading-snug text-amber-300/80">🔎 {MATERIAL_TOOLTIP[s.id]}</p>
                  )}
                </li>
              );
            })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
