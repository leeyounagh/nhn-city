# 체크리스트 — Ashen Kingdom (망한 도시의 후계자)

구 「마지막 도시」에서 피벗(2026-07-19). [♻️]=재활용 완료분, [ ]=신규 필요.

## 0. 확정 (2026-07-19)
- [x] 화폐 = 골드 메인 + 변동 시세, 물물교환은 희귀템 전용
- [x] 추리 = 자유형 (코드 채점 없음)
- [x] 거래 협상 = 기존 멀티턴 흥정 UI 재사용
- [x] 맵 = 4마을 월드맵(노드) + 마을 진입 대화 화면 (걸어다니는 맵 폐기)
- [x] 규모 = 마을 4 / 상인 6 / 하루 1회 이동
- [x] 게임 제목 확정 = Ashen Kingdom (부제 「망한 도시의 후계자」)
- [ ] 리포 위치 / GitHub 공개여부

## P1. 진실 + 소문 (AI 별점) → 검증: 소문이 진실과 일관 + 크레딧 없이 폴백
- [x] 세계 진실 모델(코드, seed) — 매일 상인 6명 마을 배치 + 재고 + 원하는물품 + 이동여부
- [x] 마을 4개 정의 + 마을 간 이동일수
- [x] 소문 생성 라우트 — 코드가 흘릴 진실 조각 선별 → LLM이 자연어화(폴백 포함)
- [x] 단서 노트 상태/UI — 마을별 그룹 노트(ClueNotebook) + clues 상태·mergeClues·groupCluesByTown, 날 바뀌면 비움. (소문 수집 fetch 배선은 P2 마을 진입 UI에서 연결)
- [x] 정보 격리·인젝션 방어 프롬프트(소문이 진실 전체 유출 금지)
- [x] 검증(P1-2): tsc/eslint 그린 + /api/rumors 결정론·책레벨 게이팅·suspect·폴백 스모크 통과
- [x] 검증(P1-3): tsc/eslint 그린 + 홈 200. ⚠️ 노트 모달 시각 확인은 브라우저 e2e 불가로 미검(빈 노트 상태만 코드상 확인)

## P2. 이동 + 거래 → 검증: 이동으로 날짜/상인 갱신 + 거래 성사 e2e
- [x] 월드맵 UI(5노드=고향+4마을) + 이동일수만큼 날짜 진행 → 수입 정산 → 상인 재배치 (WorldMap.tsx, Game.travelTo)
- [x] 마을 진입 화면(상인 목록 + 여기서 들은 소문, 상인 선택→흥정) (TownView.tsx). 소문 자동 수집 fetch 배선 완료(P1-3에서 미룬 것)
- [x] 고향 건설 화면 이식 — BuildSitePanel 로직을 HomeView 건물 카드 리스트로 재구성(맵 배치 제거) (HomeView.tsx). P2-5 앞당김: travel 루프상 deposit/reclaim 미사용 방지 겸 플레이 가능성 확보
- [x] 거래 협상 — 일반 자재 골드 매매(변동 시세) [♻️ HaggleDialog 재사용] — startHaggle(merchant,materialId)로 배선됨, 흥정 자체는 기존 유지
- [x] 희귀템 물물교환(상인 원하는물품 내주고 획득) — PublicMerchant.wants 노출 + /api/haggle mode:"barter" 분기. 희귀템=tier3 전부, 지불=상인 wants 중 플레이어가 선택. 흥정 대화 재사용(N:1 교환비를 호감도로 깎음, 첫 턴 후 확정). wants 진위는 day로 서버 검증.
- [x] 검증(P2-2/3/5): tsc/eslint 그린(신규 파일 경고 0) + /api/town 스모크(마을당 상인 0~3·소문 2~3 결정론 분포 확인). ⚠️ 브라우저 e2e 불가로 이동·흥정 클릭 플로우는 코드상 확인
- [x] P2-6 아이소메트릭 건설맵 + 인스턴스 데이터 모델 (2026-07-20). built/progress → placements(Placement[]) 복수배치 모델. HomeView 삭제→IsoCityMap.tsx(7×7 다이아몬드 타일·팔레트·투입패널·줌).
- [x] P2-6 드래그 레이어 (2026-07-20). 건물 팔레트→빈타일 Pointer Events 드래그 배치 + 인벤토리 자재칩→건물 드래그 채우기 + 탭/클릭 경로 병존 + 줌 시 overflow 스크롤로 팬. 클릭 안내창=PlacementPanel.
- [x] P2-6 브라우저 시각검증 완료 (2026-07-20, playwright). 7×7 배치·건물 렌더 확인. (기존 "e2e 불가로 미검" 해소)
- [x] P2-7 월드맵 모달화 + 고향맵 auto-fit (2026-07-20). 인라인 월드맵→헤더 `🗺️ 이동` 모달(고향·마을 통일, 노드 클릭 시 이동+닫힘). 고향맵 전체폭 + ResizeObserver auto-fit(fitScale×zoom)으로 7×7 화면 최대. WorldMap.tsx 무수정 재사용. 브라우저 검증 통과.
- [x] P2-8 도움말 모달화 + 아이소맵 크기제한 해제 + 마우스 드래그 팬 (2026-07-20). 튜토리얼→오버레이 모달. auto-fit을 폭맞춤으로 바꿔 맵 확대(세로 오버플로 허용), 줌 상한 3. 보드 배경 마우스 드래그로 그 방향 팬(6px 임계·click 억제, 탭 배치 무영향). 브라우저 검증 통과.
- [x] P2-9 무한 타일 평면 + 카메라 팬 (2026-07-20). 고정 7×7 폐기 → 경계 없는 무한 아이소 평면(가시영역 가상화, 음수좌표). 드래그로 카메라 이동(타일이 드래그 방향으로 밀림). worldPos+pan 좌표계, ResizeObserver 뷰포트 컬링, 줌 중앙기준. 도움말 모달·배치·투입 로직 유지. 브라우저 검증(팬→좌표범위 이동·새 타일 생성·건물 배치) 통과.

