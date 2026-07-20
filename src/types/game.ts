// 클라이언트와 서버가 공유하는 게임 타입. 상인 성향·하한가 같은 "진실"은 이곳에 두지 않는다.

export type Tier = 1 | 2 | 3;

export type MaterialId =
  | "wood"
  | "stone"
  | "clay"
  | "scrap"
  | "planks"
  | "brick"
  | "glass"
  | "steel"
  | "cloth"
  | "marble"
  | "bronze"
  | "stainedglass"
  | "relic";

export interface MaterialMeta {
  id: MaterialId;
  name: string;
  tier: Tier;
}

export type TownId = "nw" | "ne" | "sw" | "se";
export type IndustryId = "forestry" | "mining" | "textile" | "glasswork";

// 플레이어가 있을 수 있는 위치. "home"은 재건 대상인 폐허 고향(건설 전용), 나머지는 상인 마을.
export type LocationId = TownId | "home";

// 브라우저에 공개해도 되는 마을 메타. 오늘 누가 어디 있는지(진실)는 여기 없다.
export interface TownMeta {
  id: TownId;
  name: string;
  industry: IndustryId;
  industryName: string; // 표시용 업종명 (예: 임업)
  specialMaterials: MaterialId[]; // 특산 업종 물품 (할인·재고 편향)
  neighbors: Partial<Record<TownId, number>>; // 이웃 마을 → 이동일수
}

export interface BuildingDef {
  id: string;
  name: string;
  requires: Partial<Record<MaterialId, number>>;
  income: number; // 완성 시 골드/day
  xp: number;
  prereq: string[]; // 선행 건물 id
  minBook?: number; // 요구 마법의 책 레벨
}

export type BookLevel = 1 | 2 | 3;

export type ClueKind = "location" | "wants" | "moving";

// 정보원이 흘린 소문 한 조각의 공개 뷰. 진실 원본(정확한 재고·수치)은 여기 없다.
export interface Rumor {
  id: string;
  source: string; // 정보원 유형 (정보상·행인·상인)
  text: string; // 자연어 소문 문장 (LLM 또는 폴백)
  townId: TownId; // 소문이 지목하는 마을
  townName: string;
  archetype: string; // 상인 아키타입 (초상화·표시 키)
  archetypeTitle: string; // 표시용 전문화 명칭
  material?: MaterialId;
  materialName?: string;
  kind: ClueKind;
  suspect?: boolean; // 책 Lv3에서만: 오래됐거나 거짓일 수 있다는 표시
}

export type HaggleCategory =
  | "flattery"
  | "logic"
  | "bulk"
  | "sob"
  | "threat"
  | "smalltalk"
  | "quality";

// 상인이 파는 자재의 (책 레벨로 걸러진) 공개 뷰
export interface MerchantMaterialView {
  id: MaterialId;
  name: string;
  tier: Tier;
  offer: number; // 초기 제시가
  floorHint?: number; // 책 Lv3에서만 노출되는 하한가 근사
  locked?: boolean; // relic 등 책 레벨 부족으로 잠김
}

// 브라우저로 내보내도 되는 상인 정보 (성향·하한가 원본은 제외)
export interface PublicMerchant {
  seed: number;
  name: string;
  title: string; // 전문화 명칭 (예: 석공상)
  portrait: string; // 초상화 태그 (아키타입) — 이모지 폴백 키
  portraitFile?: string; // 성향에 맞춰 풀에서 고른 실제 초상화 파일명 (없으면 portrait 사용)
  appearance: string;
  greeting: string;
  personalityTone: string; // 연기용 성격 톤 (약점 수치는 아님)
  profileHint?: string; // 책 Lv2+
  weaknessHint?: string; // 책 Lv3
  materials: MerchantMaterialView[];
  wants: { id: MaterialId; name: string }[]; // 오늘 이 상인이 원하는 물품 (물물교환 지불 후보)
}

// 아침 뉴스로 공개되는 시장 이벤트(대풍작 등). 가격 공식 원본은 서버에만, 이 서술만 공개.
export interface MarketEvent {
  townId: TownId;
  townName: string;
  industryName: string;
  materialNames: string[]; // 값이 떨어진 특산 물품 이름들
  pct: number; // 하락률 % (예: 50 = 반값)
}

export interface DailyNews {
  headline: string; // LLM(또는 폴백) 헤드라인 한 문장
  event: MarketEvent | null; // 이벤트 없으면 평온한 장세
}

export type HaggleStatus = "ongoing" | "timeup" | "broke" | "closed";

export interface HaggleResult {
  category?: HaggleCategory;
  line: string;
  disposition: number;
  currentPrice: number;
  turnsLeft: number;
  status: HaggleStatus;
  finalPrice?: number;
}
