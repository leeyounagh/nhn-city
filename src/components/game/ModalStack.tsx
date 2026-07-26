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
import { homeIcon } from "@/lib/game-state";
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
    showIntro,
    setShowIntro,
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

      {showNotebook && (
        <ClueNotebook clues={state.clues} onClose={() => setShowNotebook(false)} />
      )}

      {showBook && (
        <BookCodex bookLevel={bookLevel} xp={state.xp} onClose={() => setShowBook(false)} />
      )}

      {showRelations && (
        <RelationsModal memory={state.merchantMemory} day={state.day} onClose={() => setShowRelations(false)} />
      )}

      {showIntro === null && <div className="fixed inset-0 z-[60] bg-black" />}
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