## P3. 경제 / 뉴스 → 검증: 품귀·이벤트·특산이 시세에 반영
- [x] 물품 속성 — 기본가격 + 희귀도(tier) + 하한가 (economy PRICES, 기존)
- [x] 가격식 — 기본가 × 품귀배수 × 이벤트배수 × 마을배수 (하한 클램프). **P3-1 마을배수·P3-2 품귀·P3-3 이벤트 전부 완료**
- [x] 품귀 — 최근 구매량 → 시세 배수 상승, 이동으로 완화 (P3-2, 2026-07-20). scarcityMult=1+min(0.8,count×0.05), recentBuys 상태·이동 감쇠(3/day). 검증: 표시 101건 0실패 + 거래 단조 8건.
- [x] 마을 특산 업종 — 임업/광업/직물/유리세공 배정(기존) + **특산 할인(P3-1 ×0.8)**·재고 편향(60% 배치, 기존)
  - [x] P3-1 특산 할인 (2026-07-20). economy `townMultiplier` + `deriveMerchant(seed, townId)`, /api/town·/api/haggle 동일 적용(표시가=거래가). 검증: 표시 136건(할인56) 0실패 + 거래 8건 범위내.
- [x] 아침 뉴스 방송 — 하루 1회 팝업, LLM 헤드라인 + 코드 고정 %보정 (P3-3, 2026-07-20). /api/news + NewsModal, 폴백 헤드라인.
- [x] 대풍작/증산 이벤트 — 특정 마을 업종 물품 일시 폭락 → 차익 기회 (P3-3). dailyEvent(day) ~45%, 특산 ×0.5(할인과 겹쳐 ×0.4).
- [x] 검증: 연속구매 가격상승(P3-2 거래 단조) + 특산 할인(P3-1 136건) + 뉴스 %보정(P3-3 뉴스↔시세 231건 0실패) 전부 확인

