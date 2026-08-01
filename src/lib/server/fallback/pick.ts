// 폴백 변형 선택 헬퍼 — seed·턴수 같은 정수로 배열에서 결정론적으로 하나 고른다 (같은 입력=같은 결과).
export function variant<T>(arr: T[], n: number): T {
  const i = (((Math.floor(n) % arr.length) + arr.length) % arr.length) || 0;
  return arr[i];
}
