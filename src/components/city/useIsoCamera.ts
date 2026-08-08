// 아이소메트릭 건설 맵의 카메라(팬·줌·뷰포트 실측·가시영역 컬링)를 소유하는 훅.
import { useCallback, useEffect, useRef, useState } from "react";

export const TW = 72; // 타일 폭 (기준 배율 1)
export const TH = 36; // 타일 높이
export const DRAG_THRESHOLD = 6; // px, 이 이상 움직여야 드래그로 간주 (탭과 구분)

// 타일(x,y) → 월드 픽셀 (배율·카메라 적용 전). 무한 평면이라 경계 보정(OFFSET) 없음.
export function worldPos(x: number, y: number): { wx: number; wy: number } {
  return { wx: (x - y) * (TW / 2), wy: (x + y) * (TH / 2) };
}

export type IsoCamera = ReturnType<typeof useIsoCamera>;

export function useIsoCamera() {
  const [scale, setScale] = useState(1.2); // 타일 배율 (줌)
  const [pan, setPan] = useState({ x: 0, y: 0 }); // 카메라 오프셋(화면 px). 드래그로 이동, 사방 무한
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const boardAreaRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const panMovedRef = useRef(false);
  const didPanRef = useRef(false); // 팬 뒤 따라오는 타일 click(배치/선택) 억제용
  const panInitRef = useRef(false);
  // 활성 포인터 추적 — 손가락 2개면 핀치줌, 1개면 팬. 마우스는 항상 1개라 팬만.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // 핀치 시작 스냅샷(두 손가락 초기 거리·중점·그때의 카메라). 줌은 이 중점을 월드 고정점으로 유지.
  const pinchRef = useRef<{ startDist: number; startScale: number; startPanX: number; startPanY: number; midX: number; midY: number } | null>(null);

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

  // 배경을 끌면 카메라(pan)를 그 방향으로 옮긴다 → 타일 평면이 드래그 방향으로 밀린다.
  // 마우스·터치 공통. 터치 손가락 2개면 팬 대신 핀치줌으로 전환한다.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const pt = pointersRef.current.get(e.pointerId);
      if (pt) {
        pt.x = e.clientX;
        pt.y = e.clientY;
      }
      // 핀치줌: 두 손가락 거리비로 scale, 시작 중점을 월드 고정점으로 유지.
      const pinch = pinchRef.current;
      if (pinch && pointersRef.current.size >= 2) {
        const [a, b] = [...pointersRef.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.startDist > 0) {
          const nz = Math.min(3, Math.max(0.5, +(pinch.startScale * (dist / pinch.startDist)).toFixed(3)));
          const wx = (pinch.midX - pinch.startPanX) / pinch.startScale;
          const wy = (pinch.midY - pinch.startPanY) / pinch.startScale;
          setScale(nz);
          setPan({ x: pinch.midX - wx * nz, y: pinch.midY - wy * nz });
        }
        return;
      }
      const p = panRef.current;
      if (!p) return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (!panMovedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      panMovedRef.current = true;
      didPanRef.current = true;
      setPan({ x: p.panX + dx, y: p.panY + dy });
    }
    function onUp(e: PointerEvent) {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null; // 한 손가락 떼면 핀치 종료
      if (pointersRef.current.size === 0) {
        panRef.current = null;
        panMovedRef.current = false;
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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

  // 보드 배경을 누르면 팬 시작점을 기록한다(마우스·터치 공통). 손가락 2개째가 닿으면 핀치줌으로 전환.
  const startPan = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      panRef.current = null; // 팬 취소
      didPanRef.current = true; // 핀치 뒤 따라오는 타일 click 억제
      pinchRef.current = {
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startScale: scale,
        startPanX: pan.x,
        startPanY: pan.y,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      return;
    }
    didPanRef.current = false;
    panMovedRef.current = false;
    panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };

  // 팬 직후 따라오는 click인지 검사하고 플래그를 소비한다. true면 그 click(배치/선택)은 무시해야 한다.
  const consumePanClick = (): boolean => {
    if (didPanRef.current) {
      didPanRef.current = false;
      return true;
    }
    return false;
  };

  // 타일(tx,ty) → 화면 픽셀(좌상단). 렌더 배치용.
  const worldToScreen = (tx: number, ty: number) => {
    const { wx, wy } = worldPos(tx, ty);
    return { left: wx * scale + pan.x, top: wy * scale + pan.y };
  };

  // 화면 좌표 → 타일 (아이소 역변환, 카메라·배율 보정). 무한 평면이라 경계 검사 없음.
  // pan/scale이 바뀔 때만 재생성되어 드래그드롭 effect의 재구독을 최소화한다.
  const screenToTile = useCallback(
    (cx: number, cy: number): { x: number; y: number } | null => {
      const el = boardAreaRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const wx = (cx - rect.left - pan.x) / scale;
      const wy = (cy - rect.top - pan.y) / scale;
      const a = wx / (TW / 2); // x - y
      const b = wy / (TH / 2); // x + y
      return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) };
    },
    [pan, scale],
  );

  // 뷰포트에 걸치는 타일 좌표 범위 (가상화 컬링). 뷰포트 네 모서리로 렌더 범위를 잡는다.
  const visibleTileRange = () => {
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
    return {
      txMin: Math.floor(Math.min(...txs)) - 1,
      txMax: Math.ceil(Math.max(...txs)) + 1,
      tyMin: Math.floor(Math.min(...tys)) - 1,
      tyMax: Math.ceil(Math.max(...tys)) + 1,
    };
  };

  return {
    scale,
    viewport,
    boardAreaRef,
    zoomTo,
    startPan,
    consumePanClick,
    worldToScreen,
    screenToTile,
    visibleTileRange,
  };
}
