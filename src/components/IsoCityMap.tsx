"use client";
// 폐허 고향의 아이소메트릭 건설 맵. 팔레트에서 건물을 골라(탭 또는 드래그) 빈 타일에 놓고, 자재를 드래그하거나 타일을 눌러 채워 완공한다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { MaterialId } from "@/types/game";
import { BUILDINGS, MATERIAL_NAME, BUILDING_RENDER_SCALE } from "@/lib/game-data";
import { GameIcon } from "@/shared/icon/GameIcon";
import {
  type GameState,
  type Placement,
  checkPlace,
  checkPlacement,
  homeIcon,
} from "@/lib/game-state";
import { buildingSprite } from "@/components/city/sprite";
import { TW, TH, DRAG_THRESHOLD, useIsoCamera } from "@/components/city/useIsoCamera";
import { BuildingPalette } from "@/components/city/BuildingPalette";
import { PlacementPanel } from "@/components/city/PlacementPanel";
import { InventoryStrip, ZoomBtn } from "@/components/city/InventoryStrip";

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

const BUILDING_SPRITE_SCALE = 2.3; // 건물 스프라이트 폭 = 타일폭 × 이 값 (타일 위로 솟는 하이레졸 스프라이트)

type DragState = { kind: "building" | "material"; id: string; cx: number; cy: number };
type DragRef = { kind: "building" | "material"; id: string; startX: number; startY: number; moved: boolean };

