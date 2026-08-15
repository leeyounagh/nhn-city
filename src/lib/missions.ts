// 미션(온보딩) 데이터와 진행 판정. 진행 상태를 저장하지 않고 GameState에서 "지금 할 일"을 직접 계산한다.
// 선형 스텝이 아니라 상태 기계(resolve) — 왕복(마을↔고향)·부분 구매·다회차에도 되돌아가지 않는다.
// 확장: MISSIONS 배열에 resolve를 가진 항목을 추가하면 새 미션이 붙는다.
import type { GameState } from "./game-state";
import { BUILDINGS, TOWNS } from "./game-data";
import type { MaterialId, TownId } from "@/types/game";

// coach 대상을 정할 때 참고하는 실행 컨텍스트(어떤 모달이 열렸는지 등).
export interface CoachCtx {
  worldMapOpen: boolean;
}

export interface MissionObjective {
  id: string;
  label: string; // 지시 한 줄
  hint?: string; // 부가 설명
  info?: boolean; // 정보 단계: 상태가 아니라 [다음]으로 진행
  coach?: string; // 강조 대상의 data-coach 키 (없으면 중앙 말풍선)
}

export interface Mission {
  id: string;
  title: string;
  // 현재 목표를 상태에서 직접 계산. null이면 이 미션은 완료.
  resolve: (s: GameState, acked: ReadonlySet<string>, ctx: CoachCtx) => MissionObjective | null;
}

// 자재의 "특산 섬"(클라 특산 역인덱스). 나무→삼목골(nw), 돌→무쇠고개(ne).
export function townForMaterial(id: MaterialId): TownId | undefined {
  return TOWNS.find((t) => t.specialMaterials.includes(id))?.id;
}

// 오두막 요구 자재는 game-data(BUILDINGS)를 단일 출처로 삼는다 — 여기서 재하드코딩하면 온보딩만 어긋난다.
const HUT_REQ = BUILDINGS.find((b) => b.id === "hut")?.requires ?? {};
const HUT_WOOD = HUT_REQ.wood ?? 0;
const HUT_STONE = HUT_REQ.stone ?? 0;

