"use client";
// 마법의 책 열람 모달. "국보를 펼치는" 느낌 — 책 펼침 애니메이션 + 양피지/금박 톤.
// 레벨별 해금 + 흥정 카테고리 뜻풀이 + 성향 4종 개념. 2레이어 원칙: 정답 매핑(카테고리↔성향)은 없다.
import type { BookLevel } from "@/types/game";
import { BOOK_XP_THRESHOLDS, MAX_BOOK_LEVEL } from "@/lib/game-data";
import { GameIcon, type GameIconName } from "@/shared/icon/GameIcon";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

// 레벨별 해금 내용 (Lv1~3).
const LEVEL_UNLOCKS: { level: BookLevel; title: string; desc: string }[] = [
  { level: 1, title: "취급 자재 · 시세 · 도감", desc: "상인이 무엇을 파는지 보고, 자재 시세 흐름과 건물 도감(완공 효과)을 읽는다." },
  { level: 2, title: "성향 읽기", desc: "상인의 성향을 읽는다 — 무엇에 마음이 움직이는 사람인지 가늠한다." },
  { level: 3, title: "약점 간파", desc: "정확한 약점과 하한가 근사치가 드러난다. 「옛 문명의 부품」·「대건축가의 설계도」도 식별·거래할 수 있다." },
];

// 흥정 카테고리 뜻풀이 (효과 아님 — 무엇을 하는 발언인지). 색은 구분용.
const CATEGORIES: { name: string; desc: string; color: string }[] = [
  { name: "아부", desc: "치켜세워 기분을 맞춘다.", color: "border-amber-600/50 text-amber-200" },
  { name: "논리", desc: "근거로 값을 설득한다.", color: "border-sky-600/50 text-sky-200" },
  { name: "대량구매", desc: "많이 살 테니 깎아달라.", color: "border-emerald-600/50 text-emerald-200" },
  { name: "딱한 사정", desc: "처지를 호소해 동정을 산다.", color: "border-violet-600/50 text-violet-200" },
  { name: "협박", desc: "으름장으로 압박한다. 대개 역효과.", color: "border-rose-600/50 text-rose-200" },
  { name: "잡담", desc: "사담으로 거리를 좁힌다.", color: "border-teal-600/50 text-teal-200" },
  { name: "자재 흠집", desc: "흠을 짚어 값을 깎는다.", color: "border-orange-600/50 text-orange-200" },
];

// 성향 4종 개념 (성격만 — 구체 약점은 상대마다 다르고 Lv3에서 드러난다).
const PROFILES: { name: string; desc: string }[] = [
  { name: "자존심형", desc: "자부심이 강하고 대접받길 원한다." },
  { name: "탐욕형", desc: "잇속에 밝고 셈이 빠르다." },
  { name: "외로움형", desc: "말상대를 그리워하고 정에 약하다." },
  { name: "실리형", desc: "감정보다 계산으로 움직인다." },
];

// 섹션 헤더 — 아이콘 + 제목 + 좌우로 뻗는 금박 괘선.
function SectionRule({ icon, title }: { icon: GameIconName; title: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <GameIcon name={icon} className="h-4 w-4 text-amber-400/80" />
      <h3 className="shrink-0 text-sm font-semibold tracking-tight text-amber-100/90">{title}</h3>
      <span className="h-px flex-1 bg-gradient-to-r from-amber-700/50 to-transparent" />
    </div>
  );
}

