"use client";
// 폐허 고향의 아이소메트릭 건설 맵. 팔레트에서 건물을 골라(탭 또는 드래그) 빈 타일에 놓고, 자재를 드래그하거나 타일을 눌러 채워 완공한다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { MaterialId } from "@/types/game";
import { BUILDINGS, MATERIAL_NAME } from "@/lib/game-data";
import {
  type GameState,
  type Placement,
  checkPlace,
  checkPlacement,
  canDeposit,
} from "@/lib/game-state";

export const BUILDING_ICON: Record<string, string> = {
  hut: "🛖",
  well: "⛲",
  warehouse: "🏚️",
  mill: "🌾",
  smithy: "⚒️",
  inn: "🍺",
  market: "🏬",
  workshop: "🔨",
  chapel: "🕯️",
  wall: "🧱",
  watchtower: "🗼",
  guildhall: "🏛️",
  manor: "🏰",
  cathedral: "⛪",
};

const GRID = 7;
const TW = 64; // 타일 폭
const TH = 32; // 타일 높이
const OFFSET_X = (GRID - 1) * (TW / 2); // 좌측 여백 (x-y 최소값 보정)
const BOARD_W = GRID * TW;
const BOARD_H = (GRID - 1) * TH + TH;
const DRAG_THRESHOLD = 6; // px, 이 이상 움직여야 드래그로 간주 (탭과 구분)

function tilePos(x: number, y: number): { left: number; top: number } {
  return { left: (x - y) * (TW / 2) + OFFSET_X, top: (x + y) * (TH / 2) };
}

type DragState = { kind: "building" | "material"; id: string; cx: number; cy: number };
type DragRef = { kind: "building" | "material"; id: string; startX: number; startY: number; moved: boolean };

