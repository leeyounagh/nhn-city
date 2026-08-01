"use client";
// 상인 패널. 페르소나 + 책 레벨로 걸러진 정보 + 자재 목록을 보여준다.
import { useEffect, useState } from "react";
import type { BookLevel, MaterialId, PublicMerchant } from "@/types/game";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { GameIcon } from "@/shared/icon/GameIcon";
import { dispositionRank } from "@/lib/game-state";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

// 상인 초상화 — 실제 AI 초상화, 없으면 game-icon 폴백(분홍 이모지 대신).
function MerchantPortrait({ merchant }: { merchant: PublicMerchant }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-amber-700/40 bg-stone-800 shadow-inner shadow-black/50">
      {ok ? (
        <img
          src={`/merchants/${merchant.portraitFile ?? merchant.portrait}.png`}
          alt=""
          draggable={false}
          onError={() => setOk(false)}
          className="h-full w-full object-cover"
        />
      ) : (
        <GameIcon name="merchant" className="h-7 w-7 text-stone-500" />
      )}
    </span>
  );
}

export function MerchantPanel({
  merchant,
  bookLevel,
  busy,
  disposition,
  tokenTaken,
  onHaggle,
  onBarter,
  onClose,
}: {
  merchant: PublicMerchant | null;
  bookLevel: BookLevel;
  busy: boolean;
  disposition?: number; // 감쇠 적용된 현재 호감도 (기록 없으면 undefined = 초면)
  tokenTaken?: boolean; // 이 상인에게 신표를 이미 받았는지
  onHaggle: (id: MaterialId) => void;
  onBarter?: (rareId: MaterialId, payId: MaterialId) => void;
  onClose?: () => void;
}) {
  const [barterFor, setBarterFor] = useState<MaterialId | null>(null);
  // 마법의 책 AI 조언 (Lv2+). 상인을 열면 서버 LLM이 성정을 읽어 인게임 조언을 읊는다.
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const seed = merchant?.seed;
  // 상인/책레벨이 바뀌면 이전 조언을 지우고 새로 fetch한다(외부 HTTP 동기화 — 파생상태 오용 아님).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (seed === undefined || bookLevel < 2) {
      setAdvice(null);
      return;
    }
    let cancelled = false;
    setAdvice(null);
    setAdviceLoading(true);
    fetch("/api/book-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed, bookLevel }),
    })
      .then((r) => r.json())
      .then((d: { advice?: string | null }) => {
        if (!cancelled) setAdvice(d.advice ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAdviceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seed, bookLevel]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dialogRef = useDialogA11y(onClose ?? (() => {}));

  if (!merchant) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/40 bg-stone-900/95 p-8 text-center shadow-2xl shadow-black/70 ring-1 ring-white/5 backdrop-blur-xl">
        <GameIcon name="merchant" className="h-10 w-10 text-stone-600" />
        <p className="text-sm text-stone-400">
          {busy ? "폐허 사이로 발소리가 다가온다…" : "떠돌이 상인이 곧 나타난다."}
        </p>
      </section>
    );
  }

  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="merchant-panel-title"
      tabIndex={-1}
      className="flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl border border-amber-900/50 bg-stone-900/95 shadow-2xl shadow-black/70 ring-1 ring-white/5 backdrop-blur-xl focus:outline-none"
    >
      {/* 헤더 — 초상화·이름을 키워 첫 시선을 명확히. 닫기는 헤더 우측 내장. */}
      <div className="flex items-start justify-between gap-3 border-b border-stone-700/60 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <MerchantPortrait merchant={merchant} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="merchant-panel-title" className="truncate text-lg font-semibold tracking-wide text-stone-100">{merchant.name}</h2>
              <span className="shrink-0 rounded-full border border-stone-700 bg-stone-800 px-2 py-0.5 text-[11px] text-stone-400">{merchant.title}</span>
            </div>
            <p className="mt-0.5 truncate text-sm text-stone-400">{merchant.appearance}</p>
            {disposition !== undefined && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${dispositionRank(disposition).tone}`}
                >
                  {dispositionRank(disposition).label} · 호감도 {disposition}
                </span>
                {tokenTaken && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-800/50 bg-sky-950/30 px-2 py-0.5 text-[11px] text-sky-300">
                    <GameIcon name="spellBook" className="h-3 w-3" /> 신표 받음
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="상인 패널 닫기"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-stone-700 bg-stone-800/70 text-stone-400 transition hover:border-stone-600 hover:bg-stone-700 hover:text-stone-100"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-4">
        {/* 대사 — 양피지/가죽 느낌 */}
        <div className="rounded-lg border-l-2 border-amber-700/70 bg-stone-800/60 px-4 py-3">
          <p className="text-sm italic leading-6 text-stone-300">“{merchant.greeting}”</p>
        </div>

        {/* 마법의 책 — 보조 정보(축소) */}
        <div className="rounded-lg border border-sky-800/50 bg-sky-950/25 px-4 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            <GameIcon name="spellBook" className="h-4 w-4 text-sky-300" />
            <span className="font-semibold text-sky-300">마법의 책</span>
            <span className="rounded-full bg-sky-950/70 px-2 py-0.5 text-[11px] text-sky-300">Lv.{bookLevel}</span>
          </div>
          <p className="mt-1.5 leading-5 text-stone-400">
            {merchant.profileHint ?? "아직 흐릿하다 — 흥정하며 호감도 반응으로 취향을 읽어라."}
          </p>
          {merchant.weaknessHint && <p className="mt-1 text-amber-300">약점: {merchant.weaknessHint}</p>}
          {bookLevel >= 2 && (adviceLoading || advice) && (
            <div className="mt-1.5 border-t border-sky-800/30 pt-1.5">
              <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-sky-400/70">
                <GameIcon name="spellBook" className="h-3 w-3" /> 책의 조언 <span className="rounded bg-sky-900/50 px-1 text-[9px] text-sky-300">AI</span>
              </p>
              {adviceLoading ? (
                <p className="italic text-stone-500">책장을 넘기는 중…</p>
              ) : (
                <p className="italic text-sky-200/90">“{advice}”</p>
              )}
            </div>
          )}
        </div>

        {/* 판매 물품 — 클릭 가능한 핵심 UI. 버튼처럼. */}
        <div>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">판매 물품 · 골라서 흥정</p>
          <div className="flex flex-col gap-1.5">
            {merchant.materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => onHaggle(mat.id)}
                disabled={mat.locked}
                className="group flex min-h-12 w-full items-center justify-between gap-4 rounded-lg border border-stone-700/80 bg-stone-950/45 px-4 py-2.5 text-left transition duration-200 ease-out enabled:hover:-translate-y-px enabled:hover:border-amber-600/60 enabled:hover:bg-stone-800/80 enabled:hover:shadow-md enabled:hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <MaterialIcon id={mat.id} className="h-7 w-7 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]" />
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-stone-200">{mat.name}</span>
                    <span className="rounded-full border border-stone-700 bg-stone-800/80 px-1.5 py-0.5 text-[10px] text-stone-500">T{mat.tier}</span>
                    {mat.locked && <span className="text-[10px] text-rose-400">책 Lv.3 필요</span>}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="text-sm font-semibold tabular-nums text-amber-300">{mat.offer}</span>
                  <span className="text-xs text-amber-500/80">골드</span>
                  {mat.floorHint !== undefined && <span className="ml-1 text-[10px] text-stone-500">~{mat.floorHint}</span>}
                  <span className="ml-1 text-amber-500/60 transition group-enabled:group-hover:translate-x-0.5">▸</span>
                </span>
              </button>
            ))}
          </div>
        </div>

      {/* 물물교환: 상인이 파는 희귀템(T3)을 상인이 원하는 물품으로 맞바꾼다. */}
      {onBarter && merchant.wants.length > 0 &&
        merchant.materials.some((m) => m.tier === 3 && !m.locked) && (
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <GameIcon name="trade" className="h-4 w-4" /> 물물교환 — 원하는 물품: {merchant.wants.map((w) => w.name).join(", ")}
            </p>
            <div className="flex flex-col gap-1.5">
              {merchant.materials
                .filter((m) => m.tier === 3 && !m.locked)
                .map((rare) => (
                  <div key={rare.id} className="rounded bg-stone-800/40 px-2 py-1.5">
                    {barterFor === rare.id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-stone-300">{rare.name} ↔</span>
                        {merchant.wants.map((w) => (
                          <button
                            key={w.id}
                            onClick={() => {
                              setBarterFor(null);
                              onBarter(rare.id, w.id);
                            }}
                            className="rounded border border-emerald-700/60 px-2 py-0.5 text-xs text-emerald-200 transition hover:bg-emerald-900/40"
                          >
                            {w.name}로 지불
                          </button>
                        ))}
                        <button
                          onClick={() => setBarterFor(null)}
                          className="ml-auto text-xs text-stone-500 hover:text-stone-300"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setBarterFor(rare.id)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="text-sm text-stone-100">
                          {rare.name}
                          <span className="ml-1 text-[10px] text-stone-500">T{rare.tier}</span>
                        </span>
                        <span className="text-xs text-emerald-400">교환 ▸</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
