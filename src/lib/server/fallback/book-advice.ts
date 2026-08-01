// 마법의 책 조언 폴백 데이터 — 책 조언 도입부 변형. seed로 골라 상인마다 다른 결의 목소리로 읊는다.
import { variant } from "./pick";

const BOOK_ADVICE_WEAKNESS: ((hint: string) => string)[] = [
  (h) => `책장에 글귀가 또렷이 떠오른다 — ${h}`,
  (h) => `책이 스스로 페이지를 넘긴다. 한 구절이 빛난다 — ${h}`,
  (h) => `낡은 잉크가 되살아나 속삭인다 — ${h}`,
  (h) => `책장 사이로 상인의 그림자가 비친다 — ${h}`,
];
const BOOK_ADVICE_PROFILE: ((hint: string) => string)[] = [
  (h) => `책장에 흐릿한 상이 맺힌다 — ${h}`,
  (h) => `먼지 낀 글자가 어렴풋이 떠오른다 — ${h}`,
  (h) => `책이 나직이 일러준다 — ${h}`,
  (h) => `희미한 문양이 손끝에 만져진다 — ${h}`,
];

export function fallbackBookAdvice(profileHint: string, weaknessHint?: string, seed = 0): string {
  return weaknessHint
    ? variant(BOOK_ADVICE_WEAKNESS, seed)(weaknessHint)
    : variant(BOOK_ADVICE_PROFILE, seed)(profileHint);
}
