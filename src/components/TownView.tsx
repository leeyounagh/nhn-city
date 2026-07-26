"use client";
// 마을 진입 화면. 오늘 이 마을의 상인 목록과 여기서 들은 소문을 보여준다. 상인을 고르면 흥정 패널이 열린다.
import { useState } from "react";
import type { BookLevel, ClueKind, MaterialId, PublicMerchant, Rumor, TownId } from "@/types/game";
import { MerchantPanel, PORTRAIT_EMOJI } from "@/components/game/modals/MerchantPanel";
import { decayedDisposition, type MerchantMemory } from "@/lib/game-state";
import { TownIsoPreview } from "@/components/TownIsoPreview";
import { MATERIAL_NAME, TOWN_ICON } from "@/lib/game-data";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { GameIcon } from "@/shared/icon/GameIcon";

// 마을 대표 썸네일 (이름 앞 작은 아이콘).
function TownThumb({ townId }: { townId: TownId }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border border-stone-600/50 bg-stone-950/50 align-middle">
      <img
        src={`/buildings/${TOWN_ICON[townId]}.png`}
        alt=""
        draggable={false}
        className="h-6 w-6 object-contain"
      />
    </span>
  );
}

// 상인 목록 아바타. 흥정창과 동일하게 실제 초상화를 쓰되, 없으면 이모지 폴백.
function MerchantAvatar({ merchant }: { merchant: PublicMerchant }) {
  const [ok, setOk] = useState(true);
  if (ok) {
    return (
      <img
        src={`/merchants/${merchant.portraitFile ?? merchant.portrait}.png`}
        alt=""
        draggable={false}
        onError={() => setOk(false)}
        className="h-12 w-12 shrink-0 rounded-lg border border-stone-600 object-cover"
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-stone-600 bg-stone-800 text-2xl">
      {PORTRAIT_EMOJI[merchant.portrait] ?? "🧑"}
    </span>
  );
}

const KIND_LABEL: Record<ClueKind, string> = {
  location: "위치",
  wants: "원함",
  moving: "이동",
};

const KIND_STYLE: Record<ClueKind, string> = {
  location: "border-sky-700/60 text-sky-300",
  wants: "border-emerald-700/60 text-emerald-300",
  moving: "border-violet-700/60 text-violet-300",
};

export function TownView({
  townId,
  townName,
  industryName,
  merchants,
  rumors,
  bookLevel,
  busy,
  inventory,
  sellPrices,
  onHaggle,
  onBarter,
  onSell,
  merchantMemory,
  day,
}: {
  townId: TownId;
  townName: string;
  industryName: string;
  merchants: PublicMerchant[];
  rumors: Rumor[];
  bookLevel: BookLevel;
  busy: boolean;
  inventory: Record<string, number>;
  sellPrices: Partial<Record<MaterialId, number>>;
  onHaggle: (merchant: PublicMerchant, materialId: MaterialId) => void;
  onBarter: (merchant: PublicMerchant, rareId: MaterialId, payId: MaterialId) => void;
  onSell: (materialId: MaterialId, qty: number) => void;
  merchantMemory: Record<number, MerchantMemory>;
  day: number;
}) {
  const [selected, setSelected] = useState<PublicMerchant | null>(null);
  // 팔 수 있는 자재만 (신표 등 판매가 없는 특수 아이템 제외).
  const sellRows = (Object.entries(inventory) as [MaterialId, number][]).filter(
    ([id, n]) => n > 0 && (sellPrices[id] ?? 0) > 0,
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* 마을 아이소 미리보기 배너 (읽기전용, 팬/줌) */}
      <div className="shrink-0">
        <div className="mb-1.5 flex items-center gap-2">
          <h2 className="font-display flex items-center gap-1.5 text-base font-bold text-stone-100">
            <TownThumb townId={townId} /> {townName}
          </h2>
          <span className="text-xs text-stone-400">{industryName} · 드래그로 둘러보기</span>
        </div>
        <TownIsoPreview townId={townId} />
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto md:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-stone-700/60 bg-stone-900/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-stone-100">
            <TownThumb townId={townId} /> {townName} 상인
          </h2>
          <span className="text-xs text-stone-400">{industryName}</span>
        </div>

        {busy ? (
          <p className="py-8 text-center text-sm text-stone-500">마을에 들어서는 중…</p>
        ) : merchants.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 py-8 text-center text-sm text-stone-500">오늘 이 마을엔 상인이 없다.</div>
        ) : (
          <ul data-coach="mission-merchant" className="flex flex-col gap-2">
            {merchants.map((m) => (
              <li key={m.seed}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="group flex w-full items-center gap-3 rounded-lg border border-stone-700 bg-stone-800/40 px-3 py-2.5 text-left transition hover:border-amber-600/60 hover:bg-stone-800"
                >
                  <MerchantAvatar merchant={m} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-100">{m.name}</span>
                    <span className="block truncate text-xs text-stone-400">{m.title}</span>
                  </span>
                  <span className="shrink-0 rounded-md border border-amber-600/40 bg-amber-950/30 px-2.5 py-1 text-xs font-medium text-amber-300 transition group-hover:bg-amber-900/40">
                    흥정 ▸
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-4">
      <section data-coach="mission-rumor" className="rounded-lg border border-stone-700/60 bg-stone-900/40 p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-300"><GameIcon name="scroll" className="h-4 w-4 text-amber-400/80" /> 이 마을에 도는 소문</h3>
        {busy ? (
          <p className="py-4 text-center text-xs text-stone-500">귀를 기울이는 중…</p>
        ) : rumors.length === 0 ? (
          <p className="py-4 text-center text-xs text-stone-500">들리는 소문이 없다.</p>
        ) : (
          <ul className="space-y-2">
            {rumors.map((r) => (
              <li key={r.id} className="rounded border border-stone-700/70 bg-stone-800/40 px-3 py-2">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded border px-1.5 py-0.5 text-[11px] ${KIND_STYLE[r.kind]}`}>
                    {KIND_LABEL[r.kind]}
                  </span>
                  <span className="text-xs text-stone-400">{r.archetypeTitle}</span>
                  {r.materialName && <span className="text-xs text-emerald-400">· {r.materialName}</span>}
                  {r.stale && (
                    <span className="rounded border border-amber-700/60 px-1.5 py-0.5 text-[11px] text-amber-400/90">
                      오래된 소식
                    </span>
                  )}
                  {r.suspect && (
                    <span className="rounded border border-rose-700/60 px-1.5 py-0.5 text-[11px] text-rose-300">
                      의심스러움
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-stone-500">{r.source}</span>
                </div>
                <p className="text-sm text-stone-200">{r.text}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-stone-500">소문은 <img src="/ui/magicbook.png" alt="" draggable={false} className="inline-block h-3.5 w-3.5 align-text-bottom object-contain" /> 단서 노트에도 자동 기록된다.</p>
      </section>

      <section className="rounded-lg border border-stone-700/60 bg-stone-900/40 p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-300"><GameIcon name="coins" className="h-4 w-4 text-amber-400" /> 잉여 자재 팔기</h3>
        {sellRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-700 py-4 text-center text-xs text-stone-500">아직 팔 자재가 없다.</div>
        ) : (
          <ul className="space-y-1.5">
            {sellRows.map(([id, have]) => {
              const price = sellPrices[id] ?? 0;
              return (
                <li key={id} className="flex items-center gap-2 rounded bg-stone-800/40 px-2 py-1.5 text-xs">
                  <span className="flex items-center gap-1 text-stone-200"><MaterialIcon id={id} className="h-4 w-4" /> {MATERIAL_NAME[id]}</span>
                  <span className="text-stone-500">보유 {have}</span>
                  <span className="ml-auto text-amber-300">개당 {price}</span>
                  <button
                    onClick={() => onSell(id, 1)}
                    disabled={price <= 0}
                    className="rounded bg-amber-700 px-1.5 py-0.5 text-[11px] font-semibold text-stone-950 transition enabled:hover:bg-amber-600 disabled:opacity-40"
                  >
                    1개
                  </button>
                  <button
                    onClick={() => onSell(id, have)}
                    disabled={price <= 0}
                    className="rounded border border-stone-600 px-1.5 py-0.5 text-[11px] text-stone-300 transition enabled:hover:bg-stone-700 disabled:opacity-40"
                  >
                    전부
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-stone-500">시세는 마을마다 다르다 — 싼 데서 사서 비싼 데서 팔면 차익.</p>
      </section>
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <MerchantPanel
            merchant={selected}
            bookLevel={bookLevel}
            busy={busy}
            disposition={
              merchantMemory[selected.seed]
                ? decayedDisposition(merchantMemory[selected.seed], day)
                : undefined
            }
            tokenTaken={merchantMemory[selected.seed]?.tokenTaken}
            onClose={() => setSelected(null)}
            onHaggle={(id) => {
              const m = selected;
              setSelected(null);
              onHaggle(m, id);
            }}
            onBarter={(rareId, payId) => {
              const m = selected;
              setSelected(null);
              onBarter(m, rareId, payId);
            }}
          />
        </Modal>
      )}
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
