// 소문 폴백 데이터 — 크레딧(AI 토큰) 없을 때 진실 조각을 템플릿 문장으로 옮긴다. merchantSeed로 말투를 변형한다.
import type { RumorFragment } from "@/lib/server/rumor";
import { variant } from "./pick";

const FALLBACK_RUMOR_LOCATION: ((title: string, town: string) => string)[] = [
  (t, town) => `그 ${t}, 요새 ${town}에 자리를 텄다더군.`,
  (t, town) => `방금 ${town} 저잣거리에서 ${t}을(를) 봤다는 사람이 있어.`,
  (t, town) => `듣자 하니 ${t}이(가) 지금 ${town} 어귀에 수레를 풀었다지.`,
  (t, town) => `${t} 말인가? 요즘 ${town}에 눌러앉았다는 소문이야.`,
  (t, town) => `요 며칠 ${town}에 ${t}이(가) 드나든다더라.`,
  (t, town) => `${town}에 가면 지금 그 ${t}을(를) 만날 수 있을 거요.`,
];
// 오래된 소식 — 상인은 5일마다 옮겨 다니니 이미 떠났을 수 있다(신선도로 판단하게).
const FALLBACK_RUMOR_LOCATION_STALE: ((title: string, town: string) => string)[] = [
  (t, town) => `얼마 전엔 ${t}이(가) ${town}에 있었다는데, 지금도 있을지는 모르겠군.`,
  (t, town) => `${town}에서 ${t}을(를) 봤다는 건 며칠 지난 소식이야.`,
  (t, town) => `${t}? 한동안 ${town}에 있었다지. 벌써 떴을지도 모르고.`,
  (t, town) => `옛말에 ${t}이(가) ${town}에 들렀다더라만, 오래된 얘기지.`,
];
const FALLBACK_RUMOR_WANTS: ((title: string, town: string, mat: string) => string)[] = [
  (t, town, m) => `${town}의 ${t}이(가) ${m}을(를) 애타게 찾는다던데.`,
  (t, town, m) => `그 ${t}, ${m} 구한다고 ${town}에서 수소문 중이래.`,
  (t, town, m) => `${m} 있으면 ${town}의 ${t}한테 가봐. 값 쳐준다더군.`,
  (t, town, m) => `${town} 쪽에서 ${t}이(가) ${m}을(를) 급히 찾는다는군.`,
  (t, town, m) => `${t}이(가) ${m}이라면 사족을 못 쓴다더라, ${town}에서.`,
  (t, town, m) => `소문엔 ${town}의 ${t}이(가) ${m}을(를) 원한다지.`,
];
const FALLBACK_RUMOR_LEAVING: ((title: string, town: string) => string)[] = [
  (t, town) => `그 ${t}, 내일이면 ${town}을(를) 뜬다더라.`,
  (t, town) => `${t}이(가) ${town}에서 짐을 싼다는 얘길 들었어.`,
  (t, town) => `서둘러. ${t}은(는) 곧 ${town}을(를) 떠난다니까.`,
];
const FALLBACK_RUMOR_STAYING: ((title: string, town: string) => string)[] = [
  (t, town) => `${t}은(는) 당분간 ${town}에 눌러앉을 모양이야.`,
  (t, town) => `${t} 말이야? ${town}에서 한동안 안 움직인다더군.`,
  (t, town) => `${town}의 ${t}, 급할 것 없어. 안 떠난다니까.`,
];

export function fallbackRumor(frag: RumorFragment): string {
  // 외견이 있으면 그걸로 상인을 지칭해 특정 가능하게(폴백도 "생김새+위치/품목"으로 추리됨).
  const t = frag.appearance || frag.archetypeTitle;
  const town = frag.townName;
  if (frag.kind === "location") {
    const pool = frag.reliability === "stale" ? FALLBACK_RUMOR_LOCATION_STALE : FALLBACK_RUMOR_LOCATION;
    return variant(pool, frag.merchantSeed)(t, town);
  }
  if (frag.kind === "wants") {
    return variant(FALLBACK_RUMOR_WANTS, frag.merchantSeed)(t, town, frag.materialName ?? "무언가");
  }
  const pool = frag.movingClaim ? FALLBACK_RUMOR_LEAVING : FALLBACK_RUMOR_STAYING;
  return variant(pool, frag.merchantSeed)(t, town);
}
