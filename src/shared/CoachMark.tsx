"use client";
// 범용 온보딩 스포트라이트. 대상(data-coach 등 CSS 선택자)만 밝게 남기고 나머지를 어둡게 덮어
// 화살표·말풍선으로 안내한다. 대상 밖 클릭은 4스트립이 차단하고, 대상 구멍만 클릭이 통과한다.
// 미션에 종속되지 않는 순수 UI 프리미티브 — 어떤 온보딩에도 재사용 가능.
import { useEffect, useState } from "react";

type Box = { top: number; left: number; width: number; height: number };

// 대상의 가장 가까운 세로 스크롤 조상을 찾는다(없으면 null). 코치 활성 중 이 컨테이너를 잠가
// 뒷 배경이 스크롤돼 링/화살표가 대상에서 어긋나는 것을 막는다.
function scrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

// 선택자에 매칭되는 첫 "보이는" 요소를 고른다. 같은 data-coach가 반응형으로 데스크톱/모바일 두 곳에
// 달릴 수 있어(예: 인라인 미션 버튼 vs 모바일 ⋯ 버튼), display:none인 쪽(getClientRects 빈 배열)을
// 건너뛰어야 rect 0,0으로 링이 화면 좌상단에 박히는 것을 막는다.
function firstVisible(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return els.find((el) => el.getClientRects().length > 0) ?? els[0] ?? null;
}