export function BookCodex({
  bookLevel,
  xp,
  onShowPrices,
  onShowBuildings,
  onClose,
}: {
  bookLevel: BookLevel;
  xp: number;
  onShowPrices: () => void;
  onShowBuildings: () => void;
  onClose: () => void;
}) {
  const isMax = bookLevel >= MAX_BOOK_LEVEL;
  // 현재 레벨 구간 내 진행. Lv1: [0,30), Lv2: [30,60), Lv3: 만렙.
  const start = BOOK_XP_THRESHOLDS[bookLevel - 1] ?? 0;
  const next = BOOK_XP_THRESHOLDS[bookLevel] ?? start;
  const inLevel = xp - start;
  const span = Math.max(1, next - start);
  const pct = isMax ? 100 : Math.round((inLevel / span) * 100);
  const dialogRef = useDialogA11y(onClose);

  return (
    <div
      className="book-backdrop fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-codex-title"
        tabIndex={-1}
        className="book-open relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-700/50 bg-stone-900 shadow-2xl shadow-black/70 ring-1 ring-amber-900/40 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 책에서 배어나오는 금빛 (위쪽에서 은은히) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,164,65,0.12),transparent_60%)]" />

        {/* 표지 헤더 */}
        <div className="relative shrink-0 border-b border-amber-800/40 bg-gradient-to-b from-amber-950/40 to-transparent px-5 pb-4 pt-5 text-center">
          <button
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 text-stone-400 transition hover:text-stone-200"
          >
            ✕
          </button>
          <GameIcon name="spellBook" className="mx-auto mb-1 h-10 w-10 text-amber-300 drop-shadow-[0_2px_6px_rgba(217,164,65,0.4)]" />
          <h2 id="book-codex-title" className="font-display text-2xl font-bold tracking-wide text-amber-200 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
            마법의 책
          </h2>
          <p className="font-display mt-0.5 text-[11px] italic tracking-[0.2em] text-amber-500/70">
            The Whispering Grimoire
          </p>
          <span className="mt-2 inline-block rounded-full border border-amber-700/50 bg-amber-950/40 px-3 py-0.5 text-xs font-bold text-amber-300">
            Lv.{bookLevel}
            {isMax && <span className="ml-1 text-amber-400">· 최고</span>}
          </span>
        </div>

        <div className="book-ink relative min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* 경험치 게이지 (금빛 글로우) */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-amber-100/70">책의 성장</span>
              <span className="tabular-nums text-stone-400">
                {isMax ? "최고 레벨 도달" : `${inLevel} / ${span} XP`}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-amber-950/60 bg-stone-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-300 shadow-[0_0_8px_rgba(234,179,8,0.6)] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-stone-500">
              건물을 완성하면 경험치가 쌓여 책이 강해진다. 책이 강할수록 흥정이 유리해진다.
            </p>
          </div>

          {/* 해금된 능력 */}
          <div>
            <SectionRule icon="chest" title="해금된 능력" />
            <div className="space-y-2">
              {LEVEL_UNLOCKS.map((u) => {
                const unlocked = bookLevel >= u.level;
                const current = bookLevel === u.level;
                return (
                  <div
                    key={u.level}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                      current
                        ? "border-amber-500/70 bg-amber-950/25 ring-1 ring-amber-400/30 shadow-[0_0_16px_rgba(217,164,65,0.15)]"
                        : unlocked
                          ? "border-amber-800/40 bg-stone-800/40"
                          : "border-stone-800 bg-stone-900/50 opacity-55"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        unlocked ? "bg-amber-500 text-stone-950" : "bg-stone-700 text-stone-400"
                      }`}
                    >
                      {unlocked ? "✓" : <GameIcon name="padlock" className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-100">
                        <span className="mr-1 font-bold text-amber-300/90">Lv.{u.level}</span>
                        {u.title}
                        {current && <span className="ml-1.5 text-[10px] font-normal text-amber-400">지금 이 레벨</span>}
                      </p>
                      <p className="text-xs text-stone-400">
                        {unlocked ? u.desc : "어둠 속에 봉인되어 있다."}
                      </p>
                      {u.level === 1 && unlocked && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            onClick={onShowPrices}
                            className="inline-flex items-center gap-1 rounded border border-sky-700/50 bg-sky-950/40 px-2 py-1 text-[11px] font-medium text-sky-200 transition hover:bg-sky-900/50"
                          >
                            <GameIcon name="spellBook" className="h-3.5 w-3.5" /> 자재 시세 그래프
                          </button>
                          <button
                            onClick={onShowBuildings}
                            className="inline-flex items-center gap-1 rounded border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[11px] font-medium text-amber-200 transition hover:bg-amber-900/40"
                          >
                            <GameIcon name="hammer" className="h-3.5 w-3.5" /> 건물 도감
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 흥정 기술 */}
          <div>
            <SectionRule icon="trade" title="흥정 기술" />
            <p className="mb-2 text-[11px] text-stone-500">
              무엇이 먹힐지는 상대마다 다르다. 반응을 보고, 책이 강해지면 그 상인의 약점이 드러난다.
            </p>
            {/* 모바일: 이름+뜻 한 줄씩 리스트(칩 폭이 넓어 pill이 지저분하게 줄바꿈됨). sm+: 인라인 pill로 감쌈. */}
            <div className="space-y-1.5 sm:flex sm:flex-wrap sm:gap-1.5 sm:space-y-0">
              {CATEGORIES.map((c) => (
                <span
                  key={c.name}
                  title={c.desc}
                  className={`flex items-baseline gap-1 rounded-lg border bg-stone-800/70 px-3 py-1.5 text-xs transition hover:bg-stone-800 sm:rounded-full sm:py-1 ${c.color}`}
                >
                  <b className="shrink-0 font-semibold">{c.name}</b>
                  <span className="text-stone-400">· {c.desc}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 상인 성향 */}
          <div>
            <SectionRule icon="merchant" title="상인의 성향" />
            <p className="mb-2 text-[11px] text-stone-500">
              상인의 겉모습·말투는 매번 다르지만, 속내는 아래 <b className="text-violet-300">네 성향</b> 중 하나다. 책 Lv2에서 그 상인의 성향이, Lv3에서 정확한 약점이 드러난다.
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {PROFILES.map((p) => (
                <div key={p.name} className="rounded-lg border border-stone-700/60 bg-stone-800/40 px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-violet-300">{p.name}</span>
                  <span className="ml-1.5 text-xs text-stone-400">{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