## P4. 도시 건설 연결 + 생산 + 특수아이템 → 검증: 거래 자재로 건설·생산
- **설계 확정 (2026-07-20)**: (a) 생산 = 고정 산출, (b) 판매처 = 아무 상인, (c) 특수아이템 조건 = 흥정 호감도 임계 돌파(P4-3 확정 예정).
- [x] 거래로 모은 자재로 건설 [♻️ 건설·게이팅 로직 재사용] — P2 IsoCityMap deposit이 인벤토리 자재로 완공(이미 동작).
- [x] 생산 시스템 — 건물이 매일 물품 생산, 도시 발전 시 상위 생산품 해금 (P4-1, 2026-07-20). BuildingDef.produces 고정산출: 방앗간 천1·대장간 강철1(T1)·작업장 판자2(T2)·길드회관 대리석1(T3). dailyProduction 합산, 이동 시 ×days 인벤토리 정산. 검증: 팔레트 UI 라벨 + 로직 6케이스.
- [x] 생산품 용도 — 자급자족 + 잉여분 시세 판매(골드화) (P4-2, 2026-07-20). 아무 상인 판매: sellPrice=base×townMult×eventMult×0.5(<구매하한, 무한차익 차단). /api/town에 sellPrices, TownView 판매 패널. 검증: 서버 416건 0실패·차익차단 136건·브라우저 사서→팔기 루프(골드±·인벤토리).
- [x] 고호감도 특수 아이템 획득 → 특정 건물 요구 (P4-3, 2026-07-20). 새 자재 "상인의 신표"(token) — 흥정 호감도 ≥90 시 상인이 선물(1회), 구매·판매·물물교환 불가. 영주관·대성당이 token:1 요구. 검증: 서버 gotToken(≥90 지급·중복방지·저호감도 미지급·판매제외) + 건물 요구 데이터 + 클라 회귀없음.
- [x] landmark/won 승리 판정 제거 완료 (2026-07-20). 대성당은 목표가 아니라 income25·xp35 최고난도 건물. 정해진 끝 없음(오픈엔드).
- [x] 고향 건물 7→14개 확장 (2026-07-20). T0기초3/T1생활3/T2발전3/T3권위방어3/T4대업2, prereq 4단 사슬, minBook 게이팅. 기존 자재 13종 그대로.

## P5. 빌드·배포 + 산출물
- [ ] Vercel 배포 + 환경변수(ANTHROPIC_API_KEY)
- [ ] 처음 보는 사람 플레이 테스트 / 소스 키 노출 0
- [ ] 플레이어블 URL / 소스 GitHub
- [ ] 시연 영상 (소문→추리→이동→거래→건설 3~5분)
- [ ] 게임 소개서 / AI 활용 기술문서 (★ 2레이어·소문 추리·정보격리·인젝션방어)

## P6. 상인 정체성 + 영구 호감도 (v2 재설계, 2026-07-25~) → 검증: 재방문 호감도 유지·감쇠·페르소나 일관
- 배경: v1은 상인이 매일 새로 롤돼(`merchantSeed(day,i)`) 호감도 유지 대상이 매일 소멸. 상인에 영구 정체성 부여.
- **Sprint 1 — 상인 정체성 고정** (world.ts, economy.ts) ✅ 2026-07-25
  - [x] 영구 상인 24명(전문화 6×4) id별 고정 seed — spec·초상화·성별·외모 불변. `MERCHANTS[]`+`merchantIdentity(seed)`. `deriveMerchant`가 seed로 정체성 조회해 전문화 고정(rng 순서 보존=가격 결정론).
  - [x] `deriveWorld(day)` = 24명 결정론 셔플 후 6명 + 마을 배정. `WorldMerchant.id` 추가, `merchantSeed(day,i)` 제거.
  - [x] 초상화 고정 배선(buildPublicMerchant) + `reassignUniquePortraits` 제거(정체성 고정이라 불필요).
  - [x] 검증: tsc/lint 그린 + 시뮬(결정론 재현·200일 6명 중복없음·재등장 3.99일·등장 편향없음). ⚠️ 브라우저 실제 확인(마을 진입 시 고정 초상화·전문화)은 dev 서버 필요.
- **Sprint 2 — 호감도 영구 저장 + 감쇠** (game-state.ts, Game.tsx) ✅ 2026-07-25
  - [x] `GameState.merchantMemory{ [seed]: {disposition, lastDay, tokenTaken} }` (seed=정체성 키)
  - [x] 흥정 시작 = 저장값 + 감쇠(`decayedDisposition`, -5/일) 시드, 종료(buy·closeHaggle) = 저장
  - [x] 신표(≥90) 상인별 1회 재수령 차단(`tokenTaken` 시드/저장)
  - [x] 검증: tsc/lint 그린 + 감쇠 시뮬(당일0·4일-20·장기0클램프·과거일방어). ⚠️ 흥정→닫기→재흥정 유지·감쇠는 dev 서버 플레이로 확인
