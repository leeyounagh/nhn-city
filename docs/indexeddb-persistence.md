# IndexedDB 진행 상태 영속화 — 설계·우려 정리

작성 2026-08-02. 재접속 시 이전 진행을 복원하기 위해 게임 상태를 IndexedDB에 저장하는 계획.
**아직 미구현** — 이 문서는 착수 전 계획·확인사항 기록(구현 시 이 문서를 기준으로).

이 게임은 원래 **"매 로드 새 게임"**(상태 미영속·파생상태·결정론)으로 설계됐다. 영속화는 그 핵심 설계의 반전이므로, 저장 자체보다 **로드 타이밍·온보딩 플래그·마이그레이션·리셋 UI**가 실제 난점이다.

---

## 0. 확정 결정 (사용자)
- **저장 범위**: GameState + 온보딩/세션 플래그 포함(아래 §2).
- **리셋**: 푸터에 **「새 게임」 리셋 버튼** 추가.

---

## 1. 용량 — 문제 없음 (결론)

**저장 데이터 크기 (직렬화 GameState 추정)**
| 항목 | 대략 |
|---|---|
| gold·day·xp·inventory·recentBuys·sellPrices | ~1KB |
| **placements(건물들)** — 최대 항목, 개당 ~150B | 200채 ~30KB, 500채여도 ~90KB |
| townMerchants·merchant·haggle·clues·merchantMemory | ~5KB |
| **현실 합계** | **~10~50KB (극단적 빌드도 ~100KB)** |

**IndexedDB 한도**
- Chrome/Edge: 디스크 ~60%(오리진당 GB 단위). Firefox: 그룹당 ~10%/최대 10GB. Safari: 초기 ~1GB 후 확장.
- **GB 스케일** — 수십 KB 데이터는 0.00X%. **용량·QuotaExceeded 우려 사실상 없음.**
- 데이터가 작아 localStorage(5~10MB)로도 충분하나, IndexedDB가 **비동기(메인스레드 비차단)·구조화복제(Set/Map 직접 저장)·헤드룸** 면에서 더 안전 → IndexedDB 채택 타당.

---

## 2. 저장 대상

### 저장한다
- **GameState 전체** (`src/lib/game-state.ts`): gold, day, xp, inventory, placements, location, townMerchants, merchant, haggle, clues, recentBuys, sellPrices, merchantMemory.
- **온보딩/세션 플래그** (현재 `useGameEngine`의 useState, GameState 밖):
  - `alliesSeen`(Set) — **필수**. 안 저장하면 재접속 시 지인 합류 연출 재생.
  - `missionDismissed`, `acked`(Set), `lastNewsDay` — 튜토리얼/아침뉴스 반복 방지.
  - `INTRO_SEEN`(현재 sessionStorage) — 유지 또는 저장분에 흡수(택1).
- **스키마 버전**(number) — 마이그레이션용(§4).

### 저장하지 않는다 = "파생 계산값만" (원본은 저장되어 결과 자동 복원)
> ⚠️ **오해 주의**: 여기서 "저장 안 함"은 **지인·관계를 안 지킨다는 뜻이 아니다.** 그 값을 **만들어내는 원본**(placements·merchantMemory 등)이 위 "저장한다"에 들어 있어, 로드 시 **똑같이 다시 계산되어 복원**된다. 파생값을 별도 저장하면 오히려 원본과 어긋날 위험만 생기므로 저장하지 않을 뿐이다.

| 파생 계산값(저장 X) | 계산의 원본(저장 O) | 껐다 켜면 |
|---|---|---|
| 인구 `population` | `placements`(지은 건물) | **유지** |
| 지인 해금 `activeAllies(pop)` | `placements` → 인구 | **유지** (연출 재생은 `alliesSeen`으로 방지) |
| 상인 호감도·단골 표시 | **`merchantMemory`** (GameState 필드) | **유지** (감쇠는 저장된 `day` 기준) |
| 미션 `resolve(state)`, 조력 `allyHash(day)`, 수입 `dailyIncome` | GameState 전체 | **유지** |

