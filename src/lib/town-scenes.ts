// 마을별 아이소 미리보기 씬 (읽기전용 9×9). 업종 테마 바닥 + 건물·구조물 배치.
// 스프라이트 파일은 public/buildings/{sprite}.png. 좌표는 0~8. (자재처럼 보이는 소품은 배치하지 않음)
import type { TownId } from "@/types/game";

export type ScenePlacement = { sprite: string; x: number; y: number; flipped?: boolean };

export const SCENE_GRID = 9;

// 업종 테마 바닥 스프라이트.
export const TOWN_FLOOR: Record<TownId, string> = {
  nw: "floor_grass", // 삼목골 · 임업
  ne: "floor_grass", // 무쇠고개 · 광업 (참고 이미지 = 초록 농촌 마을)
  sw: "floor_grass", // 베틀마을 · 직물
  se: "floor_dirt", // 유리섬 · 유리세공
};

// 바닥 배경색 (타일 사이 seam이 dark 대신 지면색으로 보이게 = 공백 안 보임).
export const TOWN_BG: Record<TownId, string> = {
  nw: "#3c4a22",
  ne: "#3c4a22",
  sw: "#3c4a22",
  se: "#5a4a30",
};

// 마을별 배치 (x,y 0~8). 스타터 — 스크린샷 보며 조정.
export const TOWN_SCENES: Record<TownId, ScenePlacement[]> = {
  // 삼목골 — 임업: 울창한 숲 속 벌목 마을 (방앗간·가옥·창고·헛간 + 빽빽한 잎나무)
  nw: [
    // 마을 중심: 방앗간(제재소) + 목재 창고 + 우물
    { sprite: "mill", x: 4, y: 3 },
    { sprite: "warehouse", x: 6, y: 4 },
    { sprite: "well", x: 4, y: 5 },
    // 가옥·헛간·오두막
    { sprite: "hut", x: 2, y: 4 },
    { sprite: "hut", x: 3, y: 6, flipped: true },
    { sprite: "house", x: 5, y: 6 },
    { sprite: "house2", x: 2, y: 6 },
    { sprite: "barn", x: 6, y: 6 },
    // 벌목 캠프 천막
    { sprite: "tent", x: 1, y: 5 },
    { sprite: "tent2", x: 7, y: 5, flipped: true },
    // 가로등·울타리
    { sprite: "lamp", x: 4, y: 4 },
    { sprite: "lamp", x: 3, y: 5 },
    { sprite: "fence", x: 2, y: 7 },
    { sprite: "fence", x: 5, y: 7 },
    // 울창한 숲 (잎나무 다수) — 둘레와 뒤편을 빽빽하게
    { sprite: "tree3", x: 0, y: 1 },
    { sprite: "tree3", x: 1, y: 1 },
    { sprite: "tree3", x: 2, y: 1 },
    { sprite: "tree3", x: 3, y: 1 },
    { sprite: "tree3", x: 6, y: 1 },
    { sprite: "tree3", x: 7, y: 1 },
    { sprite: "tree3", x: 8, y: 1 },
    { sprite: "tree3", x: 0, y: 3 },
    { sprite: "tree3", x: 8, y: 3 },
    { sprite: "tree3", x: 0, y: 5 },
    { sprite: "tree3", x: 8, y: 4 },
    { sprite: "tree3", x: 0, y: 7 },
    { sprite: "tree3", x: 8, y: 7 },
    { sprite: "tree3", x: 0, y: 8 },
    { sprite: "tree3", x: 1, y: 8 },
    { sprite: "tree3", x: 3, y: 8 },
    { sprite: "tree3", x: 6, y: 8 },
    { sprite: "tree3", x: 7, y: 8 },
    { sprite: "tree3", x: 8, y: 8 },
  ],
  // 무쇠고개 — 시골 마을: 밭·목조가옥·석조교회+묘지·과수원·우물·가로등 (철 테마 = 대장간)
  ne: [
    // 윗쪽 밭 (평평하게 렌더) — 좌/우 두 블록
    { sprite: "field", x: 0, y: 0 },
    { sprite: "field", x: 1, y: 0 },
    { sprite: "field", x: 2, y: 0 },
    { sprite: "field", x: 0, y: 1 },
    { sprite: "field", x: 1, y: 1 },
    { sprite: "field", x: 2, y: 1 },
    { sprite: "field", x: 5, y: 0 },
    { sprite: "field", x: 6, y: 0 },
    { sprite: "field", x: 7, y: 0 },
    { sprite: "field", x: 8, y: 0 },
    { sprite: "field", x: 6, y: 1 },
    { sprite: "field", x: 7, y: 1 },
    { sprite: "field", x: 8, y: 1 },
    // 밭 경계 울타리 (평면 꼭짓점 (3,0)은 허공 삐져나옴 → 제거)
    { sprite: "fence", x: 3, y: 1 },
    { sprite: "fence", x: 0, y: 2 },
    { sprite: "fence", x: 2, y: 2 },
    // 석조 교회 + 묘지 (마을 랜드마크) — 묘지는 교회 우측 빈 코너에 작게
    { sprite: "church", x: 6, y: 3 },
    { sprite: "graveyard", x: 8, y: 2 },
    // 마을 중심: 우물 + 대장간(철 테마)
    { sprite: "well", x: 4, y: 4 },
    { sprite: "smithy", x: 1, y: 4 },
    // 가옥·헛간
    { sprite: "barn", x: 0, y: 5 },
    { sprite: "house", x: 2, y: 5 },
    { sprite: "house2", x: 3, y: 6 },
    { sprite: "house", x: 5, y: 6, flipped: true },
    { sprite: "house2", x: 6, y: 6 },
    { sprite: "house2", x: 1, y: 7 },
    { sprite: "house", x: 3, y: 7 },
    { sprite: "house2", x: 2, y: 8, flipped: true },
    // 과수원 (멀티타일 통짜, 우하단)
    { sprite: "orchard", x: 7, y: 7 },
    // 가로등 (길 따라)
    { sprite: "lamp", x: 4, y: 3 },
    { sprite: "lamp", x: 3, y: 5 },
    { sprite: "lamp", x: 4, y: 6 },
    // 잎나무 흩뿌리기
    { sprite: "tree3", x: 5, y: 3 },
    { sprite: "tree3", x: 0, y: 3 },
    { sprite: "tree3", x: 6, y: 5 },
    { sprite: "tree3", x: 0, y: 8 },
    { sprite: "tree3", x: 8, y: 8 },
    { sprite: "tree3", x: 4, y: 8 },
  ],
  // 베틀마을 — 직물: 줄무늬 시장가판·선술집·상점 중심의 붐비는 장터 마을
  sw: [
    // 중앙 장터: 큰 시장광장(멀티타일) + 줄무늬 가판(직물) + 우물
    { sprite: "marketplaza", x: 4, y: 4 },
    { sprite: "stall", x: 3, y: 5 },
    { sprite: "well", x: 5, y: 5 },
    // 사교 건물: 선술집·여관·상점건물
    { sprite: "tavern", x: 6, y: 2 },
    { sprite: "inn", x: 2, y: 2 },
    { sprite: "marketbuilding", x: 6, y: 6 },
    // 창고 헛간 · 마을 감시탑
    { sprite: "storeshed", x: 0, y: 6 },
    { sprite: "guardtower2", x: 8, y: 3 },
    // 가옥 군집
    { sprite: "house", x: 1, y: 4 },
    { sprite: "house2", x: 2, y: 5 },
    { sprite: "hut", x: 1, y: 6 },
    { sprite: "house", x: 2, y: 7 },
    { sprite: "house", x: 3, y: 7, flipped: true },
    { sprite: "house2", x: 6, y: 4, flipped: true },
    { sprite: "hut", x: 7, y: 5, flipped: true },
    // 직물 장터 천막
    { sprite: "tent", x: 7, y: 3 },
    { sprite: "tent2", x: 1, y: 3 },
    // 가로등 (장터 둘레)
    { sprite: "lamp", x: 4, y: 2 },
    { sprite: "lamp", x: 3, y: 3 },
    { sprite: "lamp", x: 5, y: 3 },
    { sprite: "lamp", x: 4, y: 6 },
    // 나무·울타리
    { sprite: "tree3", x: 0, y: 2 },
    { sprite: "tree3", x: 8, y: 4 },
    { sprite: "tree3", x: 0, y: 7 },
    { sprite: "tree3", x: 8, y: 7 },
    { sprite: "tree3", x: 5, y: 7 },
    { sprite: "tree3", x: 0, y: 5 },
    { sprite: "fence", x: 0, y: 4 },
    { sprite: "fence", x: 8, y: 5 },
  ],
  // 유리섬 — 성벽으로 둘러싼 요새 도시 (중앙 성채 + 모서리 망루 + 텐트 캠프)
  se: [
    // 모서리 망루 (5×5 성벽 컴파운드)
    { sprite: "watchtower", x: 2, y: 2 },
    { sprite: "watchtower", x: 6, y: 2 },
    { sprite: "watchtower", x: 2, y: 6 },
    { sprite: "watchtower", x: 6, y: 6 },
    // 성벽 (컴파운드 둘레)
    { sprite: "wallpiece", x: 3, y: 2 },
    { sprite: "wallpiece", x: 4, y: 2 },
    { sprite: "wallpiece", x: 5, y: 2 },
    { sprite: "wallpiece", x: 2, y: 3 },
    { sprite: "wallpiece", x: 2, y: 4 },
    { sprite: "wallpiece", x: 2, y: 5 },
    { sprite: "wallpiece", x: 6, y: 3 },
    { sprite: "wallpiece", x: 6, y: 4 },
    { sprite: "wallpiece", x: 6, y: 5 },
    { sprite: "wallpiece", x: 3, y: 6 },
    { sprite: "wallpiece", x: 5, y: 6 },
    // 정문
    { sprite: "gate", x: 4, y: 6 },
    // 컴파운드 안: 중앙 성채 + 예배당·시장 + 광장 조각상
    { sprite: "castle", x: 4, y: 4 },
    { sprite: "chapel", x: 3, y: 3 },
    { sprite: "market", x: 5, y: 4 },
    { sprite: "statue", x: 4, y: 5 },
    // 성 밖 캠프: 텐트·오두막·우물·나무
    { sprite: "tent", x: 1, y: 7 },
    { sprite: "tent2", x: 2, y: 8 },
    { sprite: "tent", x: 6, y: 8 },
    { sprite: "tent2", x: 7, y: 7 },
    { sprite: "hut", x: 1, y: 1 },
    { sprite: "well", x: 7, y: 1 },
    { sprite: "fence", x: 0, y: 4 },
    // 고지대 광장(플랫폼) + 캠프/숲 채움 (작아진 텐트·나무 다수)
    { sprite: "platform", x: 2, y: 7 },
    { sprite: "tent", x: 8, y: 6 },
    { sprite: "tent2", x: 7, y: 2 },
    { sprite: "tent", x: 8, y: 8 },
    { sprite: "tree2", x: 8, y: 5 },
    { sprite: "tree", x: 0, y: 2 },
    { sprite: "tree2", x: 0, y: 6 },
    { sprite: "tree", x: 3, y: 7 },
    { sprite: "tree2", x: 5, y: 7 },
    { sprite: "tree", x: 8, y: 3 },
    { sprite: "tree2", x: 3, y: 1 },
    { sprite: "tree", x: 5, y: 1 },
    { sprite: "tree2", x: 0, y: 0 },
  ],
};
