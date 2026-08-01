"use client";
// 시세 그래프 모달 (마법의 책 Lv.1). 자재별 하루평균 시장 시세를 과거 14일 스파크라인으로 보여준다.
// 데이터는 /api/prices(결정론)에서. 하한가·상인 약점은 노출 안 함(흥정 무결성 무관).
import { useEffect, useState } from "react";
import { Line, LineChart, Tooltip, YAxis } from "recharts";
import type { MaterialId } from "@/types/game";
import { MaterialIcon } from "@/shared/icon/MaterialIcon";
import { GameIcon } from "@/shared/icon/GameIcon";
import { useDialogA11y } from "@/shared/use-dialog-a11y";

type Point = { id: MaterialId; name: string; tier: number; series: number[] };

const TIER_LABEL: Record<number, string> = { 1: "1티어 (기본)", 2: "2티어 (가공)", 3: "3티어 (희귀)" };
const TIER_COLOR: Record<number, string> = { 1: "#a8a29e", 2: "#7dd3fc", 3: "#fcd34d" }; // stone·sky·amber

export function PriceChartModal({ day, onClose }: { day: number; onClose: () => void }) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [dayLabels, setDayLabels] = useState<number[]>([]);
  const dialogRef = useDialogA11y(onClose);

  useEffect(() => {
    let alive = true;
    fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, days: 14 }),
    })
      .then((r) => r.json())
      .then((d: { points?: Point[]; dayLabels?: number[] }) => {
        if (!alive) return;
        setPoints(d.points ?? []);
        setDayLabels(d.dayLabels ?? []);
      })
      .catch(() => alive && setPoints([]));
    return () => {
      alive = false;
    };
  }, [day]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-chart-title"
        tabIndex={-1}
        className="w-full max-w-lg rounded-lg border border-sky-800/50 bg-stone-900 p-4 shadow-xl focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 id="price-chart-title" className="font-display flex items-center gap-2 text-base font-bold text-sky-200">
            <GameIcon name="spellBook" className="h-5 w-5" /> 자재 시세 흐름
          </h3>
          <button onClick={onClose} aria-label="닫기" className="text-stone-400 hover:text-stone-200">
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-stone-500">
          마법의 책 Lv.1 — 최근 {dayLabels.length || 14}일 하루평균 시세. 대풍작 때 값이 폭락한다.
        </p>

        {points === null ? (
          <p className="py-10 text-center text-sm text-stone-500">시세를 읽는 중…</p>
        ) : (
          <div className="max-h-[80dvh] space-y-4 overflow-y-auto overflow-x-hidden pr-1">
            {[1, 2, 3].map((tier) => {
              const items = points.filter((p) => p.tier === tier);
              if (items.length === 0) return null;
              return (
                <section key={tier}>
                  <h4 className="mb-1.5 text-xs font-semibold text-stone-400">{TIER_LABEL[tier]}</h4>
                  <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {items.map((p) => {
                      const last = p.series[p.series.length - 1] ?? 0;
                      const first = p.series[0] ?? last;
                      const diff = last - first;
                      return (
                        <li
                          key={p.id}
                          className="flex items-center gap-2 rounded border border-stone-700/60 bg-stone-900/40 px-2 py-1.5"
                        >
                          <MaterialIcon id={p.id} className="h-4 w-4 shrink-0" />
                          <span className="w-14 shrink-0 truncate text-xs text-stone-200" title={p.name}>
                            {p.name}
                          </span>
                          <LineChart
                            width={120}
                            height={38}
                            data={p.series.map((v, i) => ({ d: dayLabels[i], v }))}
                            margin={{ top: 4, right: 2, bottom: 2, left: 2 }}
                          >
                            <YAxis hide domain={["dataMin", "dataMax"]} />
                            <Tooltip
                              cursor={false}
                              contentStyle={{
                                background: "#1c1917",
                                border: "1px solid #44403c",
                                borderRadius: 6,
                                fontSize: 11,
                                padding: "2px 6px",
                              }}
                              labelStyle={{ color: "#a8a29e" }}
                              itemStyle={{ color: "#fcd34d" }}
                              labelFormatter={(d) => `${d}일차`}
                              formatter={(v) => [`${v}골드`, "시세"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke={TIER_COLOR[tier]}
                              strokeWidth={1.5}
                              dot={false}
                              activeDot={false}
                              isAnimationActive={false}
                            />
                          </LineChart>
                          <span className="ml-auto flex shrink-0 flex-col items-end leading-tight">
                            <span className="text-xs font-semibold tabular-nums text-amber-300">{last}골드</span>
                            <span
                              className={`text-[10px] tabular-nums ${
                                diff < 0 ? "text-emerald-400" : diff > 0 ? "text-rose-400" : "text-stone-500"
                              }`}
                            >
                              {diff === 0 ? "―" : `${diff < 0 ? "▼" : "▲"}${Math.abs(diff)}`}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