- **Sprint 3 — 관계 반영 대사** (prompt.ts, api/haggle) ✅ 2026-07-25
  - [x] 흥정 시스템 프롬프트에 호감도(disposition) 관계 문맥 주입 → 단골 대사(AI 활용↑). 25/50/75 구간별 태도(가격은 코드 소유, 태도만 연기).
  - [~] 페르소나 캐시 — **보류**: 이름·외모가 이미 정체성 고정이라 정체성 일관 확보됨. greeting/tone 캐시는 클라↔서버 왕복 복잡도 대비 효용 낮아 스킵(필요 시 후속).
- **Sprint 4 — 이벤트 상인** ✅ 2026-08-09 — 남은 초상화 12장(general/junker -5·-6) 활용, 떠돌이 상인 랜덤 등장→물물교환 흥정. (아래 "떠돌이 상인 이벤트" 섹션 참조)

## 재활용 자산 (구 빌드에서 그대로)
- [♻️] economy.ts — 가격·하한·티어·seed 상인·profile·호감도 수식
- [♻️] LLM 라우트 패턴 + 키워드 폴백 (llm.ts / prompt.ts)
- [♻️] HaggleDialog 멀티턴 UI + 초상화 A안(성향 랜덤 배정)
- [♻️] 마법의 책 정보 게이트 / 건설·게이팅 로직 (game-state.ts)
- [♻️] Next 스캐폴드 + 인트로 컷신

## 폐기/재해석
- [✂️] MapView 걸어다니는 2×2 맵 → 월드맵으로 대체. MapView.tsx 삭제 완료(2026-07-20).
- [✂️] HomeView(건물 카드 그리드) → IsoCityMap 아이소메트릭 맵으로 완전 대체. HomeView.tsx 삭제 완료(2026-07-20, P2-6).
- [✂️] 단일 상인 조우(summonMerchant 단건) → 다중 상인 마을 배치. Game.summonMerchant/spawnedRef/자동등장 effect/「다음 날」버튼 제거(시간은 이동으로 흐름).

## 미션 시스템 (2026-07-25 착수 · 첫 사용자 온보딩)

확장 가능한 데이터 주도 미션 + 범용 스포트라이트 코치마크. 진행은 GameState에서 파생(스텝 저장 X).

- [x] `src/lib/missions.ts` — Mission/MissionStep 타입 + MISSIONS 데이터 + `activeMission(state)`(순수). 첫 미션 "첫 집 짓기" 5단계.
- [x] 대상 표식 `data-coach` 4곳 — 이동버튼(GameFooter)·상인목록(TownView)·오두막카드(BuildingPalette)·배치된 오두막(IsoCityMap)
- [x] `src/shared/CoachMark.tsx` — 범용 스포트라이트. 대상 rect 추적(4스트립 딤·대상만 클릭통과)·화살표·말풍선·건너뛰기. 대상 없으면 중앙 말풍선.
- [x] `useGameEngine.ts` — `mission`(파생)·`missionDismissed`·`dismissMission` 노출. **GameState 불변**
- [x] `Game.tsx` — CoachMark 렌더(인트로 종료·도움말 닫힘·모달 없음·미dismiss 조건). 모달 열리면 코치 숨김(z 충돌 회피)
- [x] 검증 — tsc/eslint 그린 + dev 컴파일 클린. ⚠️ 이동→흥정→복귀→배치→완공 스포트라이트 추적은 브라우저 스모크 필요

## 지인 perk 확장 (Phase 3 · 2026-07-27 착수)

역할별 1 perk 교체 방식. 신규 perk 2종을 대목수·노상인에 배정(기존 income+15%·bookXp+20% 대체). 밸런스 소폭 이동 → 핸드오프 #2 재점검 대상.

