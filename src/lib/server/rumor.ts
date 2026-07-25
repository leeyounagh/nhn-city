// 서버 전용 소문 진실 선택기. 하루치 세계 진실에서 "흘릴 조각" 2~3개를 결정론적으로 고른다.
// 1소문 = 진실 1조각. 책 레벨로 조각 종류를 거르고, 일부는 오래됐거나 거짓으로 흔든다(난이도).
import "server-only";
import type { BookLevel, ClueKind, MaterialId, Rumor, TownId } from "@/types/game";
import { MATERIAL_NAME, TOWN_BY_ID, TOWNS } from "@/lib/game-data";
import { deriveMerchant, mulberry32, merchantIdentity } from "@/lib/server/economy";
import { deriveWorld } from "@/lib/server/world";
import { askText, extractJson } from "@/lib/server/llm";
import { rumorSystem, rumorUser, fallbackRumor } from "@/lib/server/prompt";

const TOWN_IDS: TownId[] = TOWNS.map((t) => t.id);

export type Reliability = "solid" | "stale" | "false";

// 소문 한 조각의 서버측 원본. 이 중 수치·전체 진실은 클라이언트로 나가지 않는다.
export interface RumorFragment {
  merchantSeed: number;
  source: string; // 정보원 유형
  archetype: string; // 상인 아키타입 (초상화 태그)
  archetypeTitle: string; // 전문화 명칭
  appearance: string; // 상인 외견 묘사 (AI 없이도 특정 가능하게 하는 단서)
  kind: ClueKind;
  townId: TownId; // 조각이 지목하는 마을 (거짓/오래되면 실제와 다름)
  townName: string;
  material?: MaterialId;
  materialName?: string;
  movingClaim?: boolean; // kind="moving"일 때 전달되는 이동 여부 (거짓/오래되면 뒤집힘)
  reliability: Reliability;
}

const SOURCES = ["정보상", "행인", "떠돌이 상인", "주막 주인", "아이"];
const TRAVEL_MAX = 3; // 마을 간 최대 이동일 (고향↔유리섬). 위치 소문은 남은 체류가 이보다 길 때만 흘린다.

// 책 레벨별로 흘릴 수 있는 조각 종류.
function allowedKinds(bookLevel: BookLevel): ClueKind[] {
  if (bookLevel >= 3) return ["location", "wants", "moving"];
  if (bookLevel >= 2) return ["location", "wants"];
  return ["location"];
}

// 책 레벨이 낮을수록 거짓·오래된 조각이 섞일 확률이 높다.
function unreliableChance(bookLevel: BookLevel): number {
  if (bookLevel >= 3) return 0.2;
  if (bookLevel >= 2) return 0.28;
  return 0.4;
}

