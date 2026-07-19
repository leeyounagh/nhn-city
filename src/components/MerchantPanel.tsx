"use client";
// 상인 패널. 페르소나 + 책 레벨로 걸러진 정보 + 자재 목록을 보여준다.
import { useState } from "react";
import type { BookLevel, MaterialId, PublicMerchant } from "@/types/game";

export const PORTRAIT_EMOJI: Record<string, string> = {
  woodmonger: "🪵",
  mason: "🗿",
  junker: "🛠️",
  glazier: "🔮",
  draper: "🧵",
  general: "🎒",
};

export function MerchantPanel({
  merchant,
  bookLevel,
  busy,
  onHaggle,
  onBarter,
}: {
  merchant: PublicMerchant | null;
  bookLevel: BookLevel;
  busy: boolean;
  onHaggle: (id: MaterialId) => void;
  onBarter?: (rareId: MaterialId, payId: MaterialId) => void;
}) {
  const [barterFor, setBarterFor] = useState<MaterialId | null>(null);
  if (!merchant) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 rounded-lg border border-stone-700/60 bg-stone-900/50 p-8 text-center">
        <p className="text-4xl">🌫️</p>
        <p className="text-sm text-stone-400">
          {busy ? "폐허 사이로 발소리가 다가온다…" : "떠돌이 상인이 곧 나타난다. 「다음 날」로 새 상인을 맞이하라."}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-stone-700/60 bg-stone-900/50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-4xl">{PORTRAIT_EMOJI[merchant.portrait] ?? "🧑"}</span>
        <div className="min-w-0">
          <p className="font-bold text-stone-100">
            {merchant.name} <span className="text-xs font-normal text-stone-400">· {merchant.title}</span>
          </p>
          <p className="mt-0.5 text-xs text-stone-400">{merchant.appearance}</p>
        </div>
      </div>

      <p className="rounded bg-stone-800/60 px-3 py-2 text-sm italic text-stone-300">
        “{merchant.greeting}”
      </p>

      {/* 마법의 책이 읽어낸 정보 (레벨별) */}
      <div className="rounded border border-sky-800/40 bg-sky-950/20 px-3 py-2 text-xs">
        <p className="mb-1 font-semibold text-sky-300">📖 마법의 책 (Lv.{bookLevel})</p>
        {merchant.profileHint ? (
          <p className="text-stone-300">{merchant.profileHint}</p>
        ) : (
          <p className="text-stone-400">
            책이 아직 흐릿하다. 흥정하며 상인의 <b className="text-rose-300">호감도 반응</b>으로 취향을 직접 읽어라. 경험치를 모으면 Lv2에 성향이, Lv3에 약점·하한가가 드러난다.
          </p>
        )}
        {merchant.weaknessHint && <p className="mt-1 text-amber-300">약점: {merchant.weaknessHint}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {merchant.materials.map((mat) => (
          <button
            key={mat.id}
            onClick={() => onHaggle(mat.id)}
            disabled={mat.locked}
            className="flex items-center justify-between rounded border border-stone-700 bg-stone-800/40 px-3 py-2 text-left transition enabled:hover:border-amber-600/60 enabled:hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-sm text-stone-100">
              {mat.name}
              <span className="ml-1 text-[10px] text-stone-500">T{mat.tier}</span>
              {mat.locked && <span className="ml-1 text-[10px] text-rose-400">책 Lv.3 필요</span>}
            </span>
            <span className="text-right text-xs">
              <span className="font-semibold text-amber-300">{mat.offer}골드</span>
              {mat.floorHint !== undefined && (
                <span className="ml-1 text-stone-500">(하한 ~{mat.floorHint})</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* 물물교환: 상인이 파는 희귀템(T3)을 상인이 원하는 물품으로 맞바꾼다. */}
      {onBarter && merchant.wants.length > 0 &&
        merchant.materials.some((m) => m.tier === 3 && !m.locked) && (
          <div className="rounded border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
            <p className="mb-1.5 text-xs font-semibold text-emerald-300">
              🔄 물물교환 — 원하는 물품: {merchant.wants.map((w) => w.name).join(", ")}
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
    </section>
  );
}
