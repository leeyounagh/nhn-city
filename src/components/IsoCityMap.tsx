"use client";
// 폐허 고향의 아이소메트릭 건설 맵. 팔레트에서 건물을 골라(탭 또는 드래그) 빈 타일에 놓고, 자재를 드래그하거나 타일을 눌러 채워 완공한다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { MaterialId } from "@/types/game";
import { BUILDINGS, MATERIAL_NAME, BUILDING_RENDER_SCALE } from "@/lib/game-data";
import {
  type GameState,
  type Placement,
  checkPlace,
  checkPlacement,
  canDeposit,
  hasBlueprint,
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

const TW = 72; // 타일 폭 (기준 배율 1)
const TH = 36; // 타일 높이
const DRAG_THRESHOLD = 6; // px, 이 이상 움직여야 드래그로 간주 (탭과 구분)
const BUILDING_SPRITE_SCALE = 2.3; // 건물 스프라이트 폭 = 타일폭 × 이 값 (타일 위로 솟는 하이레졸 스프라이트)

// 건물 스프라이트 경로. (Isometric Realm - Medieval by JP Cummins)
function buildingSprite(id: string): string {
  return `/buildings/${id}.png`;
}

// 타일(x,y) → 월드 픽셀 (배율·카메라 적용 전). 무한 평면이라 경계 보정(OFFSET) 없음.
function worldPos(x: number, y: number): { wx: number; wy: number } {
  return { wx: (x - y) * (TW / 2), wy: (x + y) * (TH / 2) };
}

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
  const [scale, setScale] = useState(1.2); // 타일 배율 (줌)
  const [pan, setPan] = useState({ x: 0, y: 0 }); // 카메라 오프셋(화면 px). 드래그로 이동, 사방 무한
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);

  const dragRef = useRef<DragRef | null>(null);
  const didDragRef = useRef(false);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const panMovedRef = useRef(false);
  const didPanRef = useRef(false); // 팬 뒤 따라오는 타일 click(배치/선택) 억제용
  const panInitRef = useRef(false);

  // 보드 뷰포트 실측. 가시 타일 계산·카메라 중앙정렬에 쓴다.
  useEffect(() => {
    const el = boardAreaRef.current;
    if (!el) return;
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 최초 측정 시 원점 타일(0,0)을 뷰포트 중앙에 오도록 카메라를 놓는다 (1회).
  useEffect(() => {
    if (!panInitRef.current && viewport.w > 0 && viewport.h > 0) {
      panInitRef.current = true;
      setPan({ x: viewport.w / 2, y: viewport.h / 2 });
    }
  }, [viewport]);

  // 마우스로 보드 배경을 끌면 카메라(pan)를 그 방향으로 옮긴다 → 타일 평면이 드래그 방향으로 밀린다.
  // 터치/펜은 처리하지 않는다(이 데모는 데스크톱 기준).
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const p = panRef.current;
      if (!p) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (!panMovedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      panMovedRef.current = true;
      didPanRef.current = true;
      setPan({ x: p.panX + dx, y: p.panY + dy });
    }
    function onUp() {
      panRef.current = null;
      panMovedRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // 줌: 뷰포트 중앙을 기준으로 확대/축소 (중앙 월드점 고정).
  const zoomTo = (nz: number) => {
    const cx = viewport.w / 2;
    const cy = viewport.h / 2;
    const wxc = (cx - pan.x) / scale;
    const wyc = (cy - pan.y) / scale;
    setPan({ x: cx - wxc * nz, y: cy - wyc * nz });
    setScale(nz);
  };

  const occupancy = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const p of state.placements) map.set(`${p.x},${p.y}`, p);
    return map;
  }, [state.placements]);

  // 화면 좌표 → 타일 (아이소 역변환, 카메라·배율 보정). 무한 평면이라 경계 검사 없음.
  // 드래그 드롭에서 최신 pan/scale/placements가 필요하므로 effect 안에 재구성한다.
  useEffect(() => {
    function toTile(cx: number, cy: number): { x: number; y: number } | null {
      const el = boardAreaRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const wx = (cx - rect.left - pan.x) / scale;
      const wy = (cy - rect.top - pan.y) / scale;
      const a = wx / (TW / 2); // x - y
      const b = wy / (TH / 2); // x + y
      return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) };
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
  }, [onPlace, onDeposit, scale, pan, state.placements]);

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

  // ── 가시영역 가상화: 뷰포트에 들어오는 타일/스프라이트만 렌더 (무한 평면) ──
  const tiles: React.ReactNode[] = [];
  const sprites: React.ReactNode[] = [];
  const tileW = TW * scale;
  const tileH = TH * scale;
  if (viewport.w > 0 && viewport.h > 0) {
    // 화면 px → 타일 좌표 (역변환). 뷰포트 네 모서리로 렌더 범위를 잡는다.
    const tileAtPx = (sx: number, sy: number) => {
      const wx = (sx - pan.x) / scale;
      const wy = (sy - pan.y) / scale;
      const a = wx / (TW / 2);
      const b = wy / (TH / 2);
      return { tx: (a + b) / 2, ty: (b - a) / 2 };
    };
    const corners = [
      tileAtPx(0, 0),
      tileAtPx(viewport.w, 0),
      tileAtPx(0, viewport.h),
      tileAtPx(viewport.w, viewport.h),
    ];
    const txs = corners.map((c) => c.tx);
    const tys = corners.map((c) => c.ty);
    const txMin = Math.floor(Math.min(...txs)) - 1;
    const txMax = Math.ceil(Math.max(...txs)) + 1;
    const tyMin = Math.floor(Math.min(...tys)) - 1;
    const tyMax = Math.ceil(Math.max(...tys)) + 1;

    for (let ty = tyMin; ty <= tyMax; ty++) {
      for (let tx = txMin; tx <= txMax; tx++) {
        const { wx, wy } = worldPos(tx, ty);
        const left = wx * scale + pan.x;
        const top = wy * scale + pan.y;
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
              if (didPanRef.current) {
                didPanRef.current = false;
                return; // 팬 뒤 따라오는 click은 무시
              }
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
              onClick={() => {
                if (didPanRef.current) {
                  didPanRef.current = false;
                  return;
                }
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
    <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-bold text-stone-100">🏰 폐허가 된 고향</h2>
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
        <div className="mb-2 flex items-center justify-between gap-2 rounded border border-sky-700/60 bg-sky-950/50 px-3 py-2 text-sm text-sky-200">
          <span>🚚 옮길 빈 터(초록)를 탭하세요. 빨간 칸엔 다른 건물이 있어 놓을 수 없습니다.</span>
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
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") return;
          didPanRef.current = false;
          panMovedRef.current = false;
          panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        }}
        className="relative isolate mb-3 cursor-grab touch-none overflow-hidden rounded border border-stone-700/50 bg-stone-950/40 active:cursor-grabbing"
        style={{ height: "72vh" }}
      >
        {tiles}
        {sprites}
      </div>

      {/* 건물 팔레트 */}
      <BuildingPalette
        state={state}
        selectedBuilding={selectedBuilding}
        onCardPointerDown={startBuildingDrag}
        onCardClick={clickBuilding}
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
  const normal = BUILDINGS.filter((b) => !b.deco);
  const deco = BUILDINGS.filter((b) => b.deco);
  const unlocked = hasBlueprint(state.inventory);
  const cards = (list: typeof BUILDINGS) =>
    list.map((b) => (
      <PaletteCard
        key={b.id}
        b={b}
        state={state}
        selected={selectedBuilding === b.id}
        onCardPointerDown={onCardPointerDown}
        onCardClick={onCardClick}
      />
    ));
  return (
    <div className="space-y-2">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-stone-300">🧱 건설할 건물 — 끌어다 놓거나, 골라서 빈 터를 탭</p>
        <div className="flex gap-2 overflow-x-auto pb-1">{cards(normal)}</div>
      </div>
      {unlocked && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-amber-300">
            🎨 장식 <span className="font-normal text-stone-400">— 「대건축가의 설계도」로 해금. 바닥·성벽을 자유롭게</span>
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">{cards(deco)}</div>
        </div>
      )}
    </div>
  );
}

function PaletteCard({
  b,
  state,
  selected,
  onCardPointerDown,
  onCardClick,
}: {
  b: (typeof BUILDINGS)[number];
  state: GameState;
  selected: boolean;
  onCardPointerDown: (e: React.PointerEvent, buildingId: string) => void;
  onCardClick: (buildingId: string) => void;
}) {
  const c = checkPlace(b.id, state);
  return (
    <button
      type="button"
      disabled={!c.canPlace}
      onPointerDown={(e) => onCardPointerDown(e, b.id)}
      onClick={() => onCardClick(b.id)}
      className={`flex min-w-[92px] shrink-0 touch-none select-none flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition ${
        selected
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
      <img src={buildingSprite(b.id)} alt="" draggable={false} className="pointer-events-none h-12 w-12 select-none object-contain" />
      <span className="text-xs font-semibold text-stone-100">{b.name}</span>
      {b.income > 0 && <span className="text-[10px] text-emerald-300">+{b.income}/day</span>}
      {b.produces && (
        <span className="text-[10px] text-sky-300">
          🏭 {(Object.entries(b.produces) as [MaterialId, number][]).map(([id, n]) => `${MATERIAL_NAME[id]}+${n}`).join(" ")}
        </span>
      )}
      {!b.deco && !c.canPlace && (
        <span className="text-[10px] text-rose-400">{!c.prereqMet ? "선행 필요" : `책 Lv.${b.minBook}`}</span>
      )}
    </button>
  );
}

function PlacementPanel({
  placement,
  state,
  onDeposit,
  onReclaim,
  onRotate,
  onStartMove,
  onClose,
}: {
  placement: Placement;
  state: GameState;
  onDeposit: (placementId: string, materialId: MaterialId) => void;
  onReclaim: (placementId: string) => void;
  onRotate: (placementId: string) => void;
  onStartMove: (placementId: string) => void;
  onClose: () => void;
}) {
  const b = BUILDINGS.find((x) => x.id === placement.buildingId)!;
  const chk = checkPlacement(placement);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-20 backdrop-blur-sm"
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

        {b.deco ? (
          <p className="text-sm text-stone-300">장식물 — 아래 버튼으로 이동·회전·삭제할 수 있다.</p>
        ) : placement.built ? (
          <p className="text-sm font-medium text-emerald-400">
            완성됨 — 매일 골드 수입
            {b.produces
              ? ` + ${(Object.entries(b.produces) as [MaterialId, number][]).map(([id, n]) => `${MATERIAL_NAME[id]} ${n}`).join(", ")} 생산`
              : ""}
            을(를) 낸다.
          </p>
        ) : (
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
        )}

        {/* 이동 · 회전 · 삭제 */}
        <div className="mt-4 flex gap-2 border-t border-stone-700/60 pt-3">
          <button
            onClick={() => onStartMove(placement.id)}
            className="flex-1 rounded border border-sky-700/60 bg-sky-950/40 px-2 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/50"
          >
            🚚 이동
          </button>
          <button
            onClick={() => onRotate(placement.id)}
            className="flex-1 rounded border border-stone-600 bg-stone-800/50 px-2 py-1.5 text-xs font-semibold text-stone-200 transition hover:bg-stone-700"
          >
            ↔ 회전
          </button>
          <button
            onClick={() => onReclaim(placement.id)}
            className="flex-1 rounded border border-rose-800/60 bg-rose-950/40 px-2 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/50"
          >
            🗑 삭제
          </button>
        </div>
        <p className="mt-2 text-[11px] text-stone-500">삭제하면 투입·소모한 자재를 전부 돌려받는다.</p>
      </div>
    </div>
  );
}