function rumorSeed(day: number, townId: TownId): number {
  const ti = TOWN_IDS.indexOf(townId);
  return (Math.imul(day, 0x85ebca6b) ^ Math.imul(ti + 1, 0xc2b2ae35) ^ 0x27d4eb2f) >>> 0;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// 오늘 세계에서 마을 방문 시 들을 소문 조각을 고른다. 같은 (day, town)이면 항상 같다.
export function selectFragments(
  day: number,
  viewingTown: TownId,
  bookLevel: BookLevel,
): RumorFragment[] {
  const rng = mulberry32(rumorSeed(day, viewingTown));
  const world = deriveWorld(day);
  const kinds = allowedKinds(bookLevel);
  const badChance = unreliableChance(bookLevel);

  const count = rng() < 0.5 ? 2 : 3;
  const fragments: RumorFragment[] = [];
  const usedMerchants = new Set<number>(); // 소문 하나당 서로 다른 상인 (단서 다양성)

  for (let k = 0; k < count; k++) {
    const pool = world.merchants.filter((m) => !usedMerchants.has(m.seed));
    if (pool.length === 0) break;
    const wm = pick(rng, pool);
    usedMerchants.add(wm.seed);
    const d = deriveMerchant(wm.seed);

    // 이 상인이 낼 수 있는 조각 종류만 추림.
    // 위치(location)는 남은 체류가 최대 이동일(3)보다 길 때만 흘린다 → 소문 보고 가면 항상 있음.
    let candidateKinds = kinds.filter((c) => {
      if (c === "wants") return wm.wants.length > 0;
      if (c === "location") return wm.daysLeft > TRAVEL_MAX;
      return true;
    });
    if (candidateKinds.length === 0) {
      candidateKinds = wm.wants.length > 0 ? ["wants"] : kinds.includes("moving") ? ["moving"] : ["location"];
    }
    const kind = pick(rng, candidateKinds);

    const reliability: Reliability =
      rng() < badChance ? (rng() < 0.5 ? "stale" : "false") : "solid";

    const frag: RumorFragment = {
      merchantSeed: wm.seed,
      source: pick(rng, SOURCES),
      archetype: d.spec.portrait,
      archetypeTitle: d.spec.title,
      appearance: merchantIdentity(wm.seed)?.appearance ?? "",
      kind,
      townId: wm.townId,
      townName: TOWN_BY_ID[wm.townId].name,
      reliability,
    };

    if (kind === "location") {
      // 오래된 조각: 이웃 마을을 지목. 거짓: 아무 다른 마을.
      if (reliability !== "solid") {
        const others = TOWN_IDS.filter((t) => t !== wm.townId);
        const neighbors = Object.keys(TOWN_BY_ID[wm.townId].neighbors) as TownId[];
        const poolT = reliability === "stale" && neighbors.length > 0 ? neighbors : others;
        frag.townId = pick(rng, poolT);
        frag.townName = TOWN_BY_ID[frag.townId].name;
      }
    } else if (kind === "wants") {
      let mat = pick(rng, wm.wants);
      if (reliability !== "solid") {
        // 거짓/오래된 원함: 실제로 원하지 않는 물품을 지목.
        const wrong = (Object.keys(MATERIAL_NAME) as MaterialId[]).filter(
          (m) => !wm.wants.includes(m),
        );
        if (wrong.length > 0) mat = pick(rng, wrong);
      }
      frag.material = mat;
      frag.materialName = MATERIAL_NAME[mat];
    } else {
      // moving: 오래된/거짓이면 실제 이동 여부를 뒤집어 전달.
      frag.movingClaim = reliability === "solid" ? wm.movingTomorrow : !wm.movingTomorrow;
    }

    fragments.push(frag);
  }

  return fragments;
}

// 마을 진입 시 들을 소문 조각들을 각각 LLM(또는 폴백)으로 한 문장씩 만들어 공개 Rumor[]로 반환한다.
// 1소문 = 1조각 = LLM 호출 1회 → 인젝션 격리. /api/rumors·/api/town이 공유한다.
export async function generateRumors(
  day: number,
  town: TownId,
  bookLevel: BookLevel,
): Promise<Rumor[]> {
  const fragments = selectFragments(day, town, bookLevel);
  return Promise.all(
    fragments.map(async (frag, i) => {
      const llm = extractJson<{ text?: string }>(
        await askText(rumorSystem(), rumorUser(frag), 200),
      );
      const text = llm?.text?.trim() || fallbackRumor(frag);
      const rumor: Rumor = {
        id: `${day}-${town}-${i}`,
        source: frag.source,
        text,
        townId: frag.townId,
        townName: frag.townName,
        archetype: frag.archetype,
        archetypeTitle: frag.archetypeTitle,
        kind: frag.kind,
      };
      if (frag.material) {
        rumor.material = frag.material;
        rumor.materialName = frag.materialName;
      }
      // 책 Lv3: 거짓·오래된 조각을 "의심스러움"으로 표시해 판별을 돕는다.
      if (bookLevel >= 3 && frag.reliability !== "solid") rumor.suspect = true;
      return rumor;
    }),
  );
}
