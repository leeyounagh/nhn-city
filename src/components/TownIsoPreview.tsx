"use client";
// 마을 아이소 미리보기. 읽기전용 7×7 씬(업종 테마 바닥 + 건물·장식). 마우스 드래그로 팬, ±로 줌.
import { useEffect, useRef, useState } from "react";
import type { TownId } from "@/types/game";
import { TOWN_SCENES, TOWN_FLOOR, TOWN_BG, SCENE_GRID } from "@/lib/town-scenes";
import { BUILDING_RENDER_SCALE } from "@/lib/game-data";

const TW = 72;
const TH = 36;
const SPRITE_SCALE = 2.3;
const DIAMOND = "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)";
// 지면처럼 평평하게 깔리는 스프라이트(밭 등) — 다이아로 클립해 바닥 위에 렌더.
const FLAT_SPRITES = new Set(["field"]);

function worldPos(x: number, y: number) {
  return { wx: (x - y) * (TW / 2), wy: (x + y) * (TH / 2) };
}
function sprite(id: string) {
  return `/buildings/${id}.png`;
}

export function TownIsoPreview({ townId }: { townId: TownId }) {
  const scene = TOWN_SCENES[townId];
  const floor = TOWN_FLOOR[townId];

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 최초 측정 시 7×7 전체가 보이도록 auto-fit + 중앙 정렬 (1회).
  useEffect(() => {
    if (initRef.current || viewport.w === 0 || viewport.h === 0) return;
    initRef.current = true;
    const contentW = SCENE_GRID * TW; // 지면 폭 + 여백
    const contentH = (SCENE_GRID - 1) * TH + TW * 2; // 지면 높이 + 건물 헤드룸
    const fit = Math.min((viewport.w - 24) / contentW, (viewport.h - 24) / contentH);
    setScale(fit);
    // 지면 중앙(world (0, 3*TH))을 박스 하단 60%쯤에 두어 위로 건물 헤드룸 확보.
    setPan({ x: viewport.w / 2, y: viewport.h * 0.62 - (SCENE_GRID - 1) * (TH / 2) * fit });
  }, [viewport]);

  // 마우스 드래그 팬.
  useEffect(() => {
    function move(e: PointerEvent) {
      const p = panRef.current;
      if (!p) return;
      setPan({ x: p.px + (e.clientX - p.sx), y: p.py + (e.clientY - p.sy) });
    }
    function up() {
      panRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const zoom = (nz: number) => {
    const cx = viewport.w / 2;
    const cy = viewport.h / 2;
    const wxc = (cx - pan.x) / scale;
    const wyc = (cy - pan.y) / scale;
    setPan({ x: cx - wxc * nz, y: cy - wyc * nz });
    setScale(nz);
  };

  const tileW = TW * scale;
  const tileH = TH * scale;

  const grounds: React.ReactNode[] = [];
  const sprites: React.ReactNode[] = [];
  if (viewport.w > 0) {
    for (let y = 0; y < SCENE_GRID; y++) {
      for (let x = 0; x < SCENE_GRID; x++) {
        const { wx, wy } = worldPos(x, y);
        // 인접 타일과 겹치게 확대(~8%)해 다이아 사이 공백(seam)을 없앤다. (배경색과 함께 이중 방어)
        const gw = tileW * 1.08;
        const gh = tileH * 1.08;
        grounds.push(
          <img
            key={`g${x},${y}`}
            src={sprite(floor)}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: wx * scale + pan.x - gw / 2,
              top: wy * scale + pan.y - gh / 2,
              width: gw,
              height: gh,
              objectFit: "cover",
              clipPath: DIAMOND,
              zIndex: 100 + x + y,
              pointerEvents: "none",
            }}
          />,
        );
      }
    }
    for (const s of scene) {
      const { wx, wy } = worldPos(s.x, s.y);
      // 밭 등 평평한 스프라이트는 지면 다이아로 렌더(바닥 위에 덮임).
      if (FLAT_SPRITES.has(s.sprite)) {
        const fw = tileW * 1.08;
        const fh = tileH * 1.08;
        grounds.push(
          <img
            key={`f${s.x},${s.y},${s.sprite}`}
            src={sprite(s.sprite)}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: wx * scale + pan.x - fw / 2,
              top: wy * scale + pan.y - fh / 2,
              width: fw,
              height: fh,
              objectFit: "cover",
              clipPath: DIAMOND,
              zIndex: 200 + s.x + s.y,
              pointerEvents: "none",
            }}
          />,
        );
        continue;
      }
      sprites.push(
        <img
          key={`s${s.x},${s.y},${s.sprite}`}
          src={sprite(s.sprite)}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: wx * scale + pan.x,
            top: wy * scale + pan.y,
            width: tileW * SPRITE_SCALE * (BUILDING_RENDER_SCALE[s.sprite] ?? 1),
            transform: `translate(-50%, -100%)${s.flipped ? " scaleX(-1)" : ""}`,
            zIndex: 10000 + s.x + s.y,
            pointerEvents: "none",
          }}
        />,
      );
    }
  }

  return (
    <div className="relative isolate overflow-hidden rounded-lg border border-stone-700/60 bg-stone-950/50">
      <div className="absolute right-2 top-2 z-[20000] flex items-center gap-1">
        <ZoomBtn label="－" onClick={() => zoom(Math.max(0.4, +(scale - 0.15).toFixed(2)))} />
        <ZoomBtn label="＋" onClick={() => zoom(Math.min(2.5, +(scale + 0.15).toFixed(2)))} />
      </div>
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") return;
          panRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
        }}
        style={{ backgroundColor: TOWN_BG[townId] }}
        className="relative h-[440px] w-full cursor-grab touch-none active:cursor-grabbing"
      >
        {grounds}
        {sprites}
      </div>
    </div>
  );
}

function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 w-7 rounded border border-stone-600 bg-stone-900/80 text-sm text-stone-200 transition hover:bg-stone-800"
    >
      {label}
    </button>
  );
}