- [x] `lib/allies.ts` — `AllyPerk`에 `haggleStart`(호감도)·`buildRebate`(환급%) 추가. builder→buildRebate 20%, merchant→haggleStart +15. perkLabel 갱신. `allyBonuses`가 `haggleStartBonus`·`buildRebatePct`도 반환.
- [x] `useGameEngine.startHaggle`/`startBarter` — 기억 있으면 `min(100, decayed+haggleStartBonus)`, 없으면 undefined(서버 시드). `sendUtterance` body에 `allyHaggleBonus` 전달(+deps에 state.placements).
- [x] `api/haggle/route.ts` — body에 `allyHaggleBonus?` 추가. 시드하는 첫 턴(disposition undefined)에만 `min(100, initial+bonus)`. 2턴+는 누적값 넘어와 중복 방지.
- [x] `useGameEngine.deposit`/`depositMax` — 완공 시 `floor(need×rebate%)` 자재를 인벤토리 환급(`buildRebate` 헬퍼). **build 이벤트 무상 투입은 제외**(원본 없음). 환급 시 notice에 표기.
- [x] 검증: tsc/eslint 그린. 결정론 API 확인 — 보너스 없음 호감도23 / +15 호감도38 / 2턴+ 중복 안 됨(28). ⚠️ dev 라이브 스모크(pop180 흥정·pop90 환급)는 pop 도달 필요 → 미실행.

## IndexedDB 진행 영속화 (2026-08-02 · origin 푸시) → 검증: 재접속 복원·리셋
설계 반전("매 로드 새 게임"→복원). 설계·용량은 `docs/indexeddb-persistence.md`.
- [x] `src/lib/persist.ts` — IndexedDB 단일 키 래퍼 `loadSave`/`writeSave`/`clearSave` + `normalizeSave`(버전·필드·placement 검증) + `SAVE_VERSION`. IDB 불가/실패는 try/catch로 조용히 폴백.
- [x] `useGameEngine` — 마운트 1회 로드→state+플래그 주입(`hydrated`까지 검은 커버), `[state·플래그]` 변경 500ms 디바운스 저장, `visibilitychange` 탭 숨김 flush, `resetGame`(clearSave+초기화). 저장 = GameState + 온보딩 플래그(alliesSeen·acked·missionDismissed·lastNewsDay).
- [x] `ResetConfirmModal` + 푸터 「새 게임」 버튼(확인 후 리셋).
- [x] 검증(playwright 실측): 하이드레이트 후 저장 존재 / day=5·gold=999 패치→리로드 복원 / 「새 게임」→day1·gold400 초기화 + 저장분 리셋. tsc/eslint 그린.

## 모바일 대응 (2026-08-02 · origin 푸시) → 검증: 375/619/900px 실측
- [x] 푸터 액션 버튼 `AuxButton` 아이콘화(md 미만 라벨 숨김·카운트 배지·aria-label, 「새 게임」 clockwiseRotation). 좁은 폭 세로 깨짐 해소, i18n 대비.
- [x] 모달 4종(BookCodex·Tutorial·상인패널(TownView Modal)·HaggleDialog) 바텀시트→중앙정렬(`items-center p-4`)+`dvh`+전체 라운드. 상하 공백 대칭.
- [x] BookCodex 흥정 기술 칩 모바일 리스트(`space-y-1.5 sm:flex sm:flex-wrap`).
- [x] 흥정창 대화 로그에 흐린 상인 초상화 CSS 배경(그라디언트 페이드·스크롤 고정·`sm:!bg-none`).
- [x] 흥정 입력 포커스 이중 테두리 제거(래퍼 `focus-within:border-amber-600` 삭제 — 전역 unlayered `:focus-visible`와 겹침).
- [x] 검증: 375(칩 리스트·버튼 1줄)·619(모달 상하 대칭)·900(라벨 복귀·회귀 없음) 실측, tsc/eslint 그린.

## 모바일 고향맵 세로 공간 + 터치 조작 (2026-08-08) → 검증: 390×620 터치 실측
- [x] 터치 팬 — `useIsoCamera.startPan` 마우스 전용 가드 제거, 한 손가락 드래그로 맵 팬(탭-배치/선택 유지). 실측: 타일 (195,205)→(285,245) 드래그 델타 일치.
- [x] 핀치줌 — 두 손가락 거리비로 scale 조정(중점 기준). 헤더 ±버튼 폴백 유지. 실측: 120%→300%.
- [x] 푸터 보조 6버튼(마을=+창고) 모바일 `⋯` 오버플로 메뉴로 접기. 데스크톱은 인라인 유지.
- [x] CoachMark가 보이는 요소만 매칭(`getClientRects().length` 스킵) → 모바일 `⋯`가 `mission-list-btn` target을 정확히 가리킴.
- [x] **(추가 발견) 보드 2px 진짜 원인 = 팔레트 254px + 헤더 104px.** 제자리 압축: 헤더 힌트 모바일 숨김+한줄, 카테고리 탭 가로 스크롤(줄바꿈 제거), 인벤토리·카드 압축. 보드 2→126px, 헤더 104→28, 팔레트 254→186.
- [x] 검증: 390(터치 팬·핀치줌·탭 배치 0→1·⋯ 팝업 6항목·항목 클릭)·900(마우스 팬·인라인 복귀·⋯ 숨김), tsc/eslint 그린.

