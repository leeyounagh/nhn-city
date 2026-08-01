"use client";
// 멀티턴 흥정 대화창. 발언→서버 판정→호감도·가격 갱신. 수락 시 수량만큼 구매.
import { useEffect, useRef, useState } from "react";
import type { PublicMerchant } from "@/types/game";
import type { HaggleState } from "@/lib/game-state";
import { CATEGORY_LABEL, PORTRAIT_EMOJI } from "@/lib/labels";
import { GameIcon } from "@/shared/icon/GameIcon";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

// 상인 초상화. /merchants/{portrait}.png 있으면 그림, 없으면 이모지 폴백. 크기는 className으로 조절.
function Portrait({
  portrait,
  file,
  className = "h-12 w-12 shrink-0 rounded border border-stone-700 object-cover",
  emojiClassName = "flex h-12 w-12 shrink-0 items-center justify-center rounded border border-stone-700 bg-stone-800 text-2xl",
}: {
  portrait: string;
  file?: string;
  className?: string;
  emojiClassName?: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  if (imgOk) {
    return (
      <img
        src={`/merchants/${file ?? portrait}.png`}
        alt=""
        onError={() => setImgOk(false)}
        className={className}
      />
    );
  }
  return (
    <span className={emojiClassName}>
      {PORTRAIT_EMOJI[portrait] ?? "🧑"}
    </span>
  );
}

// 턴 반응 표시. 호감도는 오르면 좋음(▲), 값은 내리면 좋음(↓).
function arrow(delta: number, isDisposition: boolean): string {
  if (delta === 0) return "변화 없음";
  const n = Math.abs(delta);
  if (isDisposition) return delta > 0 ? `▲${n}` : `▼${n}`;
  return delta < 0 ? `↓${n}` : `↑${n}`;
}

function deltaColor(delta: number, isDisposition: boolean): string {
  const good = isDisposition ? delta > 0 : delta < 0;
  const bad = isDisposition ? delta < 0 : delta > 0;
  if (good) return "text-emerald-300";
  if (bad) return "text-rose-300";
  return "text-stone-400";
}

// 호감도 구간별 색. 낮음=적대(rose), 중간=중립(amber), 높음=우호(emerald).
function dispColor(d: number): { text: string; bar: string } {
  if (d >= 67) return { text: "text-emerald-300", bar: "bg-emerald-500" };
  if (d >= 34) return { text: "text-amber-300", bar: "bg-amber-500" };
  return { text: "text-rose-300", bar: "bg-rose-500" };
}
// 마법의 책 분석 카드의 한 줄. 값이 있으면 공개, 없으면 ?(잠금 안내).
function AnalysisRow({ label, value, lock }: { label: string; value?: string; lock?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      {value ? (
        <p className="text-xs leading-snug text-stone-300">{value}</p>
      ) : (
        <p className="flex items-center gap-1 text-xs text-stone-600">
          <span className="font-bold text-amber-500/60">?</span> {lock}
        </p>
      )}
    </div>
  );
}

// 호감도 → 기분 한마디 (이모지 대신 텍스트로).
function dispMood(d: number): string {
  if (d >= 80) return "깊은 신뢰";
  if (d >= 67) return "우호적";
  if (d >= 45) return "누그러짐";
  if (d >= 34) return "데면데면";
  if (d >= 15) return "떨떠름";
  return "적대적";
}

export function HaggleDialog({
  merchant,
  haggle,
  gold,
  inventory,
  onSend,
  onBuy,
  onClose,
}: {
  merchant: PublicMerchant;
  haggle: HaggleState;
  gold: number;
  inventory: Record<string, number>;
  onSend: (text: string) => void;
  onBuy: (qty: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);
  const dialogRef = useDialogA11y(onClose);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [haggle.log.length, haggle.pending]);

  const isBarter = haggle.mode === "barter";
  // 물물교환은 교환비(N)가 첫 턴 후에야 정해진다(currentPrice=0이면 아직 미정).
  const priceReady = haggle.currentPrice > 0;
  const payHave = isBarter && haggle.payMaterialId ? inventory[haggle.payMaterialId] ?? 0 : 0;
  const maxQty = !priceReady
    ? 0
    : isBarter
      ? Math.floor(payHave / haggle.currentPrice)
      : Math.floor(gold / haggle.currentPrice);
  const canBuy = haggle.status !== "closed" && maxQty >= 1;
  const ongoing = haggle.status === "ongoing";

  const submit = () => {
    const t = text.trim();
    if (!t || haggle.pending || !ongoing) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="haggle-title"
        tabIndex={-1}
        className="flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg border border-stone-700 bg-stone-900 focus:outline-none sm:h-[80dvh] sm:max-w-3xl sm:flex-row sm:rounded-lg"
      >
        {/* 왼쪽 — 초상화 + 마법의 책 분석 카드 (데스크톱 전용) */}
        <aside className="hidden shrink-0 flex-col gap-3 overflow-y-auto border-r border-stone-700 bg-stone-950/40 p-4 sm:flex sm:w-60">
          <Portrait
            portrait={merchant.portrait}
            file={merchant.portraitFile}
            className="aspect-square w-full rounded-lg border border-stone-700 object-cover shadow-lg"
            emojiClassName="flex aspect-square w-full items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-7xl"
          />
          <div className="text-center">
            <p className="text-lg font-semibold text-stone-100">{merchant.name}</p>
            <p className="text-xs text-stone-400">{merchant.title}</p>
            <p className="mt-1 text-xs text-amber-300/80">
              {isBarter ? `${haggle.materialName} 물물교환` : `${haggle.materialName} 흥정`}
            </p>
          </div>
          {/* 마법의 책 분석 — 흥정이 곧 정보 수집. 책 레벨로 단서가 하나씩 열린다. */}
          <div className="rounded-lg border border-sky-800/50 bg-sky-950/25 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <GameIcon name="spellBook" className="h-4 w-4" /> 마법의 책 분석
            </p>
            <div className="space-y-2">
              <AnalysisRow label="성격" value={merchant.personalityTone} />
              <AnalysisRow label="성향" value={merchant.profileHint} lock="책 Lv.2에서 열림" />
              <AnalysisRow label="약점" value={merchant.weaknessHint} lock="책 Lv.3에서 열림" />
            </div>
          </div>
        </aside>

        {/* 오른쪽 대화 열 */}
        <div className="flex min-w-0 flex-1 flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-stone-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <Portrait portrait={merchant.portrait} file={merchant.portraitFile} />
            <div>
              <p id="haggle-title" className="font-semibold text-stone-100">
                {merchant.name}와(과) {isBarter ? "물물교환" : "흥정"}
              </p>
              <p className="text-xs text-stone-400">
                {merchant.title} · {isBarter ? `${haggle.materialName} ↔ ${haggle.payMaterialName}` : haggle.materialName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200">✕</button>
        </div>

        {/* 상태 바 */}
        <div className="grid grid-cols-3 gap-2 border-b border-stone-800 px-4 py-3 text-center text-xs">
          <div>
            <p className="text-stone-400">{isBarter ? "교환비 (1개당)" : "현재가"}</p>
            <p className="text-lg font-bold tabular-nums text-amber-300">
              {isBarter
                ? priceReady
                  ? `${haggle.payMaterialName} ${haggle.currentPrice}개`
                  : "흥정 전"
                : `${haggle.currentPrice}G`}
            </p>
            {/* 기준가 대비 얼마나 깎았는지 = 흥정 게임의 핵심 피드백 */}
            {!isBarter && (
              <p className="text-[10px] text-stone-500">
                기준 {haggle.offer}G
                {haggle.offer - haggle.currentPrice > 0 && (
                  <span className="ml-1 font-semibold text-emerald-400">▼{haggle.offer - haggle.currentPrice}</span>
                )}
              </p>
            )}
          </div>
          <div>
            <p className="text-stone-400">호감도</p>
            {haggle.disposition === undefined ? (
              <>
                <p className="text-lg font-bold text-stone-500">—</p>
                <div className="mx-auto mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-700" />
              </>
            ) : (
              <>
                <p className={`text-lg font-bold tabular-nums ${dispColor(haggle.disposition).text}`}>
                  {haggle.disposition}
                  <span className="ml-1 text-[10px] font-medium">{dispMood(haggle.disposition)}</span>
                </p>
                <div className="mx-auto mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${dispColor(haggle.disposition).bar}`}
                    style={{ width: `${haggle.disposition}%` }}
                  />
                </div>
              </>
            )}
          </div>
          <div>
            <p className="text-stone-400">남은 턴</p>
            <p className="text-lg font-bold tabular-nums text-stone-100">{haggle.turnsLeft}</p>
          </div>
        </div>

        {/* 대화 로그 */}
        <div ref={logRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {haggle.log.map((line, i) => (
            <div
              key={i}
              className={
                line.role === "player"
                  ? "ml-auto max-w-[80%] rounded-lg bg-amber-600/80 px-3 py-2 text-sm text-stone-950"
                  : line.role === "merchant"
                    ? "max-w-[80%] rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-100"
                    : "text-center text-xs italic text-stone-500"
              }
            >
              {line.category && (
                <span className="mr-1 rounded bg-stone-700 px-1 text-[10px] text-sky-300">
                  {CATEGORY_LABEL[line.category]}
                </span>
              )}
              {line.text}
              {line.role === "merchant" && line.priceDelta !== undefined && (
                <div className="mt-1.5 flex gap-2 border-t border-stone-700/60 pt-1.5 text-[10px]">
                  {line.dispositionDelta !== undefined && (
                    <span className={deltaColor(line.dispositionDelta, true)}>
                      호감도 {arrow(line.dispositionDelta, true)}
                    </span>
                  )}
                  <span className={deltaColor(line.priceDelta, false)}>
                    값 {arrow(line.priceDelta, false)}
                  </span>
                </div>
              )}
            </div>
          ))}
          {haggle.log.length <= 1 && ongoing && !haggle.pending && (
            <div className="mt-6 flex flex-col items-center gap-1 text-center">
              <GameIcon name="trade" className="h-7 w-7 text-stone-600" />
              <p className="text-xs text-stone-500">아부·논리·대량구매·딱한사정… 무슨 말이든 건네 흥정을 시작하라.</p>
              <p className="text-[11px] text-stone-600">약점을 파고들면 호감도가 오르고 값이 내려간다.</p>
            </div>
          )}
          {haggle.pending && <p className="text-xs text-stone-500">…상인이 생각 중…</p>}
          {haggle.status === "timeup" && (
            <p className="text-center text-xs text-rose-400">흥정 턴을 다 썼다. 지금 값으로 사거나 물러나라.</p>
          )}
          {haggle.status === "closed" && (
            <p className="text-center text-xs text-rose-400">상인이 등을 돌렸다. 거래 결렬.</p>
          )}
        </div>

        {/* 입력 — 한 컴포넌트처럼 통합 */}
        {ongoing && (
          <div className="border-t border-stone-800 px-4 py-3">
            <div className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800/60 p-1 transition focus-within:border-amber-600">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                disabled={haggle.pending}
                aria-label="흥정 발언 입력"
                placeholder="상인을 어떻게 설득할까…"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none"
              />
              <button
                onClick={submit}
                disabled={haggle.pending || !text.trim()}
                className="h-9 shrink-0 rounded-md bg-amber-600 px-4 text-sm font-semibold text-stone-950 transition enabled:hover:bg-amber-500 disabled:opacity-40"
              >
                제안
              </button>
            </div>
          </div>
        )}

        {/* 구매 — 수량 스테퍼 + 총액 + 우측 구매 (RPG 상점 느낌) */}
        <div className="flex items-center gap-3 border-t border-stone-800 px-4 py-3">
          {canBuy ? (
            <>
              <div className="flex items-center rounded-lg border border-stone-700 bg-stone-800/60">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center text-lg text-stone-300 transition hover:text-amber-300">−</button>
                <span className="w-9 text-center text-sm font-semibold tabular-nums text-stone-100">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="grid h-8 w-8 place-items-center text-lg text-stone-300 transition hover:text-amber-300">+</button>
              </div>
              <div className="text-xs text-stone-400">
                총액{" "}
                <span className="font-semibold tabular-nums text-amber-300">
                  {isBarter ? `${haggle.payMaterialName} ${haggle.currentPrice * qty}개` : `${haggle.currentPrice * qty}G`}
                </span>
                {isBarter && <span className="text-stone-500"> · 보유 {payHave}</span>}
              </div>
              <button
                onClick={() => onBuy(qty)}
                className="ml-auto h-10 rounded-lg bg-amber-600 px-5 text-sm font-semibold text-stone-950 shadow-md shadow-amber-950/40 transition hover:bg-amber-500 active:bg-amber-700"
              >
                {isBarter ? "교환하기" : "수락하고 구매"}
              </button>
            </>
          ) : isBarter && !priceReady ? (
            <span className="text-xs text-stone-500">흥정으로 교환비를 정한 뒤 교환할 수 있다.</span>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto h-10 rounded-lg border border-stone-600 px-5 text-sm font-semibold text-stone-200 transition hover:bg-stone-700"
            >
              물러나기
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
