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

---

## feat(game): 홈 UI 리워크 — 월드맵 모달·도움말 모달·무한 아이소맵 + 모달 z-index 픽스

- **시각(KST)**: 08:40
- **브랜치**: master

### 요약 (사용자 지시 순차 반영)
- **P2-7 월드맵 모달화**: 인라인 월드맵 → 헤더 `🗺️ 이동` 모달(고향·마을 통일, 노드 클릭 시 이동+닫힘). 고향맵 전체폭. WorldMap.tsx 무수정 재사용.
- **P2-8 도움말 모달 + 드래그 팬**: 튜토리얼 → 오버레이 모달. 아이소맵 크기제한 완화.
- **P2-9 무한 타일 평면**: 고정 7×7 폐기 → 경계 없는 무한 아이소 평면(가시영역 가상화, 음수 좌표). 드래그로 카메라 이동(타일이 드래그 방향으로 밀림). worldPos+pan 좌표계, ResizeObserver 뷰포트 컬링, 줌 중앙기준.
- **버그픽스**: 모달이 보드 타일에 가려져 클릭 안 되던 문제. P2-9에서 transform 래퍼(스태킹 컨텍스트) 제거로 타일 z-index(981~100000)가 루트로 새어나가 모달(z-40)을 이김. 보드영역에 `isolate` 추가로 z-index 격리(1줄). 홈 위 전 모달 공통 해결.

### 검증
- tsc/eslint 그린. 브라우저: 이동/도움말/노트 모달·무한 팬·건물 배치·모달 위 elementFromPoint(=모달 z-40) 전부 확인. 콘솔·서버 에러 0.
- docs checklist(P2-7~9)·context-notes 기록.

---

## P3-1 경제 특산 할인 · favicon · hydration 픽스 (3 커밋)

- **시각(KST)**: 09:25 / **브랜치**: master
- **feat(P3-1)**: 마을 특산 할인. economy `townMultiplier`+`deriveMerchant(seed,townId)`(×0.8), /api/town·/api/haggle 동일 적용. 검증: 표시 136건(할인56) 0실패 + 거래 8건 범위내. tsc/eslint 그린.
- **chore(favicon)**: `src/app/icon.png`을 Ashen Kingdom 로고(1024²)로 교체. /icon.png 200 확인.
- **fix(hydration)**: `<body>`에 `suppressHydrationWarning`. 원인=브라우저 확장(ColorZilla)이 body에 `cz-shortcut-listen` 주입(서버 HTML엔 0개, 앱 무관). 표준 해법.