// "첫 집 짓기" — 오두막 완공까지 상태 기계로 안내한다(요구 자재는 BUILDINGS 기준).
function resolveFirstHut(
  s: GameState,
  acked: ReadonlySet<string>,
  ctx: CoachCtx,
): MissionObjective | null {
  // 아무 오두막이나 완공되면 미션 종료. (find(첫 채)만 보면 화면 밖 유령 배치가 첫 채로 남아 진짜 오두막을 지어도 안 끝난다.)
  if (s.placements.some((p) => p.buildingId === "hut" && p.built)) return null;
  const hut = s.placements.find((p) => p.buildingId === "hut" && !p.built); // 진행 대상 = 미완공 오두막

  const prog = hut?.progress ?? {};
  const remaining = {
    wood: HUT_WOOD - (prog.wood ?? 0),
    stone: HUT_STONE - (prog.stone ?? 0),
  };
  const held = { wood: s.inventory.wood ?? 0, stone: s.inventory.stone ?? 0 };
  const toFill = {
    wood: Math.min(held.wood, remaining.wood),
    stone: Math.min(held.stone, remaining.stone),
  };
  const shortfall = {
    wood: Math.max(0, remaining.wood - held.wood),
    stone: Math.max(0, remaining.stone - held.stone),
  };
  const anyFill = toFill.wood > 0 || toFill.stone > 0;
  const anyShort = shortfall.wood > 0 || shortfall.stone > 0;
  const anyHeld = held.wood > 0 || held.stone > 0;

  const shortNames = [shortfall.wood > 0 ? "나무" : null, shortfall.stone > 0 ? "돌" : null]
    .filter(Boolean)
    .join("·");
  // 아직 사야 하는 개수(부족분)를 붙인 안내용 라벨. 예: "나무 5개·돌 3개".
  const shortQty = [
    shortfall.wood > 0 ? `나무 ${shortfall.wood}개` : null,
    shortfall.stone > 0 ? `돌 ${shortfall.stone}개` : null,
  ]
    .filter(Boolean)
    .join("·");
  const buyTownId =
    shortfall.wood > 0
      ? townForMaterial("wood")
      : shortfall.stone > 0
        ? townForMaterial("stone")
        : undefined;
  const buyTown = buyTownId ? `mission-town-${buyTownId}` : undefined;
  // 이 마을 상인 중 그 자재를 파는 이가 있나 (도착 후 townMerchants로 확인).
  const sellsHere = (mat: MaterialId) =>
    s.townMerchants.some((pm) => pm.materials.some((v) => v.id === mat && !v.locked));

  if (s.location === "home") {
    // 채울 자재가 있으면 먼저 오두막에 넣게 한다(드래그 안내).
    if (hut && anyFill)
      return {
        id: "fill",
        label: "창고 자재를 오두막에 채워라",
        hint: "창고의 자재 칩을 오두막으로 끌어다 놓거나, 오두막을 눌러 「투입」한다.",
        coach: "mission-hut",
      };
    // 오두막이 없고 산 자재가 있으면 먼저 배치.
    if (!hut && anyHeld)
      return {
        id: "place",
        label: "오두막을 빈 터에 놓아라",
        hint: "팔레트에서 오두막을 끌거나 골라 빈 터를 탭.",
        coach: "mission-palette-hut",
      };
    // 더 사야 하면 다시 떠난다(월드맵 열면 부족 자재의 섬 강조).
    if (anyShort)
      return {
        id: "go-buy",
        label: `부족한 ${shortQty}를 사러 떠나라`,
        hint: `${[shortfall.wood > 0 ? "나무는 삼목골" : null, shortfall.stone > 0 ? "돌은 무쇠고개" : null].filter(Boolean).join(", ")}에 많다. 흥정 땐 상인의 성향(책 분석)을 살펴 약점을 찌르면 값이 내려간다.`,
        coach: ctx.worldMapOpen ? buyTown : "mission-worldmap",
      };
    // 방어: 오두막 있고 채울·살 것 없는데 미완공 → 채우기 유도.
    return { id: "fill", label: "오두막에 자재를 채워라", coach: "mission-hut" };
  }

  // 마을: 처음엔 소문으로 위치 추측(정보) → 부족분 구매 → 다 사면 귀가.
  if (!acked.has("read-rumors"))
    return {
      id: "read-rumors",
      label: "소문을 읽어 위치를 추측하라",
      hint: "소문으로 어느 상인이 무엇을 파는지·어디에 있는지 추측한다. 상인 자리는 매일 바뀐다.",
      info: true,
      coach: "mission-rumor",
    };
  if (anyShort) {
    // 이 마을에서 실제로 살 수 있는 부족 자재만 안내한다.
    const hereQty = [
      shortfall.wood > 0 && sellsHere("wood") ? `나무 ${shortfall.wood}개` : null,
      shortfall.stone > 0 && sellsHere("stone") ? `돌 ${shortfall.stone}개` : null,
    ]
      .filter(Boolean)
      .join("·");
    if (hereQty)
      return {
        id: "buy",
        label: `상인과 흥정해 ${hereQty}를 사라`,
        hint: "상인을 골라 흥정하면 값을 깎을 수 있다.",
        coach: "mission-merchant",
      };
    // 이 마을엔 부족 자재가 없다 → 다른 마을로. 이미 특산 섬이면 노드 강조 생략(되돌이 방지).
    const elsewhere = buyTownId && buyTownId !== s.location ? buyTown : undefined;
    return {
      id: "buy-elsewhere",
      label: `이 마을엔 ${shortNames}이(가) 없다 — 다른 마을로`,
      hint: "상인은 매일 자리를 옮긴다. 월드맵에서 다른 섬으로 가 보라(소문도 참고).",
      coach: ctx.worldMapOpen ? elsewhere : "mission-worldmap",
    };
  }
  return {
    id: "return",
    label: "고향으로 돌아가라",
    hint: "자재를 들고 월드맵에서 고향을 선택.",
    coach: ctx.worldMapOpen ? "mission-town-home" : "mission-worldmap",
  };
}

export const MISSIONS: Mission[] = [
  { id: "first-hut", title: "첫 집 「오두막」 짓기", resolve: resolveFirstHut },
];

// 지금 진행할 (미션·목표). 모든 미션 완료면 null. acked = [다음]으로 넘긴 정보 단계 id 집합.
export function activeMission(
  s: GameState,
  acked: ReadonlySet<string>,
  ctx: CoachCtx,
): { mission: Mission; objective: MissionObjective } | null {
  for (const m of MISSIONS) {
    const objective = m.resolve(s, acked, ctx);
    if (objective) return { mission: m, objective };
  }
  return null;
}

// 미션 목록 모달용 — 전체 미션의 현재 상태(진행 목표 또는 완료).
export interface MissionStatus {
  mission: Mission;
  objective: MissionObjective | null; // null이면 완료
  done: boolean;
}
export function missionStatuses(
  s: GameState,
  acked: ReadonlySet<string>,
  ctx: CoachCtx,
): MissionStatus[] {
  return MISSIONS.map((mission) => {
    const objective = mission.resolve(s, acked, ctx);
    return { mission, objective, done: objective === null };
  });
}
