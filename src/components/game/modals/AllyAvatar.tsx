"use client";
// 지인 초상화. /allies/{id}.png 로드, 없으면 people 아이콘 폴백.
import { useState } from "react";
import { GameIcon } from "@/shared/icon/GameIcon";

export function AllyAvatar({ id, iconClass }: { id: string; iconClass: string }) {
  const [err, setErr] = useState(false);
  if (err) return <GameIcon name="people" className={iconClass} />;
  return (
    <img
      src={`/allies/${id}.png`}
      alt=""
      draggable={false}
      onError={() => setErr(true)}
      className="h-full w-full object-cover"
    />
  );
}