## 모바일 아이소맵 — 접이식 팔레트 시트 + 팔레트 터치 드래그 (2026-08-08, 이어서)
- [x] **팔레트 터치 드래그 배치** — `startBuildingDrag`·`stripPointerDown`의 마우스 전용 가드 제거. 기존 방향 판정(가로=스크롤/세로=드래그) 재사용. 실측: 세로 드래그로 우물 배치 1→2, 가로 스와이프는 스크롤(0→120)·배치 오인 없음.
- [x] **접이식 팔레트 시트(모바일)** — 기본 접힘 → 보드 최대. "건설할 건물 ▴" 핸들로 펼침, 카드 고르면 자동 접힘. 데스크톱(sm+)은 상시 노출(무영향). 실측 보드 126→**282px**(접힘).
- [x] **온보딩 무결** — `Game.tsx`가 `forcePaletteOpen={mission.objective.coach==='mission-palette-hut'}` 전달 → 오두막 배치 안내 단계에선 시트 강제 오픈(코치가 카드 정확히 지목). 채우기(mission-hut)는 보드 대상이라 시트 무관. 인벤토리 칩 코치 없음 확인.
- [x] 검증: 390(접힘 282px·핸들 토글·카드탭 자동접힘·탭배치 0→1·드래그배치 1→2·가로 스크롤)·900(핸들 숨김·팔레트 상시), tsc/eslint 그린.

## 모바일 월드맵 — 상단 정렬 + 화면 꽉 채우기 (2026-08-08, 이어서)
- [x] 모달 상단 여백 축소 — `WorldMapModal` dialog `mt-16`→`mt-4 sm:mt-16`. 모바일 콘텐츠가 위로 올라옴(top 80→32px).
- [x] 세로 꽉 채우기 — 모바일 dialog를 `h-[calc(100dvh-3rem)] flex-col`(데스크톱 `sm:block sm:h-auto`), WorldMap `section flex h-full flex-col`(`sm:h-auto`)·`nav flex-1`로 남는 높이를 맵이 차지(nav 524→598px). 그리드 `grid-rows-3`(1fr)이 늘어나며 노드가 세로로 벌어짐.
- [x] 검증: 412×760(top32·nav598·오버플로X)·390×620(top32·잘림X)·900(mt-16·block·auto 복귀 회귀X), tsc/eslint 그린.

## 떠돌이 상인 이벤트 (2026-08-09) → 검증: 서버 curl + playwright(데스크톱/모바일)
- [x] `/api/event-merchant` — 그날 tier3 파는 실상인 1명을 결정론적 선택 → "떠돌이 상인" 스킨(이름·초상 풀·AI 인사) 반환. seed·materials·wants는 실상인이라 흥정 검증 통과. book Lv3 게이팅(relic/blueprint).
- [x] 초상화 = 미사용 12장 중 general-5/6·junker-5/6 풀(day-hash로 얼굴 변화). 새 아트 불필요.
- [x] 트리거 = `passDay` 시 `allyHash(day,11)<0.12`. 고향 하루넘기기 전용. 영속 제외(휘발).
- [x] `EventMerchantModal`(프린세스메이커풍) — 초상화+말풍선+권유 희귀템+[흥정한다]/[돌려보낸다]. 모바일 세로·데스크톱 초상화좌+말풍선우.
- [x] [흥정한다] → `startBarter`(기존) → 물물교환 흥정창. 서버 검증 통과(에러 0). [돌려보낸다] → 닫힘.
- [x] 검증: day5(relic·석재)·day13(청동·판자) 등장, AI 인사 생성, 흥정 성사, bookLv1 게이팅(day2=null), 콘솔 0.
