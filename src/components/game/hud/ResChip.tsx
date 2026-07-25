// 하단 푸터의 리소스 배지 (골드·일차·수입). 라벨은 작게, 값은 굵게 강조색으로.
import { GameIcon, type GameIconName } from "@/components/GameIcon";

export function ResChip({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: GameIconName }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-stone-700/60 bg-stone-900/60 px-2.5 py-1 shadow-sm">
      {icon && <GameIcon name={icon} className={`h-4 w-4 ${accent ?? "text-stone-400"}`} />}
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${accent ?? "text-stone-100"}`}>{value}</span>
    </div>
  );
}
