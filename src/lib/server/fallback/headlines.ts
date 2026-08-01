// 아침 시황 헤드라인 폴백 데이터 — 이벤트 날은 day로, 평온한 날은 정적 문구를 day로 골라 매일 다른 아침을 연출한다.
import type { MarketEvent } from "@/types/game";
import { variant } from "./pick";

const FALLBACK_HEADLINES_EVENT: ((town: string, industry: string) => string)[] = [
  (town, ind) => `${town} ${ind} 대풍작! 특산품 시세 폭락`,
  (town, ind) => `속보 — ${town}에 ${ind} 풍년, 값이 바닥을 친다!`,
  (town, ind) => `${town} 창고가 넘친다! ${ind} 특산품 헐값에 풀려`,
  (town, ind) => `오늘의 저잣거리: ${town} ${ind} 대풍작, 지금이 살 때!`,
  (town, ind) => `${town}에서 낭보! ${ind} 넘쳐나 특산품값 뚝뚝`,
  (town, ind) => `수레꾼들 ${town}로 몰린다 — ${ind} 풍작에 값 폭락`,
  (town, ind) => `${town} ${ind} 풍년가! 오늘만큼은 특산품이 흙값`,
];
const FALLBACK_HEADLINES_CALM: string[] = [
  "오늘 장세는 잔잔하다. 큰 소식 없음.",
  "저잣거리는 조용하다. 특별한 사건 없이 하루가 밝았다.",
  "바람도 값도 잔잔한 아침. 오늘은 무소식이 희소식.",
  "오늘은 이렇다 할 소식이 없구나. 장세는 평온하다.",
  "큰 사건 없는 아침. 각자 제 물건이나 챙기시게.",
];

export function fallbackHeadline(event: MarketEvent | null, day = 0): string {
  return event
    ? variant(FALLBACK_HEADLINES_EVENT, day)(event.townName, event.industryName)
    : variant(FALLBACK_HEADLINES_CALM, day);
}
