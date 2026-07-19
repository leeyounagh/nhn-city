# 작업일지 — 2026-07-20 (월) | master

## feat(game): build Ashen Kingdom core (P1 rumor recon + P2 travel/trade/iso-city)

- **시각(KST)**: 07:10
- **브랜치**: master
- **커밋 범위**: 초기 스캐폴드 이후 첫 실질 커밋. 「Ashen Kingdom(망한 도시의 후계자)」 P1~P2 전부.

### 요약
- 「마지막 도시」에서 피벗한 신 빌드를 최초로 버전관리에 편입. 이전까지 커밋이 `Initial commit` 하나뿐이라 무방비 상태였던 작업분(82파일, +3750/−217)을 백업 목적 포함 커밋.
- P1(진실 모델 + 소문/단서 노트 + 정보격리·인젝션 방어) 완료분.
- P2(월드맵 이동·날짜/상인 갱신 + 마을 진입·흥정 + 골드 매매/희귀템 물물교환 + 아이소메트릭 건설맵·드래그 배치) 완료분.

### 주요 파일
- 서버: `lib/server/{world,rumor,economy,merchant,llm,prompt}.ts`, `app/api/{rumors,town,haggle,merchant}/route.ts`
- 클라: `components/{Game,WorldMap,TownView,MerchantPanel,HaggleDialog,IsoCityMap,ClueNotebook,InventoryPanel,IntroCutscene}.tsx`
- 상태/데이터/타입: `lib/{game-state,game-data}.ts`, `types/game.ts`
- 에셋: `public/{intro,merchants,sprites}/`

### 크래시 복구 메모
- 직전 세션이 dev 서버 실행 중 Git Bash 힙 손상(exit 1073807364)으로 종료됨. 코드 손상 아님 — `tsc --noEmit` 그린 확인.
- 크래시 잔재 `dev.log`, `bash.exe.stackdump`는 `.gitignore`(`dev.log`, `*.stackdump`)로 제외.

### 다음
- P3 경제/뉴스 착수 예정.
- P2-6 아이소맵 브라우저 시각검증은 미검(수동 플레이 필요).
