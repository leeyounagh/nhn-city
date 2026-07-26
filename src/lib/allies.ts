// 지인(조력자) 시스템. 도시 인구가 임계를 넘으면 주인공의 지인이 합류해 조력한다(혼합: 버프 + 서사).
// 인구·임계·perk = 코드 소유(2레이어). 합류 대사는 정적 폴백 + AI 페르소나(/api/ally)로 연기.
export type AllyPerk =
  | { kind: "income"; pct: number } // 정산 골드 수입 +%
  | { kind: "bookXp"; pct: number }; // 완공 경험치 +%

export interface Ally {
  id: string;
  name: string;
  role: string;
  popThreshold: number; // 이 인구에서 합류
  perk: AllyPerk;
  perkLabel: string; // 표시용
  greeting: string; // 정적 폴백 합류 대사
  appearance: string; // AI 프롬프트용 외형
}

export const ALLIES: Ally[] = [
  {
    id: "comrade",
    name: "이르빈",
    role: "옛 전우",
    popThreshold: 30,
    perk: { kind: "income", pct: 10 },
    perkLabel: "골드 수입 +10%",
    greeting: "무너진 도시에 다시 사람이 모인다기에 달려왔어. 옛 전우가 어찌 그냥 있겠나 — 이 손, 자네 곁에 두게.",
    appearance: "낡은 갑옷을 걸친 다부진 청년 전사, 볼에 옅은 흉터, 짧은 머리",
  },
  {
    id: "builder",
    name: "돌마루 한",
    role: "대목수",
    popThreshold: 90,
    perk: { kind: "bookXp", pct: 20 },
    perkLabel: "완공 경험치 +20%",
    greeting: "이만한 도시라면 내 끌과 대패가 쓸모 있겠군. 건물 하나하나, 더 야무지게 세워주지.",
    appearance: "먼지 묻은 앞치마의 노(老)목수, 어깨에 대패를 걸침",
  },
  {
    id: "merchant",
    name: "저울눈 노아",
    role: "노(老)상인",
    popThreshold: 180,
    perk: { kind: "income", pct: 15 },
    perkLabel: "골드 수입 +15%",
    greeting: "소문에 이 폐허가 되살아난다더니 사실이었군. 내 이름을 대게 — 상인들이 자네를 다르게 볼 걸세.",
    appearance: "여유로운 미소의 백발 상인, 손에 낡은 저울",
  },
  {
    id: "scholar",
    name: "등불 세라",
    role: "현자",
    popThreshold: 300,
    perk: { kind: "bookXp", pct: 25 },
    perkLabel: "완공 경험치 +25%",
    greeting: "도시가 이만큼 컸으니 이제 기록하고 다스릴 사람이 필요하죠. 제 지혜를 보태겠어요.",
    appearance: "두루마리를 안은 총명한 청년 여성 학자, 둥근 안경",
  },
];

export const allyById = (id: string): Ally | undefined => ALLIES.find((a) => a.id === id);

// 현재 인구에서 합류한 지인들.
export function activeAllies(pop: number): Ally[] {
  return ALLIES.filter((a) => pop >= a.popThreshold);
}

// ── 조력 이벤트 ─────────────────────────────────────────────
// 날이 경과할 때 결정론 확률로 활성 지인 하나가 조력한다. 지인별 테마 고정.
export const ALLY_EVENT_CHANCE = 0.25;
export type AllyEventKind = "material" | "build" | "gold" | "xp";
export const ALLY_EVENT_KIND: Record<string, AllyEventKind> = {
  comrade: "material", // 재료 공수
  builder: "build", // 건설 도움
  merchant: "gold", // 시세 분석 → 거래 이득
  scholar: "xp", // 기록·연구 → 경험치
};

// 결정론 0~1 난수 (day, salt). 대풍작 이벤트처럼 재현 가능.
export function allyHash(day: number, salt: number): number {
  let h = (Math.imul(day, 2654435761) ^ Math.imul(salt, 40503)) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967296;
}

// 합류한 지인들의 누적 보너스(같은 종류는 합산).
export function allyBonuses(pop: number): { incomePct: number; bookXpPct: number } {
  let incomePct = 0;
  let bookXpPct = 0;
  for (const a of activeAllies(pop)) {
    if (a.perk.kind === "income") incomePct += a.perk.pct;
    else bookXpPct += a.perk.pct;
  }
  return { incomePct, bookXpPct };
}
