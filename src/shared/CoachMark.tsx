"use client";
// 범용 온보딩 스포트라이트. 대상(data-coach 등 CSS 선택자)만 밝게 남기고 나머지를 어둡게 덮어
// 화살표·말풍선으로 안내한다. 대상 밖 클릭은 4스트립이 차단하고, 대상 구멍만 클릭이 통과한다.
// 미션에 종속되지 않는 순수 UI 프리미티브 — 어떤 온보딩에도 재사용 가능.
import { useEffect, useState } from "react";

type Box = { top: number; left: number; width: number; height: number };

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
    const tick = () => {
      const el = targetSelector ? (document.querySelector(targetSelector) as HTMLElement | null) : null;
      if (el) {
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
    return () => cancelAnimationFrame(raf);
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

  // 대상을 못 찾으면 전체 딤 + 중앙 말풍선 (대상이 다른 화면에 있을 때).
  if (!box) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">{bubble}</div>
    );
  }

  const pad = 8;
  const hole = {
    top: box.top - pad,
    left: box.left - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  };
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
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
