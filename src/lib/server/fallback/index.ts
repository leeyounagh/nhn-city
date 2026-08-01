// AI 폴백 데이터 공개 API — 프롬프트(prompt.ts)와 분리된 정적 폴백 데이터·선택 함수를 한곳에서 re-export.
export type { Persona } from "./personas";
export { fallbackPersona } from "./personas";
export { fallbackCategory, fallbackLine, isValidCategory } from "./haggle";
export { fallbackRumor } from "./rumors";
export { fallbackHeadline } from "./headlines";
export { fallbackBookAdvice } from "./book-advice";