export function IsoCityMap({
  state,
  onPlace,
  onDeposit,
  onReclaim,
  onMove,
  onRotate,
}: {
  state: GameState;
  onPlace: (buildingId: string, x: number, y: number) => void;
  onDeposit: (placementId: string, materialId: MaterialId) => void;
  onReclaim: (placementId: string) => void;
  onMove: (placementId: string, x: number, y: number) => void;
  onRotate: (placementId: string) => void;
}) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null); // 이동 모드: 옮기는 중인 건물 id
  const [drag, setDrag] = useState<DragState | null>(null);

  const { scale, viewport, boardAreaRef, zoomTo, startPan, consumePanClick, worldToScreen, screenToTile, visibleTileRange } =
    useIsoCamera();
  const dragRef = useRef<DragRef | null>(null);
  const didDragRef = useRef(false);
  // 건물 팔레트 마우스 드래그 스크롤 상태.
  const scrollDragRef = useRef<{ startX: number; startY: number; startScroll: number; el: HTMLElement; decided: boolean; scrolling: boolean } | null>(null);

  // 건물 팔레트 마우스 좌우 드래그 스크롤. 가로 드래그=스크롤, 세로 드래그=배치에 양보. 터치는 네이티브 스크롤.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const s = scrollDragRef.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (!s.decided) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        s.decided = true;
        s.scrolling = Math.abs(dx) > Math.abs(dy);
        if (s.scrolling) {
          dragRef.current = null; // 카드 배치 드래그 취소
          didDragRef.current = true; // 뒤따르는 클릭(선택) 억제
        } else {
          scrollDragRef.current = null; // 세로 드래그 → 배치에 양보
          return;
        }
      }
      if (s.scrolling) s.el.scrollLeft = s.startScroll - dx;
    }
    function onUp() {
      scrollDragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const occupancy = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const p of state.placements) map.set(`${p.x},${p.y}`, p);
    return map;
  }, [state.placements]);

  // 건물/자재 드래그드롭. 드롭 지점을 타일로 역변환해 배치·투입한다.
  // 카메라(pan/scale)가 바뀌면 screenToTile이 갱신되어 effect가 재구독된다.
  useEffect(() => {
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
      if (d.kind === "building") {
        const t = screenToTile(e.clientX, e.clientY);
        if (t) onPlace(d.id, t.x, t.y);
      } else {
        // 자재: 커서 아래 건물 스프라이트를 먼저 히트테스트한다. 건물 그림이 베이스 타일 위로
        // 솟아 그려져서 타일 좌표만으론 빗나가므로, 보이는 건물에 놓으면 그 건물에 투입한다.
        const hitId = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-pid]")?.getAttribute("data-pid");
        let target = hitId ? state.placements.find((p) => p.id === hitId && !p.built) ?? null : null;
        if (!target) {
          const t = screenToTile(e.clientX, e.clientY);
          if (t) target = state.placements.find((p) => p.x === t.x && p.y === t.y && !p.built) ?? null;
        }
        if (target) onDeposit(target.id, d.id as MaterialId);
      }
      setDrag(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onPlace, onDeposit, state.placements, screenToTile]);

  const selectedPlacement = state.placements.find((p) => p.id === selectedPlacementId) ?? null;
  const inv = Object.entries(state.inventory).filter(([, n]) => n > 0);
  const placingBuilding = selectedBuilding !== null || drag?.kind === "building";

  const startBuildingDrag = (e: React.PointerEvent, buildingId: string) => {
    if (e.pointerType !== "mouse") return; // 터치는 네이티브 스크롤 + 탭 선택으로 배치
    if (!checkPlace(buildingId, state).canPlace) return;
    didDragRef.current = false;
    dragRef.current = { kind: "building", id: buildingId, startX: e.clientX, startY: e.clientY, moved: false };
  };
  // 팔레트 스트립을 마우스로 누르면 좌우 드래그 스크롤 시작점을 기록한다.
  const stripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    scrollDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScroll: e.currentTarget.scrollLeft,
      el: e.currentTarget,
      decided: false,
      scrolling: false,
    };
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

  // ── 가시영역 가상화: 뷰포트에 들어오는 타일/스프라이트만 렌더 (무한 평면) ──
  const tiles: React.ReactNode[] = [];
  const sprites: React.ReactNode[] = [];
  const tileW = TW * scale;
  const tileH = TH * scale;
  if (viewport.w > 0 && viewport.h > 0) {
    const { txMin, txMax, tyMin, tyMax } = visibleTileRange();

    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        const { left, top } = worldToScreen(tx, ty);
        // 화면 밖 타일은 컬링 (스프라이트는 위로 tileH 솟으니 상단 여유를 더 준다)
        if (left < -tileW || left > viewport.w + tileW || top < -tileH * 3 || top > viewport.h + tileH) {
          continue;
        }
        const key = `${tx},${ty}`;
        const p = occupancy.get(key);
        const even = (((tx + ty) % 2) + 2) % 2 === 0; // 체커보드 (음수 좌표 보정)
        tiles.push(
          <button
            key={`t${key}`}
            type="button"
            onClick={() => {
              if (consumePanClick()) return; // 팬 뒤 따라오는 click은 무시
              if (movingId) {
                if (!p) {
                  onMove(movingId, tx, ty); // 빈 타일 → 이동
                  setMovingId(null);
                } else if (p.id === movingId) {
                  setMovingId(null); // 제자리 탭 = 이동 취소
                }
                return; // 다른 건물 위(빨강)면 무시
              }
              if (p) {
                setSelectedPlacementId(p.id);
                setSelectedBuilding(null);
              } else if (selectedBuilding) {
                onPlace(selectedBuilding, tx, ty);
                setSelectedBuilding(null);
              }
            }}
            className="absolute"
            // clip-path를 버튼에 적용해 클릭 히트영역을 다이아몬드로 제한 (사각형 겹침으로 앞 타일이 클릭 가로채는 문제 해결).
            style={{
              left,
              top,
              width: tileW,
              height: tileH,
              zIndex: 1000 + tx + ty,
              clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
            }}
            aria-label={p ? `${BUILDINGS.find((b) => b.id === p.buildingId)?.name} 터` : `빈 터 ${tx},${ty}`}
          >
            <span
              className="block h-full w-full transition hover:brightness-150"
              style={{
                clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                backgroundColor: movingId
                  ? p
                    ? p.id === movingId
                      ? "rgba(56,189,248,0.5)" // 옮기는 건물 제자리 = 하늘색
                      : "rgba(220,38,38,0.6)" // 다른 건물 위 = 빨강(배치 불가)
                    : "rgba(34,197,94,0.45)" // 빈 타일 = 초록(옮길 수 있음)
                  : p
                    ? "rgba(120,90,60,0.15)"
                    : placingBuilding
                      ? "rgba(245,158,11,0.45)"
                      : even
                        ? "rgba(124,92,60,0.42)"
                        : "rgba(94,71,48,0.42)",
              }}
            />
          </button>,
        );

        if (p) {
          const b = BUILDINGS.find((x) => x.id === p.buildingId);
          if (b?.flat) {
            // 바닥 장식: 타일 지면으로 렌더(위로 솟지 않음). 선택 클릭은 아래 타일 버튼이 처리.
            sprites.push(
              <img
                key={`f${p.id}`}
                src={buildingSprite(p.buildingId)}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: tileW,
                  height: tileH,
                  objectFit: "cover",
                  clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                  transform: p.flipped ? "scaleX(-1)" : undefined,
                  opacity: p.id === movingId ? 0.4 : 1,
                  zIndex: 1500 + tx + ty,
                  pointerEvents: "none",
                }}
              />,
            );
            continue;
          }
          const chk = checkPlacement(p);
          const totalNeed = chk.slots.reduce((a, s) => a + s.need, 0);
          const have = chk.slots.reduce((a, s) => a + Math.min(s.have, s.need), 0);
          const pct = totalNeed > 0 ? Math.round((have / totalNeed) * 100) : 0;
          const materialTarget = drag?.kind === "material" && !p.built;
          const spriteW = tileW * BUILDING_SPRITE_SCALE * (BUILDING_RENDER_SCALE[p.buildingId] ?? 1);
          sprites.push(
            <button
              key={`s${p.id}`}
              type="button"
              data-pid={p.id} // 자재 드래그 드롭 히트테스트용 (elementFromPoint로 이 건물을 특정)
              onClick={() => {
                if (consumePanClick()) return;
                setSelectedPlacementId(p.id);
                setSelectedBuilding(null);
              }}
              // 스프라이트 바닥중앙을 타일 중앙에 앵커 (translate -50%,-100% → 건물이 타일 위로 솟음).
              className="absolute"
              style={{
                left: left + tileW / 2,
                top: top + tileH / 2,
                width: spriteW,
                transform: "translate(-50%, -100%)",
                zIndex: 100000 + tx + ty,
              }}
              title={b?.name}
            >
              <img
                src={buildingSprite(p.buildingId)}
                alt={b?.name ?? ""}
                draggable={false}
                style={{ transform: p.flipped ? "scaleX(-1)" : undefined }}
                className={`pointer-events-none w-full select-none ${
                  p.built ? "" : "opacity-70 grayscale"
                } ${p.id === movingId ? "opacity-40" : ""} ${materialTarget ? "drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]" : ""}`}
              />
              {!p.built && (
                <span className="pointer-events-none absolute bottom-[30%] left-1/2 -translate-x-1/2 rounded bg-stone-950/85 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 shadow">
                  {pct}%
                </span>
              )}
            </button>,
          );
        }
      }
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-stone-700 bg-stone-900/60 p-3">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <h2 className="font-display flex items-center gap-1.5 text-base font-bold text-stone-100">
          <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-stone-600/50 bg-stone-950/50">
            <img
              src={buildingSprite(homeIcon(state.placements))}
              alt=""
              draggable={false}
              className="h-6 w-6 object-contain"
            />
          </span>
          폐허가 된 고향
        </h2>
        <span className="text-xs text-stone-400">건물을 끌어다(또는 골라 탭) 빈 터에 놓고, 자재를 끌어다(또는 터를 눌러) 채운다</span>
        <div className="ml-auto flex items-center gap-1">
          <ZoomBtn label="－" onClick={() => zoomTo(Math.max(0.5, +(scale - 0.2).toFixed(2)))} />
          <span className="w-10 text-center text-xs text-stone-400">{Math.round(scale * 100)}%</span>
          <ZoomBtn label="＋" onClick={() => zoomTo(Math.min(3, +(scale + 0.2).toFixed(2)))} />
        </div>
      </div>

      {/* 인벤토리 — 자재 칩을 건물로 드래그해 채운다 */}
      <InventoryStrip inv={inv} onChipPointerDown={startMaterialDrag} />

      {/* 이동 모드 안내 */}
      {movingId && (
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded border border-sky-700/60 bg-sky-950/50 px-3 py-2 text-sm text-sky-200">
          <span className="flex items-center gap-1.5"><GameIcon name="handTruck" className="h-4 w-4 shrink-0" /> 옮길 빈 터(초록)를 탭하세요. 빨간 칸엔 다른 건물이 있어 놓을 수 없습니다.</span>
          <button
            onClick={() => setMovingId(null)}
            className="shrink-0 rounded border border-sky-600 px-2 py-0.5 text-xs text-sky-100 hover:bg-sky-900/60"
          >
            취소
          </button>
        </div>
      )}

      {/* 아이소 보드 — 무한 평면. 배경을 마우스로 끌면 카메라가 그 방향으로 이동(타일이 밀림) */}
      <div
        ref={boardAreaRef}
        onPointerDown={startPan}
        className="relative isolate mb-2 min-h-0 flex-1 cursor-grab touch-none overflow-hidden rounded border border-stone-700 bg-stone-950/40 shadow-[inset_0_0_50px_rgba(0,0,0,0.55)] ring-1 ring-amber-900/20 active:cursor-grabbing"
      >
        {tiles}
        {sprites}
        {/* 비네트 — 중앙을 띄우고 가장자리를 어둡게. 클릭은 통과. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
      </div>

      {/* 건물 팔레트 */}
      <BuildingPalette
        state={state}
        selectedBuilding={selectedBuilding}
        onCardPointerDown={startBuildingDrag}
        onCardClick={clickBuilding}
        onStripPointerDown={stripPointerDown}
      />

      {/* 선택한 건물 모달 — 자재 투입 + 이동·회전·삭제 */}
      {selectedPlacement && (
        <PlacementPanel
          placement={selectedPlacement}
          state={state}
          onDeposit={onDeposit}
          onReclaim={(id) => {
            onReclaim(id);
            setSelectedPlacementId(null);
          }}
          onRotate={onRotate}
          onStartMove={(id) => {
            setMovingId(id);
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
            <img src={buildingSprite(drag.id)} alt="" className="w-32 opacity-90 drop-shadow-lg" draggable={false} />
          ) : (
            <span className="rounded bg-stone-800 px-2 py-0.5 text-xs font-semibold text-amber-100 shadow-lg ring-1 ring-amber-600/40">
              {MATERIAL_NAME[drag.id]}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
