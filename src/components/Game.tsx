"use client";
// 게임 오케스트레이터 — 엔진 훅과 화면 조각(메인 영역·모달 묶음·푸터)을 조립한다.
import type { TownId } from "@/types/game";
import { TOWN_BY_ID, locationName } from "@/lib/game-data";
import { TownView } from "@/components/TownView";
import { IsoCityMap } from "@/components/IsoCityMap";
import { ModalStack } from "@/components/game/ModalStack";
import { GameFooter } from "@/components/game/hud/GameFooter";
import { useGameEngine } from "@/hooks/useGameEngine";

export function Game() {
  const engine = useGameEngine();
  const {
    state,
    notice,
    bookLevel,
    busy,
    startHaggle,
    startBarter,
    sell,
    placeBuilding,
    deposit,
    reclaim,
    moveBuilding,
    rotateBuilding,
  } = engine;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-stone-950 to-stone-900 text-stone-200">
      {state.location === "home" ? (
        // 고향맵: 한 화면 고정. 맵이 남는 공간(flex-1)을 전부 차지하고 세로 스크롤 없음.
        <main className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2">
          <p className="mb-1.5 shrink-0 truncate px-1 text-xs italic text-stone-400">{notice}</p>
          <IsoCityMap
            state={state}
            onPlace={placeBuilding}
            onDeposit={deposit}
            onReclaim={reclaim}
            onMove={moveBuilding}
            onRotate={rotateBuilding}
          />
        </main>
      ) : (
        // 마을뷰: 한 화면 고정. 미리보기는 위에 고정, 상인/소문/판매만 내부 스크롤.
        <main className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2">
          <p className="mb-1.5 shrink-0 truncate px-1 text-xs italic text-stone-400">{notice}</p>
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
            <TownView
              townId={state.location as TownId}
              townName={locationName(state.location)}
              industryName={TOWN_BY_ID[state.location as TownId].industryName}
              merchants={state.townMerchants}
              rumors={state.clues}
              bookLevel={bookLevel}
              busy={busy}
              inventory={state.inventory}
              sellPrices={state.sellPrices}
              onHaggle={startHaggle}
              onBarter={startBarter}
              onSell={sell}
              merchantMemory={state.merchantMemory}
              day={state.day}
            />
          </div>
        </main>
      )}

      <ModalStack engine={engine} />
      <GameFooter engine={engine} />
    </div>
  );
}