export function IsoCityMap({
  state,
  onPlace,
  onDeposit,
  onReclaim,
}: {
  state: GameState;
  onPlace: (buildingId: string, x: number, y: number) => void;
  onDeposit: (placementId: string, materialId: MaterialId) => void;
  onReclaim: (placementId: string) => void;
}) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragRef = useRef<DragRef | null>(null);
  const didDragRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const occupancy = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const p of state.placements) map.set(`${p.x},${p.y}`, p);
    return map;
  }, [state.placements]);

  // 화면 좌표 → 그리드 타일 (아이소 역변환, 줌 스케일 보정). 스프라이트 가림 없이 계산으로 판정.
  // 드래그 판정·드롭에서 최신 scale/placements가 필요하므로 effect 안에 재구성한다.
  useEffect(() => {
    function toTile(cx: number, cy: number): { x: number; y: number } | null {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const px = (cx - rect.left) / scale;
      const py = (cy - rect.top) / scale;
      const sx = px - OFFSET_X - TW / 2;
      const sy = py - TH / 2;
      const a = sx / (TW / 2); // x - y
      const b = sy / (TH / 2); // x + y
      const x = Math.round((a + b) / 2);
      const y = Math.round((b - a) / 2);
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) return null;
      return { x, y };
    }
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.moved = true;
      setDrag({ kind: d.kind, id: d.id, cx: e.clientX, cy: e.clientY });
    }
    function onUp(e: PointerEvent) {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.moved) {
        setDrag(null);
        return;
      }
      didDragRef.current = true; // 뒤따르는 click(선택 토글) 억제용
      const t = toTile(e.clientX, e.clientY);
      if (t) {
        if (d.kind === "building") {
          onPlace(d.id, t.x, t.y);
        } else {
          const pl = state.placements.find((p) => p.x === t.x && p.y === t.y && !p.built);
          if (pl) onDeposit(pl.id, d.id as MaterialId);
        }
      }
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onPlace, onDeposit, scale, state.placements]);

  const selectedPlacement = state.placements.find((p) => p.id === selectedPlacementId) ?? null;
  const inv = Object.entries(state.inventory).filter(([, n]) => n > 0);
  const placingBuilding = selectedBuilding !== null || drag?.kind === "building";

  const startBuildingDrag = (e: React.PointerEvent, buildingId: string) => {
    if (!checkPlace(buildingId, state).canPlace) return;
    didDragRef.current = false;
    dragRef.current = { kind: "building", id: buildingId, startX: e.clientX, startY: e.clientY, moved: false };
  };
  const clickBuilding = (buildingId: string) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return; // 드래그 뒤 따라오는 click은 무시
    }
    setSelectedBuilding((cur) => (cur === buildingId ? null : buildingId));
    setSelectedPlacementId(null);
  };
  const startMaterialDrag = (e: React.PointerEvent, materialId: string) => {
    didDragRef.current = false;
    dragRef.current = { kind: "material", id: materialId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const tiles = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const key = `${x},${y}`;
      const p = occupancy.get(key);
      const { left, top } = tilePos(x, y);
      tiles.push(
        <button
          key={key}
          type="button"
          onClick={() => {
            if (p) {
              setSelectedPlacementId(p.id);
              setSelectedBuilding(null);
            } else if (selectedBuilding) {
              onPlace(selectedBuilding, x, y);
              setSelectedBuilding(null);
            }
          }}
          className="absolute"
          style={{ left, top, width: TW, height: TH, zIndex: y * GRID + x }}
          aria-label={p ? `${BUILDINGS.find((b) => b.id === p.buildingId)?.name} 터` : `빈 터 ${x},${y}`}
        >
          <span
            className={`block h-full w-full transition ${
              p
                ? ""
                : placingBuilding
                  ? "bg-amber-500/25 hover:bg-amber-400/40"
                  : "bg-stone-700/30 hover:bg-stone-600/40"
            }`}
            style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }}
          />
        </button>,
      );
    }
  }

  const sprites = state.placements.map((p) => {
    const { left, top } = tilePos(p.x, p.y);
    const b = BUILDINGS.find((x) => x.id === p.buildingId);
    const chk = checkPlacement(p);
    const total = chk.slots.reduce((a, s) => a + s.need, 0);
    const have = chk.slots.reduce((a, s) => a + Math.min(s.have, s.need), 0);
    const pct = total > 0 ? Math.round((have / total) * 100) : 0;
    const materialTarget = drag?.kind === "material" && !p.built; // 드래그 중 채울 수 있는 대상 강조
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => {
          setSelectedPlacementId(p.id);
          setSelectedBuilding(null);
        }}
        className={`absolute flex flex-col items-center rounded ${materialTarget ? "ring-2 ring-emerald-400/70" : ""}`}
        style={{ left, top: top - TH, width: TW, height: TH * 2, zIndex: 1000 + p.y * GRID + p.x }}
        title={b?.name}
      >
        <span className={`text-3xl leading-none drop-shadow ${p.built ? "" : "opacity-60 grayscale"}`}>
          {BUILDING_ICON[p.buildingId] ?? "🏠"}
        </span>
        {!p.built && (
          <span className="mt-0.5 rounded bg-stone-950/80 px-1 text-[9px] font-semibold text-amber-300">
            {pct}%
          </span>
        )}
      </button>
    );
  });

  return (
    <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-stone-100">🏰 폐허가 된 고향</h2>
        <span className="text-xs text-stone-400">건물을 끌어다(또는 골라 탭) 빈 터에 놓고, 자재를 끌어다(또는 터를 눌러) 채운다</span>
        <div className="ml-auto flex items-center gap-1">
          <ZoomBtn label="－" onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))} />
          <span className="w-10 text-center text-xs text-stone-400">{Math.round(scale * 100)}%</span>
          <ZoomBtn label="＋" onClick={() => setScale((s) => Math.min(1.6, +(s + 0.2).toFixed(2)))} />
        </div>
      </div>

      {/* 인벤토리 — 자재 칩을 건물로 드래그해 채운다 */}
      <InventoryStrip inv={inv} onChipPointerDown={startMaterialDrag} />

      {/* 아이소 보드 (줌 시 스크롤로 팬) */}
      <div className="mb-3 overflow-auto rounded border border-stone-700/50 bg-stone-950/40 p-4">
        <div
          className="relative mx-auto"
          style={{ width: BOARD_W * scale, height: BOARD_H * scale }}
        >
          <div
            ref={boardRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: BOARD_W, height: BOARD_H, transform: `scale(${scale})` }}
          >
            {tiles}
            {sprites}
          </div>
        </div>
      </div>

      {/* 건물 팔레트 */}
      <BuildingPalette
        state={state}
        selectedBuilding={selectedBuilding}
        onCardPointerDown={startBuildingDrag}
        onCardClick={clickBuilding}
      />

      {/* 선택한 건물 터의 자재 투입 패널 (클릭 경로) */}
      {selectedPlacement && (
        <PlacementPanel
          placement={selectedPlacement}
          state={state}
          onDeposit={onDeposit}
          onReclaim={(id) => {
            onReclaim(id);
            setSelectedPlacementId(null);
          }}
          onClose={() => setSelectedPlacementId(null)}
        />
      )}

      {/* 드래그 고스트 (포인터를 따라다니는 미리보기) */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[2000] -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.cx, top: drag.cy }}
        >
          {drag.kind === "building" ? (
            <span className="text-4xl drop-shadow-lg">{BUILDING_ICON[drag.id] ?? "🏠"}</span>
          ) : (
            <span className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-emerald-50 shadow-lg">
              {MATERIAL_NAME[drag.id]}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function InventoryStrip({
  inv,
  onChipPointerDown,
}: {
  inv: [string, number][];
  onChipPointerDown: (e: React.PointerEvent, materialId: string) => void;
}) {
  return (
    <div className="mb-3 rounded-lg border border-stone-700/50 bg-stone-900/40 p-2.5">
      <p className="mb-1.5 text-xs font-semibold text-stone-300">
        🎒 창고 <span className="font-normal text-stone-500">— 자재를 건물로 끌어다 채운다</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {inv.length > 0 ? (
          inv.map(([id, n]) => (
            <span
              key={id}
              onPointerDown={(e) => onChipPointerDown(e, id)}
              className="cursor-grab touch-none select-none rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-200 active:cursor-grabbing"
            >
              {MATERIAL_NAME[id]} <b className="tabular-nums text-amber-300">{n}</b>
            </span>
          ))
        ) : (
          <span className="text-xs text-stone-500">창고가 비었다. 마을에서 자재를 사 오라.</span>
        )}
      </div>
    </div>
  );
}

function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
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

function BuildingPalette({
  state,
  selectedBuilding,
  onCardPointerDown,
  onCardClick,
}: {
  state: GameState;
  selectedBuilding: string | null;
  onCardPointerDown: (e: React.PointerEvent, buildingId: string) => void;
  onCardClick: (buildingId: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-stone-300">🧱 건설할 건물 — 끌어다 놓거나, 골라서 빈 터를 탭</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BUILDINGS.map((b) => {
          const c = checkPlace(b.id, state);
          const active = selectedBuilding === b.id;
          return (
            <button
              key={b.id}
              type="button"
              disabled={!c.canPlace}
              onPointerDown={(e) => onCardPointerDown(e, b.id)}
              onClick={() => onCardClick(b.id)}
              className={`flex min-w-[92px] shrink-0 touch-none select-none flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition ${
                active
                  ? "border-amber-500 bg-amber-500/15"
                  : "border-stone-700/60 bg-stone-900/40 enabled:cursor-grab enabled:hover:border-amber-600/60 enabled:active:cursor-grabbing"
              } disabled:cursor-not-allowed disabled:opacity-40`}
              title={
                !c.prereqMet
                  ? `선행 필요: ${c.missingPrereq.map((p) => BUILDINGS.find((x) => x.id === p)?.name).join(", ")}`
                  : !c.bookMet
                    ? `마법의 책 Lv.${b.minBook} 필요`
                    : b.name
              }
            >
              <span className="text-2xl leading-none">{BUILDING_ICON[b.id] ?? "🏠"}</span>
              <span className="text-xs font-semibold text-stone-100">{b.name}</span>
              {b.income > 0 && <span className="text-[10px] text-emerald-300">+{b.income}/day</span>}
              {!c.canPlace && (
                <span className="text-[10px] text-rose-400">
                  {!c.prereqMet ? "선행 필요" : `책 Lv.${b.minBook}`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlacementPanel({
  placement,
  state,
  onDeposit,
  onReclaim,
  onClose,
}: {
  placement: Placement;
  state: GameState;
  onDeposit: (placementId: string, materialId: MaterialId) => void;
  onReclaim: (placementId: string) => void;
  onClose: () => void;
}) {
  const b = BUILDINGS.find((x) => x.id === placement.buildingId)!;
  const chk = checkPlacement(placement);

  return (
    <div className="mt-3 rounded-lg border border-amber-700/50 bg-stone-900/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-stone-100">
          <span className="mr-1">{BUILDING_ICON[b.id] ?? "🏠"}</span>
          {b.name}
          {b.income > 0 && <span className="ml-2 text-xs text-emerald-300">+{b.income}/day</span>}
        </h3>
        <button onClick={onClose} aria-label="닫기" className="text-stone-400 hover:text-stone-200">
          ✕
        </button>
      </div>

      {placement.built ? (
        <p className="text-sm font-medium text-emerald-400">완성됨 — 매일 골드 수입을 낸다.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {chk.slots.map((s) => {
              const have = state.inventory[s.id] ?? 0;
              const done = s.have >= s.need;
              const depositable = canDeposit(placement, s.id, state);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded bg-stone-800/60 px-2 py-1.5"
                >
                  <span className={`text-xs ${done ? "text-emerald-300" : "text-stone-200"}`}>
                    {MATERIAL_NAME[s.id]} <span className="tabular-nums">{s.have}/{s.need}</span>
                    <span className="ml-1.5 text-[10px] text-stone-500">보유 {have}</span>
                  </span>
                  {done ? (
                    <span className="text-[11px] text-emerald-400">충족</span>
                  ) : (
                    <button
                      onClick={() => onDeposit(placement.id, s.id)}
                      disabled={!depositable}
                      className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-stone-950 transition enabled:hover:bg-amber-500 disabled:opacity-40"
                    >
                      투입 +1
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            onClick={() => onReclaim(placement.id)}
            className="mt-2 rounded border border-stone-600 px-2 py-0.5 text-[11px] text-stone-300 hover:bg-stone-700"
          >
            터 헐고 자재 회수
          </button>
        </>
      )}
    </div>
  );
}
