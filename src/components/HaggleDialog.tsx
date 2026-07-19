"use client";
// 멀티턴 흥정 대화창. 발언→서버 판정→호감도·가격 갱신. 수락 시 수량만큼 구매.
import { useEffect, useRef, useState } from "react";
import type { HaggleCategory, PublicMerchant } from "@/types/game";
import type { HaggleState } from "@/lib/game-state";

const CATEGORY_LABEL: Record<HaggleCategory, string> = {
  flattery: "아부",
  logic: "논리",
  bulk: "대량구매",
  sob: "딱한사정",
  threat: "협박",
  smalltalk: "잡담",
  quality: "자재흠집",
};

const PORTRAIT_EMOJI: Record<string, string> = {
  woodmonger: "🪵",
  mason: "🗿",
  junker: "🛠️",
  glazier: "🔮",
  draper: "🧵",
  general: "🎒",
};

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
      <div className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg border border-stone-700 bg-stone-900 sm:h-[80vh] sm:max-w-3xl sm:flex-row sm:rounded-lg">
        {/* 왼쪽 대형 초상화 (데스크톱 전용) */}
        <aside className="hidden shrink-0 flex-col items-center gap-3 border-r border-stone-700 bg-stone-950/40 p-4 sm:flex sm:w-56">
          <Portrait
            portrait={merchant.portrait}
            file={merchant.portraitFile}
            className="aspect-square w-full rounded-lg border border-stone-700 object-cover shadow-lg"
            emojiClassName="flex aspect-square w-full items-center justify-center rounded-lg border border-stone-700 bg-stone-800 text-7xl"
          />
          <div className="text-center">
            <p className="font-semibold text-stone-100">{merchant.name}</p>
            <p className="text-xs text-stone-400">{merchant.title}</p>
            <p className="mt-1 text-xs text-amber-300/80">
              {isBarter ? `${haggle.materialName} 물물교환` : `${haggle.materialName} 흥정`}
            </p>
          </div>
          {/* 랜덤 부여된 성격 힌트 (페르소나 톤) */}
          <div className="w-full">
            <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">성격</p>
            <p className="rounded bg-stone-800/60 px-2.5 py-2 text-center text-xs italic leading-relaxed text-stone-300">
              “{merchant.personalityTone}”
            </p>
          </div>
        </aside>

        {/* 오른쪽 대화 열 */}
        <div className="flex min-w-0 flex-1 flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-stone-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <Portrait portrait={merchant.portrait} file={merchant.portraitFile} />
            <div>
              <p className="font-semibold text-stone-100">
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
            <p className="text-base font-bold text-amber-300">
              {isBarter
                ? priceReady
                  ? `${haggle.payMaterialName} ${haggle.currentPrice}개`
                  : "흥정 전"
                : `${haggle.currentPrice}골드`}
            </p>
          </div>
          <div>
            <p className="text-stone-400">호감도</p>
            <div className="mx-auto mt-1 h-2 w-full overflow-hidden rounded bg-stone-700">
              <div
                className="h-full bg-rose-400 transition-all"
                style={{ width: `${haggle.disposition ?? 0}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-stone-400">남은 턴</p>
            <p className="text-base font-bold text-stone-100">{haggle.turnsLeft}</p>
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
          {haggle.pending && <p className="text-xs text-stone-500">…상인이 생각 중…</p>}
          {haggle.status === "timeup" && (
            <p className="text-center text-xs text-rose-400">흥정 턴을 다 썼다. 지금 값으로 사거나 물러나라.</p>
          )}
          {haggle.status === "closed" && (
            <p className="text-center text-xs text-rose-400">상인이 등을 돌렸다. 거래 결렬.</p>
          )}
        </div>

        {/* 입력 */}
        {ongoing && (
          <div className="flex gap-2 border-t border-stone-800 px-4 py-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={haggle.pending}
              placeholder="상인을 어떻게 구워삶을까…"
              className="flex-1 rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-600 focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={haggle.pending || !text.trim()}
              className="rounded bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition enabled:hover:bg-stone-600 disabled:opacity-40"
            >
              제안
            </button>
          </div>
        )}

        {/* 구매 */}
        <div className="flex items-center gap-2 border-t border-stone-800 px-4 py-3">
          {canBuy ? (
            <>
              <label className="text-xs text-stone-400">수량</label>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))}
                className="w-16 rounded border border-stone-700 bg-stone-800 px-2 py-1.5 text-sm text-stone-100"
              />
              <span className="text-xs text-stone-500">
                {isBarter
                  ? `총 ${haggle.payMaterialName} ${haggle.currentPrice * qty}개 (보유 ${payHave})`
                  : `총 ${haggle.currentPrice * qty}골드`}
              </span>
              <button
                onClick={() => onBuy(qty)}
                className="ml-auto rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-500"
              >
                {isBarter ? "교환하기" : "수락하고 구매"}
              </button>
            </>
          ) : isBarter && !priceReady ? (
            <span className="text-xs text-stone-500">흥정으로 교환비를 정한 뒤 교환할 수 있다.</span>
          ) : (
            <button
              onClick={onClose}
              className="ml-auto rounded bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-600"
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
