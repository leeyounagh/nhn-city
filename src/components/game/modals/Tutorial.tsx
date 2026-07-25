"use client";
// 도움말 — 세계관 속 "고서"처럼 연출. 카드형 5장 + 오프닝 다시보기.
import { GameIcon, type GameIconName } from "@/shared/icon/GameIcon";

const GUIDE: { icon: GameIconName; title: string; body: React.ReactNode }[] = [
  {
    icon: "compass",
    title: "길을 떠나는 법",
    body: <>월드맵에서 마을을 눌러 이동한다. 이동한 날수만큼 하루가 흐르고, <span className="text-amber-300">완성된 건물</span>이 골드를 벌어준다.</>,
  },
  {
    icon: "scroll",
    title: "소문을 읽는 법",
    body: <>마을에 도는 소문으로 <span className="text-amber-300">어느 상인이 무엇을 가졌는지</span> 추리한다. 소문은 단서 노트에 자동 기록된다.</>,
  },
  {
    icon: "trade",
    title: "상인을 설득하는 법",
    body: <>자연어로 흥정한다. 성향에 맞는 말(아부·논리·대량구매…)로 <span className="text-amber-300">호감도</span>를 올리면 값이 내려간다. 협박은 대개 역효과.</>,
  },
  {
    icon: "hammer",
    title: "폐허를 복원하는 법",
    body: <>사 온 자재를 고향 건물에 채우면 완성된다. 완성 건물은 매일 <span className="text-amber-300">골드·자재</span>를 낸다.</>,
  },
  {
    icon: "spellBook",
    title: "마법의 책을 성장시키는 법",
    body: <>건물을 지어 경험치를 쌓으면 <span className="text-sky-300">마법의 책</span> 레벨이 올라 상인의 성향·약점·하한가가 드러난다.</>,
  },
];

export function Tutorial({ onClose, onReplayStory }: { onClose: () => void; onReplayStory: () => void }) {
  return (
    <div
      className="book-backdrop fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="book-open relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-amber-700/50 bg-stone-900 shadow-2xl shadow-black/70 ring-1 ring-amber-900/40 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,164,65,0.12),transparent_60%)]" />

        {/* 표지 헤더 */}
        <div className="relative shrink-0 border-b border-amber-800/40 bg-gradient-to-b from-amber-950/40 to-transparent px-5 pb-4 pt-5 text-center">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 text-stone-400 transition hover:border-amber-600/50 hover:text-amber-200"
          >
            ✕
          </button>
          <GameIcon name="spellBook" className="mx-auto mb-1 h-9 w-9 text-amber-300 drop-shadow-[0_2px_6px_rgba(217,164,65,0.4)]" />
          <h2 className="font-display text-xl font-bold tracking-wide text-amber-200 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
            마법의 책
          </h2>
          <p className="mt-0.5 text-[11px] tracking-wide text-amber-500/70">초보 후계자를 위한 기록</p>
        </div>

        <div className="book-ink space-y-2.5 overflow-y-auto px-5 py-4">
          <p className="mb-1 text-center text-sm leading-6 text-stone-300">
            폐허가 된 고향을 다시 세우려면 — 상인을 <span className="text-amber-300">찾고</span>, 자재를 <span className="text-amber-300">거래하고</span>, 건물을 <span className="text-amber-300">복원</span>하라.
          </p>
          {GUIDE.map((g) => (
            <div key={g.title} className="flex items-start gap-3 rounded-xl border border-stone-700/70 bg-stone-800/40 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-800/40 bg-amber-950/30">
                <GameIcon name={g.icon} className="h-5 w-5 text-amber-400" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-100">{g.title}</p>
                <p className="text-sm leading-6 text-stone-400">{g.body}</p>
              </div>
            </div>
          ))}
          <div className="pt-1 text-center">
            <button
              onClick={onReplayStory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700/70 px-4 py-2 text-sm text-stone-300 transition hover:border-amber-600/50 hover:text-amber-200"
            >
              <GameIcon name="scroll" className="h-4 w-4" /> 오프닝 다시 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
