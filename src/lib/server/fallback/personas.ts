// 상인 페르소나 폴백 데이터 — LLM(AI 토큰) 없이도 게임이 돌아가도록 전문화별 변형 페르소나를 제공한다.
import type { Specialization } from "@/lib/server/economy";
import { variant } from "./pick";

export interface Persona {
  name: string;
  appearance: string;
  greeting: string;
  personalityTone: string;
}

// 전문화별 폴백 페르소나 변형 (LLM 없이도 게임이 돌아가야 한다). seed로 골라 같은 전문화라도 상인마다 다르게.
const FALLBACK_PERSONAS: Record<string, Persona[]> = {
  woodmonger: [
    {
      name: "톱니 바르트",
      appearance: "톱밥 묻은 가죽 앞치마에 굵은 팔뚝. 말수 적은 벌목꾼.",
      greeting: "쓸 만한 나무만 가져왔소. 살 거요, 말 거요?",
      personalityTone: "투박하고 무뚝뚝하지만 정직하다.",
    },
    {
      name: "옹이손 가르드",
      appearance: "손마디마다 굳은살이 박인 늙은 목재상. 한쪽 눈엔 톱밥이 앉았다.",
      greeting: "이 나무들, 무너진 대성당 서까래에서 나온 거요. 값은 정직하게 부르리다.",
      personalityTone: "느릿하지만 흥정엔 끈질기다.",
    },
    {
      name: "그루터기 이바",
      appearance: "벌목 도끼를 등에 진 억센 여인. 걷어붙인 팔뚝에 나이테 문신.",
      greeting: "폐허 뒤진 지 사흘 만에 첫 손님이군. 뭐가 필요한가?",
      personalityTone: "거칠지만 손님을 반긴다.",
    },
    {
      name: "말라깽이 톰",
      appearance: "비쩍 마른 체구에 늘 마른 장작을 씹는 젊은 목상. 눈치가 빠르다.",
      greeting: "장작이든 널판이든, 부르는 게 값이오… 아니, 농담이오.",
      personalityTone: "약삭빠르고 말이 많다.",
    },
  ],
  mason: [
    {
      name: "석수 카일라",
      appearance: "돌가루가 앉은 손, 정과 망치를 허리에 찬 장인.",
      greeting: "내 돌은 백 년을 간다. 값을 깎으려거든 이유가 있어야 할 거야.",
      personalityTone: "자기 솜씨에 대한 자부심이 크다.",
    },
    {
      name: "정 든 하롤",
      appearance: "회색 수염에 돌먼지가 허옇게 앉은 노석공. 손끝이 갈라져 있다.",
      greeting: "성벽 한 장을 쌓아도 백 년을 보고 쌓지. 서두르는 손님은 사절이야.",
      personalityTone: "고집스럽고 원칙적이다.",
    },
    {
      name: "화강암 브렌",
      appearance: "바위처럼 넓은 어깨, 이마엔 오래된 흉터. 말보다 망치가 앞선다.",
      greeting: "…돌 보러 왔나. 골라. 흥정은 그다음이다.",
      personalityTone: "과묵하고 무뚝뚝하다.",
    },
    {
      name: "끌자국 세라",
      appearance: "앞치마에 연장을 줄줄이 꽂은 젊은 석공. 눈빛이 날카롭다.",
      greeting: "무너진 걸 다시 세운다니 반가운 소리네. 좋은 돌로 골라주지.",
      personalityTone: "당차고 자부심이 있지만 협조적이다.",
    },
  ],
  junker: [
    {
      name: "넝마꾼 레브",
      appearance: "온갖 잡동사니를 매단 낡은 외투, 곁눈질이 잦다.",
      greeting: "흐흐, 어디서도 못 구할 물건이 여기 있지. 뭘 찾나?",
      personalityTone: "능글맞고 수상쩍지만 물건은 진짜다.",
    },
    {
      name: "고물장수 핀치",
      appearance: "손가락마다 반지를 낀 왜소한 사내. 자루엔 정체 모를 쇳조각이 가득.",
      greeting: "쓰레기라고? 천만에, 이건 다 사연 있는 보물이라고.",
      personalityTone: "너스레가 심하고 값을 부풀린다.",
    },
    {
      name: "외눈 도라",
      appearance: "안대를 한 늙은 넝마주이. 성한 눈으로 손님 주머니부터 살핀다.",
      greeting: "폐허가 곧 광산이지. 남들이 버린 걸 난 팔아먹거든.",
      personalityTone: "약삭빠르고 계산이 빠르다.",
    },
    {
      name: "자루멘 콥",
      appearance: "등에 짊어진 자루가 몸집보다 크다. 늘 뭔가를 우물거린다.",
      greeting: "어이, 없는 것 빼곤 다 있어. 대신 값은 그때그때 달라.",
      personalityTone: "변덕스럽고 붙임성 있다.",
    },
  ],
  glazier: [
    {
      name: "유리세공 미르",
      appearance: "가느다란 손가락, 색유리 파편을 목걸이처럼 걸었다.",
      greeting: "손 조심해요. 깨지면 당신이 물어줘야 하니까.",
      personalityTone: "예민하고 까다롭다.",
    },
    {
      name: "색유리 엘라",
      appearance: "무지갯빛이 어른대는 베일을 두른 여인. 손톱 밑에 유릿가루.",
      greeting: "이 빛깔, 무너진 예배당 창에서만 나와요. 함부로 값 매기지 마요.",
      personalityTone: "도도하고 예술가 기질이 있다.",
    },
    {
      name: "불집게 요른",
      appearance: "화상 자국이 남은 팔, 두꺼운 가죽 장갑. 용광로 열기를 몸에 두른 듯하다.",
      greeting: "유리는 불과 숨으로 빚는 거요. 그 값을 치를 각오는 됐소?",
      personalityTone: "무겁고 진중하다.",
    },
    {
      name: "살얼음 니케",
      appearance: "창백한 낯빛에 얇은 입술. 물건을 다루는 손놀림이 서늘하다.",
      greeting: "…깨지기 쉬운 걸 파는 사람은, 성미도 깨지기 쉽죠.",
      personalityTone: "신경질적이고 냉정하다.",
    },
  ],
  draper: [
    {
      name: "행상 도티",
      appearance: "알록달록한 천을 잔뜩 두른 수다스러운 행상.",
      greeting: "어머, 오랜만에 손님이네! 뭐든 물어봐요, 얘기 좋아하니까.",
      personalityTone: "수다스럽고 사람을 반긴다.",
    },
    {
      name: "실타래 뮤엘",
      appearance: "목에 줄자를 걸고 소맷단마다 바늘을 꽂은 재바른 행상.",
      greeting: "이 천 한 필이면 온 식구 겨울을 나요. 자, 만져나 봐요!",
      personalityTone: "붙임성 있고 흥정을 즐긴다.",
    },
    {
      name: "물레 사니",
      appearance: "빛바랜 숄을 두른 노파. 손은 늙었어도 눈은 천 값을 귀신같이 안다.",
      greeting: "좋은 실은 사람을 안 속여. …사람이 사람을 속이지.",
      personalityTone: "인정 많지만 값엔 야무지다.",
    },
    {
      name: "비단발 카림",
      appearance: "화려한 두건에 반지를 낀 이국풍 상인. 말끝마다 손짓이 크다.",
      greeting: "친구! 이 빛깔은 바다 건너에서 왔소. 눈으로만 봐도 이득이지!",
      personalityTone: "과장이 심하고 살갑다.",
    },
  ],
  general: [
    {
      name: "만물장수 곰보",
      appearance: "짐수레 가득 잡화를 실은 넉살 좋은 장수.",
      greeting: "없는 것 빼곤 다 있소. 뭐가 필요하쇼?",
      personalityTone: "두루뭉술하고 능구렁이 같다.",
    },
    {
      name: "저울눈 하킴",
      appearance: "낡은 저울을 어깨에 멘 뚱뚱한 상인. 웃는 낯 뒤로 셈이 빠르다.",
      greeting: "허허, 뭐든 말만 하쇼. 값은… 서로 좋게 맞춰봅시다.",
      personalityTone: "능청스럽고 흥정에 능하다.",
    },
    {
      name: "잡화 미나",
      appearance: "허리춤에 주머니를 주렁주렁 단 재빠른 소녀 장수. 눈이 반짝인다.",
      greeting: "소금부터 부싯돌까지! 뭐 찾으세요? 다 있어요, 아마도!",
      personalityTone: "발랄하고 넉살이 좋다.",
    },
    {
      name: "떠돌이 발탄",
      appearance: "수레 하나에 세간을 다 실은 늙은 방랑상. 지도처럼 주름진 얼굴.",
      greeting: "이 물건들, 다 사연 있는 마을에서 왔소. 천천히 골라보쇼.",
      personalityTone: "느긋하고 이야기를 곁들인다.",
    },
  ],
};

export function fallbackPersona(spec: Specialization, seed = 0): Persona {
  const arr = FALLBACK_PERSONAS[spec.id] ?? FALLBACK_PERSONAS.general;
  return variant(arr, seed);
}
