"use client";
// 게임 오케스트레이터 — 엔진 훅과 화면 조각(메인 영역·모달 묶음·푸터)을 조립한다.
import type { TownId } from "@/types/game";
import { TOWN_BY_ID, locationName } from "@/lib/game-data";
import { TownView } from "@/components/TownView";
import { IsoCityMap } from "@/components/IsoCityMap";
import { ModalStack } from "@/components/game/ModalStack";
import { GameFooter } from "@/components/game/hud/GameFooter";
import { CoachMark } from "@/shared/CoachMark";
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
    depositMax,
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
            onDepositMax={depositMax}
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

      {/* 온보딩 코치마크 — 인트로 종료 후. 대상이 월드맵 섬 노드면 지도 위에 표시하고, 그 외 모달이
          열리면 숨겨 z 충돌을 피한다(코치는 버튼만 강조 → 클릭해 모달 열리면 물러남). */}
      {(() => {
        if (engine.showIntro !== false) return null;
        const m = engine.mission;
        // 모든 미션 완료: 하단 미션 버튼으로 마지막 안내(완료 축하). 버튼 클릭(openMissions) 시 확인 처리되어 종료.
        if (!m) {
          if (engine.missionDismissed || engine.acked.has("onboarding-done") || engine.showMissions)
            return null;
          return (
            <CoachMark
              targetSelector='[data-coach="mission-list-btn"]'
              missionTitle="온보딩 완료"
              title="🎉 첫 미션 「오두막」 완공!"
              hint="여기 미션 버튼에서 진행 중·완료한 미션 목록을 확인할 수 있다."
              onSkip={engine.dismissMission}
            />
          );
        }
        // 아침 시황이 떠 있으면 뉴스 코치 우선(확인 후 닫기 → 이어서 다음 목표로).
        // 단 뉴스 코치는 튜토리얼 중 첫 1회만 안내한다(이후엔 모달만 뜨고 코치 없음).
        if (engine.news) {
          if (engine.acked.has("news-seen")) return null;
          return (
            <CoachMark
              targetSelector='[data-coach="mission-news"]'
              missionTitle={m.mission.title}
              title="아침 시황을 확인하라"
              hint="오늘의 시세와 생산을 보고 ✕로 닫아라."
              onSkip={engine.dismissMission}
            />
          );
        }
        // 뉴스 fetch 진행 중이면 코치를 잠시 숨긴다(다른 코치가 떴다 뉴스로 바뀌는 깜빡임 방지).
        if (engine.newsPending) return null;
        const coachKey = m.objective.coach;
        const wantsWorldMap = !!coachKey?.startsWith("mission-town-");
        const anyModalOpen =
          engine.showTutorial ||
          engine.showNotebook ||
          engine.showBook ||
          engine.showInventory ||
          (engine.showWorldMap && !wantsWorldMap) ||
          engine.showRelations ||
          engine.showMissions ||
          !!state.haggle; // 흥정창 열림 신호(구매 후엔 merchant가 남아도 haggle=null → 코치 재개)
        if (anyModalOpen) return null;
        return (
          <CoachMark
            targetSelector={coachKey ? `[data-coach="${coachKey}"]` : undefined}
            missionTitle={m.mission.title}
            title={m.objective.label}
            hint={m.objective.hint}
            onSkip={engine.dismissMission}
            onNext={m.objective.info ? () => engine.acknowledgeStep(m.objective.id) : undefined}
          />
        );
      })()}
    </div>
  );
}
