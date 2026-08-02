"use client";
// 게임의 오버레이 모달 묶음 — 조건부로 뜨는 모든 모달/커버를 한곳에서 렌더한다.
import { HaggleDialog } from "@/components/game/modals/HaggleDialog";
import { ClueNotebook } from "@/components/game/modals/ClueNotebook";
import { BookCodex } from "@/components/game/modals/BookCodex";
import { InventoryPanel } from "@/components/game/modals/InventoryPanel";
import { IntroCutscene } from "@/components/IntroCutscene";
import { NewsModal } from "@/components/game/modals/NewsModal";
import { RelationsModal } from "@/components/game/modals/RelationsModal";
import { WorldMapModal } from "@/components/game/modals/WorldMapModal";
import { Tutorial } from "@/components/game/modals/Tutorial";
import { MissionListModal } from "@/components/game/modals/MissionListModal";
import { PriceChartModal } from "@/components/game/modals/PriceChartModal";
import { BuildingCodexModal } from "@/components/game/modals/BuildingCodexModal";
import { AllyArrivalModal } from "@/components/game/modals/AllyArrivalModal";
import { AllyEventModal } from "@/components/game/modals/AllyEventModal";
import { AlliesModal } from "@/components/game/modals/AlliesModal";
import { ResetConfirmModal } from "@/components/game/modals/ResetConfirmModal";
import { EndingModal } from "@/components/game/modals/EndingModal";
import { homeIcon, homeStage } from "@/lib/game-state";
import type { GameEngine } from "@/hooks/useGameEngine";

export function ModalStack({ engine }: { engine: GameEngine }) {
  const {
    state,
    bookLevel,
    busy,
    news,
    setNews,
    acknowledgeStep,
    showTutorial,
    setShowTutorial,
    showWorldMap,
    setShowWorldMap,
    showInventory,
    setShowInventory,
    showNotebook,
    setShowNotebook,
    showBook,
    setShowBook,
    showRelations,
    setShowRelations,
    showMissions,
    setShowMissions,
    missionList,
    restartMission,
    showPriceChart,
    setShowPriceChart,
    showBuildingCodex,
    setShowBuildingCodex,
    population,
    pendingAlly,
    acknowledgeAlly,
    showAllies,
    setShowAllies,
    allyEvent,
    clearAllyEvent,
    showIntro,
    setShowIntro,
    hydrated,
    showResetConfirm,
    setShowResetConfirm,
    resetGame,
    showEnding,
    dismissEnding,
    builtCount,
    allies,
    finishIntro,
    travelTo,
    sendUtterance,
    buy,
    closeHaggle,
  } = engine;
  return (
    <>
      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} onReplayStory={() => setShowIntro(true)} />
      )}

      {state.haggle && state.merchant && (
        <HaggleDialog
          merchant={state.merchant}
          haggle={state.haggle}
          gold={state.gold}
          inventory={state.inventory}
          onSend={sendUtterance}
          onBuy={buy}
          onClose={closeHaggle}
        />
      )}

      {showWorldMap && (
        <WorldMapModal
          location={state.location}
          homeIconId={homeIcon(state.placements)}
          homeName={homeStage(state.placements).name}
          busy={busy}
          onTravel={(dest) => {
            setShowWorldMap(false);
            travelTo(dest);
          }}
          onClose={() => setShowWorldMap(false)}
        />
      )}

      {showInventory && (
        <InventoryPanel inventory={state.inventory} onClose={() => setShowInventory(false)} />
      )}

      {showMissions && (
        <MissionListModal
          missions={missionList}
          onRestart={restartMission}
          onClose={() => setShowMissions(false)}
        />
      )}

      {showBuildingCodex && <BuildingCodexModal onClose={() => setShowBuildingCodex(false)} />}

      {showAllies && <AlliesModal population={population} onClose={() => setShowAllies(false)} />}

      {allyEvent && <AllyEventModal ally={allyEvent.ally} label={allyEvent.label} onClose={clearAllyEvent} />}

      {/* 지인 합류 연출 — 인구 임계를 넘긴 미확인 지인이 있으면(인트로 종료 후). 최상위. */}
      {pendingAlly && showIntro === false && (
        <AllyArrivalModal ally={pendingAlly} onWelcome={() => acknowledgeAlly(pendingAlly.id)} />
      )}

      {showPriceChart && (
        <PriceChartModal day={state.day} onClose={() => setShowPriceChart(false)} />
      )}

      {showNotebook && (
        <ClueNotebook clues={state.clues} onClose={() => setShowNotebook(false)} />
      )}

      {showBook && (
        <BookCodex
          bookLevel={bookLevel}
          xp={state.xp}
          onShowPrices={() => {
            setShowBook(false);
            setShowPriceChart(true);
          }}
          onShowBuildings={() => {
            setShowBook(false);
            setShowBuildingCodex(true);
          }}
          onClose={() => setShowBook(false)}
        />
      )}

      {showRelations && (
        <RelationsModal memory={state.merchantMemory} day={state.day} onClose={() => setShowRelations(false)} />
      )}

      {showResetConfirm && (
        <ResetConfirmModal onConfirm={resetGame} onCancel={() => setShowResetConfirm(false)} />
      )}

      {showEnding && (
        <EndingModal
          day={state.day}
          population={population}
          buildings={builtCount}
          gold={state.gold}
          patrons={Object.keys(state.merchantMemory).length}
          allies={allies.length}
          onContinue={dismissEnding}
          onNewGame={resetGame}
        />
      )}

      {/* 인트로 판정 전(showIntro===null) 또는 저장분 로드 전(!hydrated)엔 검은 커버로 게임 노출을 막는다. */}
      {(showIntro === null || !hydrated) && <div className="fixed inset-0 z-[60] bg-black" />}
      {showIntro === true && <IntroCutscene onFinish={finishIntro} />}

      {news && (
        <NewsModal
          news={news}
          onClose={() => {
            setNews(null);
            acknowledgeStep("news-seen"); // 뉴스 코치는 튜토리얼 중 첫 1회만
          }}
        />
      )}
    </>
  );
}