export function CoachMark({
  targetSelector,
  missionTitle,
  title,
  hint,
  progress,
  onSkip,
  onNext,
}: {
  targetSelector?: string; // 강조할 대상. 없거나 못 찾으면 중앙 말풍선.
  missionTitle?: string;
  title: string; // 현재 단계 지시
  hint?: string;
  progress?: string; // "2 / 5"
  onSkip: () => void;
  onNext?: () => void; // 정보 단계면 [다음 ▸]으로 진행 (상태로 완료되지 않는 안내용)
}) {
  const [box, setBox] = useState<Box | null>(null);

  // 대상 위치를 rAF로 추적한다(화면 전환·레이아웃 변동·스크롤에 대응). 값이 바뀔 때만 setState.
  // 첫 측정도 rAF로 미뤄 effect 내 동기 setState(cascading render)를 피한다.
  useEffect(() => {
    let raf = 0;
    let prev = "";
    // 대상이 스크롤 컨테이너 하단에 있으면 유저가 스크롤해야 보인다. 진입 시 한 번 대상을 뷰 중앙으로
    // 끌어온 뒤 그 스크롤 조상을 잠가, 짧은 화면에서 뒷 배경이 스크롤돼 링/말풍선이 대상에서
    // 어긋나는 것을 원천 차단한다(대상이 뷰포트보다 큰 경우에도 정렬 유지). 클린업에서 원복.
    let scrolledIntoView = false;
    let lockedScroller: HTMLElement | null = null;
    let prevOverflow = "";
    const tick = () => {
      const el = targetSelector ? firstVisible(targetSelector) : null;
      if (el) {
        if (!scrolledIntoView) {
          scrolledIntoView = true;
          el.scrollIntoView({ block: "center", behavior: "auto" });
          lockedScroller = scrollableAncestor(el);
          if (lockedScroller) {
            prevOverflow = lockedScroller.style.overflow;
            lockedScroller.style.overflow = "hidden";
          }
        }
        const r = el.getBoundingClientRect();
        const key = `${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.width)},${Math.round(r.height)}`;
        if (key !== prev) {
          prev = key;
          setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
        }
      } else if (prev !== "none") {
        prev = "none";
        setBox(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (lockedScroller) lockedScroller.style.overflow = prevOverflow;
    };
  }, [targetSelector]);

  const bubble = (
    <div className="pointer-events-auto w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-amber-600/50 bg-stone-900/95 p-4 shadow-2xl ring-1 ring-amber-500/20">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-display text-xs font-bold tracking-wide text-amber-300">
          {missionTitle ?? "튜토리얼"}
        </span>
        {progress && <span className="text-[11px] tabular-nums text-stone-400">{progress}</span>}
      </div>
      <p className="text-sm font-semibold text-stone-100">{title}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-stone-400">{hint}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={onSkip}
          className="text-[11px] text-stone-500 underline-offset-2 transition hover:text-stone-300 hover:underline"
        >
          튜토리얼 건너뛰기
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-stone-950 transition hover:bg-amber-500"
          >
            다음 ▸
          </button>
        )}
      </div>
    </div>
  );

  // 대상을 못 찾으면 중앙 말풍선만 띄운다 (대상이 다른 화면·화면 밖일 때).
  // 부모는 pointer-events-none로 보드 클릭을 투과시켜, 안내가 진행(자재 투입 등)을 막지 않게 한다.
  // (말풍선 자체는 pointer-events-auto라 건너뛰기/다음 버튼은 정상 클릭된다.)
  if (!box) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">{bubble}</div>
    );
  }

  const pad = 8;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  // 강조 링(ring-offset-2 + ring-2 ≈ 4px)이 뷰포트 가장자리에서 잘리지 않게 여백을 두고 구멍을 클램프한다.
  // (푸터처럼 화면 최하단에 붙은 대상은 pad+ring이 뷰포트를 넘어 노란 링 하단이 잘렸다.)
  const ringSpace = 6;
  const holeTop = Math.max(ringSpace, box.top - pad);
  const holeLeft = Math.max(ringSpace, box.left - pad);
  const hole = {
    top: holeTop,
    left: holeLeft,
    width: Math.min(box.width + pad * 2, vw - ringSpace - holeLeft),
    height: Math.min(box.height + pad * 2, vh - ringSpace - holeTop),
  };
  const below = hole.top + hole.height < vh * 0.6; // 대상이 화면 상단부면 말풍선을 아래로
  const centerX = hole.left + hole.width / 2;
  const dim = "fixed bg-black/75 pointer-events-auto";
  // 말풍선 폭(w-[min(20rem,100vw-2rem)])의 절반. 중심이 아니라 가장자리 기준으로 클램프해 잘림 방지.
  const halfBubble = Math.min(320, vw - 32) / 2;
  const bubbleX = Math.max(16 + halfBubble, Math.min(centerX, vw - 16 - halfBubble));

  return (
    // 부모는 클릭 투과(pointer-events-none) — 구멍 영역이 버튼까지 통과되게. 막는 건 스트립(pointer-events-auto)만.
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {/* 대상 구멍만 비우는 4스트립 딤 (구멍은 클릭 통과) */}
      <div className={dim} style={{ top: 0, left: 0, width: "100%", height: Math.max(0, hole.top) }} />
      <div
        className={dim}
        style={{ top: hole.top + hole.height, left: 0, width: "100%", bottom: 0 }}
      />
      <div
        className={dim}
        style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }}
      />
      <div
        className={dim}
        style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }}
      />

      {/* 대상 강조 링 (클릭 통과) */}
      <div
        className="pointer-events-none fixed rounded-lg ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
      >
        <span className="absolute inset-0 animate-pulse rounded-lg ring-2 ring-amber-300/50" />
      </div>

      {/* 화살표 (대상을 가리킴) */}
      <div
        className="pointer-events-none fixed text-2xl text-amber-300 drop-shadow"
        style={
          below
            ? { top: hole.top + hole.height + 2, left: centerX, transform: "translateX(-50%)" }
            : { top: hole.top - 30, left: centerX, transform: "translateX(-50%)" }
        }
      >
        {below ? "▲" : "▼"}
      </div>

      {/* 말풍선 (대상 위/아래, 가로 클램프) */}
      <div
        className="fixed"
        style={{
          left: bubbleX,
          transform: "translateX(-50%)",
          ...(below
            ? { top: hole.top + hole.height + 34 }
            : { top: Math.max(16, hole.top - 34 - 160) }),
        }}
      >
        {bubble}
      </div>
    </div>
  );
}