- 즉 **건물·지인 해금·상인 관계·인벤토리·골드·날짜·책 레벨은 전부 이어진다.** 초기화되는 건 아래 순수 UI뿐.
- 순수 UI 상태(showXxx 모달 열림, notice, busy, newsPending 등) — 세션마다 새로.

> IndexedDB는 구조화복제라 `Set`을 JSON 변환 없이 그대로 저장/복원 가능(alliesSeen·acked 편리).

---

## 3. 로드 타이밍 (SSR 깜빡임)
- IndexedDB는 **클라 전용·비동기**. Next.js는 `initialState()`를 동기 렌더 → 저장분 로드 전 "새 게임"이 한 프레임 노출될 위험.
- **해법: 기존 `showIntro=null → 검은 풀스크린 커버` 패턴 재사용.** 로드 판정 전엔 커버로 가리고, IDB 로드 완료 후 상태 주입 → 커버 해제. (인트로 깜빡임 제거와 동일 기법.)

## 4. 버전/마이그레이션
- GameState 형태가 개발 중 계속 변함(핸드오프 경고: "필드 추가 시 옛 state 방어").
- 로드 시:
  1. **스키마 버전 확인** — 하위 버전이면 병합/마이그레이션.
  2. **누락 필드 기본값 병합** — `{ ...initialState(), ...saved }` + 중첩 객체 방어(`?.`/`?? {}`).
  3. **placement 검증** — 삭제된 buildingId/materialId를 참조하는 옛 placement는 **드롭 또는 정리**(안 하면 렌더/생산에서 깨짐). `BUILDINGS.find`/`MATERIALS`로 존재 확인.
- 버전 불일치·파싱 실패 시 **안전하게 새 게임으로 폴백**(손상 데이터로 크래시 X).

## 5. IDB 비활성 환경 폴백
- Safari 프라이빗 모드 등은 IndexedDB 차단. `try/catch`로 감싸 **실패 시 현재처럼 미영속(인메모리)로 우아하게 강등** — 게임은 정상 동작(저장만 안 됨).

## 6. 쓰기 빈도
- setState가 잦음 → **디바운스(300~500ms)** 후 저장. 작아서 부담 없으나 과도한 write 방지.
- 저장 시점: 상태 변경 디바운스. (탭 종료 시 `visibilitychange`/`pagehide`로 마지막 flush 고려.)

## 7. 멀티탭 (경미)
- 두 탭이 열리면 마지막 저장이 덮어씀(last-write-wins). 싱글플레이라 보통 무시 가능. 필요 시 BroadcastChannel로 동기(추후).

## 8. 리셋 UI (확정: 푸터 「새 게임」)
- 푸터에 「새 게임」 버튼 → 확인 후 IDB 저장분 삭제 + `initialState()` + 플래그 초기화(alliesSeen·acked·missionDismissed 리셋, INTRO도 리셋 여부 택1).
- 영속화하면 리셋 수단이 없으면 갇히므로 **필수**.

---

## 9. 권장 구현 형태
- 무거운 IndexedDB 저수준 API 대신 **단일 키 저장 래퍼**(idb-keyval 스타일 or 얇은 자체 코드):
  - `loadSave(): Promise<PersistedState | null>` · `writeSave(state): Promise<void>` · `clearSave(): Promise<void>`.
  - 하나의 오브젝트스토어에 키 하나(`"game"`)로 `{ version, gameState, flags }` 저장.
- `useGameEngine` 연결:
  1. 마운트 시 `loadSave()` → 있으면 마이그레이션·검증 후 `setState`/플래그 주입, 로드 커버 해제.
  2. 상태/플래그 변경 → 디바운스 `writeSave()`.
  3. 「새 게임」 → `clearSave()` + 초기화.

## 10. 착수 전 남은 결정
- INTRO_SEEN을 sessionStorage 유지 vs 저장분 흡수.
- 「새 게임」 확인 모달 형태(기존 모달 컴포넌트 재사용).
- 탭 종료 flush 필요 여부(디바운스만으로 충분한지).
