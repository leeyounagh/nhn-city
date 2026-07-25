# 핸드오프 — Ashen Kingdom (망한 도시의 후계자)

다음 세션/개발자가 바로 이어받도록 정리한 인수인계 문서. 최종 갱신 2026-07-25.

## 0. 다음 세션 시작점 (여기부터 — 먼저 읽기)

**끝난 상태 (2026-07-25 종료)**: 상인 영구 정체성·호감도 지속·슬라이딩 체류·소문 정합·호감도 UI·단골 대사, 초상화 36장, 건물 확장(성14·교회4 + 카테고리 탭), 생산 뉴스 모달, **대규모 리팩토링(Game.tsx 930→72, 로직은 `hooks/useGameEngine.ts`)** 까지 완료. **로컬 커밋만 — `git push` 안 됨.** 워킹 트리 깨끗.

**바로 할 것 (순서대로)**
1. **dev 스모크 검증** — 리팩토링이 큰 이동이라, 새로고침 후 화면·흥정·건설·모달·이동이 **이전과 똑같이** 동작하는지 확인(리팩토링이라 동일해야 정상). 이상 시 리팩토링 커밋(`5ab93f6`·`d2a831b`·`b980db0`) 의심.
2. **경제모델 §5 문서 동기화** — 성14·교회4가 코드엔 있으나 `docs/경제모델.md §5`에 **미반영**(문서-코드 갭). 성/교회 건물군을 §5에 추가 기술.
3. **IsoCityMap 리팩토링** (§7-1) — 814줄. `useIsoCamera` 훅(드래그/팬/줌/뷰포트 컬링) + 팔레트(BuildingPalette·PaletteCard) 파일 분리. **Game 리팩토링과 동일 패턴**(로직 훅 + UI 조각).

**정할 것 (사용자에게 물어볼 것)**: ① 원격 push 여부(`github.com/leeyounagh/nhn-city`) ② 밸런스 자재공급 심화(§7-2) 착수 여부.

**작업 원칙**: 게임 로직은 `useGameEngine.ts`에서(Game.tsx 아님) · 커밋/푸시는 사용자 요청 시만 · 코드/문서 변경 전 승인 · AI 경로(페르소나·흥정·초상화) 정적으로 깎지 말 것.

## 1. 프로젝트 개요
- **무엇** — NHN NAN 2026 게임×AI 해커톤 사전과제. LLM 밀실 추리형 도시 재건 게임.
- **마감** — 2026-08-10.
- **핵심** — 소문으로 상인을 추리하고 자연어 흥정으로 자재를 싸게 사서 폐허 고향에 도시를 재건. **판정·수치는 코드, 소문·연기·발언분류만 LLM** (2레이어 격리).
- **스택** — Next.js 16 App Router(특수 버전, ⚠️ 아래 참조), React 19, Tailwind v4, TypeScript, pnpm, Anthropic API(서버 라우트 전용, 키 없으면 키워드 폴백), zod.

## 2. ⚠️ 반드시 지킬 것
- **Next.js 16은 학습데이터와 다른 특수 버전.** 코드 작성 전 `node_modules/next/dist/docs/` 관련 가이드를 읽어라 (루트 `AGENTS.md` 지침).
- **`settings.json`의 model은 별칭("opus" 등) 유지** — 버전 픽스 금지.
- **커밋/푸시는 사용자 요청 시에만.** 커밋 트레일러: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` + `Claude-Session: ...`.
- **아트/애니 프레임은 사용자가 직접 제작.** 코드/교체 슬롯만 담당.
- **AI 활용 경로(초상화·페르소나·흥정 대사)를 정적 지름길로 깎지 말 것.**

## 3. 실행 & 검증
```bash
# dev 서버 (localhost:3000)
pnpm dev
# 타입체크 (완료 선언 전 필수)
npx tsc --noEmit
# 린트 (게임 스프라이트용 <img>의 @next/next/no-img-element 경고는 의도된 것 → 무시)
npx eslint <files>
```
- **결정론 API 검증** — dev 서버에 node .mjs fetch 스크립트로 economy/haggle 응답 확인(같은 seed=같은 결과).
- **브라우저 검증** — `playwright-cli`(스킬). 세션 예: `playwright-cli -s=iso open http://localhost:3000/`.
  - 타이틀→게임 진입: START GAME은 시맨틱 버튼이 아니라 snapshot에 안 잡힘 → JS eval 클릭 또는 하단 "건너뛰기". 이후 오프닝 스토리 오버레이의 "건너뛰기"가 클릭을 막으니 그것부터 스킵 → "튜토리얼 닫기" → "이동" → 마을 노드 → "뉴스 닫기" 순. (타이틀·스토리에 "건너뛰기"가 둘 다 있어 타이밍 주의.)
  - 실좌표 클릭 필요: 타일 히트영역은 clip-path 다이아라 DOM `.click()`은 오차. 좌표 기반 클릭 사용.

## 4. 2레이어 아키텍처 (핵심 파일)
- **서버 전용 진실** — `src/lib/server/economy.ts`(가격·상인 스펙·성향·호감도Δ·흥정식·초상화풀·**`MERCHANTS` 영구 24명 정체성**·`merchantIdentity`·`canBarter`), `src/lib/server/world.ts`(**24명 슬라이딩 체류→하루 6명 등장·`daysLeft`**), `src/lib/server/rumor.ts`(소문 신선도·위치필터), `src/app/api/*`(haggle/town/news/book-advice).
- **클라 공개 데이터** — `src/lib/game-data.ts`(자재·건물·`BuildingDef.category`·`BUILDING_RENDER_SCALE`·`TOWN_ICON`), `src/lib/game-state.ts`(GameState·**`merchantMemory`·`decayedDisposition`·`dispositionRank`**·생산·게이팅).
- **로직 훅** — `src/hooks/useGameEngine.ts`(클라 상태 소유 + 서버 호출 + 모든 액션, `GameEngine` 타입 export). ⚠️ **게임 로직은 여기**, `Game.tsx`는 렌더 조립만(72줄).
- **UI** — `src/components/Game.tsx`(얇은 조립: 메인영역 + `<ModalStack>` + `<GameFooter>`), `src/components/game/`(`modals/`=NewsModal·RelationsModal·WorldMapModal·Tutorial, `hud/`=ResChip·GameFooter, `ModalStack.tsx`), 홈맵 `IsoCityMap.tsx`(⚠️ 814줄, 리팩토링 대상), 마을 `TownView.tsx`+`TownIsoPreview.tsx`, 상인 `MerchantPanel.tsx`+`HaggleDialog.tsx`, `BookCodex.tsx`, `GameIcon.tsx`(game-icons SVG 19종).
- **데이터 명세** — `docs/경제모델.md`(구현 반영, §2.4 상인 v2), `docs/기획서.md`.

## 5. 자산 파이프라인
- **건물 스프라이트** — itch "Isometric Realm — Medieval" by JP Cummins(구매, README 크레딧 필수). 원본 고해상 → PowerShell `System.Drawing`으로 max ~400~512px 다운스케일 → `public/buildings/{id}.png`. `buildingSprite(id)`가 id→png 매핑.
- **UI/재료 아이콘** — ChatGPT 생성 이미지 또는 팩 재활용 → `public/ui/`, `public/materials/{materialId}.png`.
- **배경 투명화** — ChatGPT 이미지에 흰/회색 배경이 남으면 PowerShell **가장자리 flood-fill(region-grow, tol~50-70)** 로 투명 처리(이전 세션 스크립트 참고: LockBits + 스택 BFS). 코너 알파=0으로 검증.
- **크기 조정** — `BUILDING_RENDER_SCALE`(game-data)는 **전역**(홈맵+마을 미리보기 공용). 특정 스프라이트만 키/줄일 때 사용. 같은 키를 여러 마을이 공유하니 주의(예: tree 0.2는 모든 곳에 적용).

## 6-1. 최근 세션 (2026-07-25 · 진입 UX + 아이콘 + 폴백 다양화)
- **인트로 진입 깜빡임 제거** — `Game.tsx`. `showIntro`가 `useEffect`(페인트 후)에서 켜져 메인 화면이 한 프레임 노출되던 문제. `useLayoutEffect`로 판정하고, `showIntro`를 `boolean|null` 3-state로 바꿔 판정 전(null)엔 검은 풀스크린 커버(`fixed inset-0 z-[60] bg-black`)를 덮어 SSR HTML 노출 갭까지 차단. 첫 진입: 커버→인트로, 재방문: 커버→게임(메인 flash 없음).
- **잔여 이모지 → GameIcon SVG** (§7-1 완료) — game-icons.net(CC BY 3.0)에서 7종 추출·추가: `newspaper`·`factory`·`handTruck`·`clockwiseRotation`·`trashCan`·`paintBrush`·`padlock`. 교체 8곳: 뉴스 헤더(Game), 생산·이동안내·이동/회전/삭제 버튼·장식 해금(IsoCityMap), 책 잠금(BookCodex). 물물교환 헤더는 이미 `trade`, "A ↔ B" 관계 구분자·`✕`·`✓`·초상화/건물 폴백 이모지는 의도적 유지.
- **파비콘 교체** — `src/app/icon.png`를 Ashen Kingdom A 엠블럼으로(1024→512 다운스케일, 534KB). App Router 파일 규약이라 코드 변경 없음.
- **AI 폴백 데이터 다양화** — 페르소나·흥정대사·소문·헤드라인·책조언 폴백을 "변형 배열+결정론 선택(`variant`)"으로 104개 확장. `context-notes.md` "폴백 확장" 참조.
- **상인 영구 정체성 + 호감도 지속 (v2, 대작업)** — 하루살이 상인 → **영구 24명**(전문화6×4, id별 고정 seed로 전문화·초상화·성별·이름·외모 불변). `deriveWorld`는 **6슬롯 슬라이딩 체류**(각 슬롯 4명을 5일씩 순환, `daysLeft` 분산). 호감도는 `GameState.merchantMemory`에 **영구 저장+감쇠(-5/일)**, 신표 상인별 1회. 소문 정합: **위치=최신(100% 존재)/오래된소식(stale 뱃지)**, **wants=물물교환 가능 상인만**, 외견으로 상인 지칭(AI 없이 추리). 호감도 UI(MerchantPanel 배지 + 관계명부 모달). 단골 대사(흥정 프롬프트에 호감도 문맥). → `context-notes.md`·`project_ashen_merchant_loyalty` 메모리.
- **상인 초상화 36장** — 미드저니 소프트애니(`--niji 6`), `public/merchants/{id}-1..6.png`. 24장 정체성 고정, 12장 이벤트 상인 예약.
- **건물 확장** — 성 14·교회 4 신규(`castle`/`church` category). `BuildingDef.category`(core/commerce/tower/church/castle) + 팔레트 하단 **카테고리 탭**. marble 밸런스 조정(성 70→20, 석재 위주). 밸런스 시뮬 스크립트(`game-data.ts` 파싱)로 검증.
- **생산 뉴스 모달** — 아침 뉴스(NewsModal)에 "오늘의 생산" 섹션(이동×일수/하루넘기기×1).
- **대규모 리팩토링** — `Game.tsx` **930→72줄**. 로직 → `hooks/useGameEngine.ts`(상태+액션, `GameEngine` 타입 export), UI 조각 → `components/game/`(`modals/`·`hud/`·`ModalStack.tsx`). engine 객체를 통째로 넘겨 props 폭증 방지.

## 6. 이전 세션 (2026-07-22, 커밋됨 · UI 대개편 + 신규 기능)
UI를 "웹앱"에서 "다크 판타지 게임"으로. ChatGPT 화면별 비평을 받아 순차 반영, 매 단계 tsc + playwright 검증.
- **rope(밧줄) 재료 추가** — T1(8/5). types·MATERIALS·economy PRICES·상인풀(직물잡화상·만물상)·직물 마을 특산·건물 레시피(우물/노점/시장/성벽/망루) 6곳 연동. 아이콘 `public/materials/rope.png`. cloth "천·밧줄"→"천". `경제모델.md` 갱신. → **재료 추가 6곳 패턴은 `context-notes.md` 참조**.
- **마법의 책 열람 모달**(`BookCodex.tsx`) — 푸터 책 칩 클릭 → 레벨 해금·흥정 카테고리·성향 4종. 책 펼침 애니(perspective+rotateX). + **AI 조언 라우트**(`/api/book-advice`) — 책 Lv2+에서 LLM이 상인 성향(+Lv3 약점)을 인게임 조언으로 읊음(키 없으면 폴백). MerchantPanel에 표시.
- **단일화면 레이아웃** — 고향·마을 모두 `h-screen overflow-hidden flex-col`, 맵/콘텐츠 `flex-1`, 세로 스크롤 제거. 푸터 fixed→flex 자식(전체폭).
- **HUD 재설계** — 버튼 위계 색으로(하루넘기기=금색 주액션), indigo 제거. tabular-nums.
- **초록 제거** — 고향 패널·마을 미리보기 배경(TOWN_BG) → stone+안개 비네트. 초록은 성공상태(수입·완공)만.
- **월드맵 재설계** — 카드→원형 지역 노드(허브 펄스·빛나는 길·지역색·안개그리드).
- **폰트 역할 정리** — 명조(Cinzel+Song Myung)는 세계관 문구(로고·지명·마법의책·월드맵)만, 게임정보 UI는 Sans.
- **이모지 → game-icons SVG 통일**(`GameIcon.tsx`, 12종, CC BY 3.0) — HUD·월드맵·마을뷰·책·건설. 인라인 SVG currentColor 틴트, 의존성 0.
- **도움말 모달** — 파란 패널→고서 톤, 번호목록→카드 5장(세계관 프레이밍).
- **마을뷰** — 미리보기 상단 고정·축소(반응형 34vh), 상인/소문/판매만 내부 스크롤. **모바일 아이소맵 잘림 수정**(auto-fit 1회→리사이즈·마을변경마다 재정렬).
- **상인 패널** — 딤 완화·모달 밝게, 실제 초상화·이름 확대, 거래행 버튼화, 닫기 헤더 내장, 책 축소.
- **흥정창** — 현재가에 기준가·할인폭(▼N), 호감도 게이지+기분, 왼쪽 마법의 책 분석 카드(성향·약점 Lv2/3 단계 공개), 입력+제안 통합·수량 스테퍼.

## 7. 남은 일 (우선순위 순)
1. **IsoCityMap 리팩토링** — 814줄에 아이소맵 렌더+팔레트+드래그/카메라가 뒤엉킴. 카메라/드래그 → `useIsoCamera` 훅, 팔레트(BuildingPalette·PaletteCard) → 별도 파일. (Game.tsx 리팩토링의 연장, 다음 타깃)
2. **밸런스 시뮬 심화** — 골드 곡선은 OK(62일 클리어). **진짜 병목은 고급자재 물리 공급**(marble 63·bronze 66)이 상인 재고(재등장4일×1~3)+생산으로 감당되는지. 시뮬 스크립트(`game-data.ts` 파싱, scratchpad)에 **상인 공급 모델 추가** 필요. 성 bronze 34도 관찰 대상.
3. **마을뷰 심화** — 마을 이미지 정보 오버레이(상인 N·소문 N), 소문/판매 탭(모바일), 상인 카드 정보. (오버레이 배지도 GameIcon)
4. **승리 조건/엔딩 화면** — 미구현(오픈엔드, 대성채/대성당이 최고난도).
5. **P5 산출물** — Vercel 배포(ANTHROPIC_API_KEY 필요 — 없으면 AI 폴백), 데모 영상, 게임 소개·AI 기술문서.
6. **아트** — 이벤트 상인 초상화 12장(남은 슬롯), 애니 프레임(사용자 제작).
7. **미완결 스프린트** — 페르소나 캐시(보류, checklist P6 Sprint 3): 이름·외모는 고정됐으나 greeting/tone은 마을 재진입마다 재생성. 필요 시 클라 캐시.

## 8. 알아둘 함정
- 모달이 타일/스프라이트에 덮이는 문제 → 부모에 `isolate`(isolation:isolate)로 스택 컨텍스트 격리(모달 z-40 아래로 자식 z 가둠). IsoCityMap boardArea, TownIsoPreview 루트에 적용됨.
- 타일 클릭이 한 칸 앞으로 잡힘 → 버튼 style에 clip-path 다이아 넣어 히트영역 클립(해결됨).
- 대풍작 이벤트는 슬라이딩 윈도우(지속 4일 ≥ 최대 이동거리 3)라 뉴스 듣고 이동해도 유효.
- 「상인의 신표」(token)는 구매·판매 불가 — 호감도 ≥90 흥정 보상 전용. 「대건축가의 설계도」(blueprint)는 확률 6%·Lv3 잠금, 보유 시 장식 배치 해금.
- GitHub 리모트: `github.com/leeyounagh/nhn-city` (master). 과거 `public/sprites` 41MB 데드 에셋은 히스토리에서 제거됨(.gitignore에 `/public/sprites/`).
- **게임 로직은 `Game.tsx`가 아니라 `hooks/useGameEngine.ts`** — 액션·상태 수정은 여기서. Game.tsx는 렌더 조립만.
- **상인 정체성**: `deriveMerchant(seed)`가 `merchantIdentity(seed)`로 자동 조회해 전문화·초상화를 고정(rng 소비 순서는 보존). 새 상인/전문화 추가 시 `MERCHANTS`(economy.ts)와 초상화 `{id}-n.png`를 함께 손봐야.
- **슬라이딩 체류 period 경계**: 소문 위치는 `daysLeft>3`인 상인만 흘려 100% 존재 보장. 이 필터를 건드리면 "소문 보고 갔는데 없음" 버그가 재발할 수 있음.
- **HMR 상태 보존 주의**: `GameState`에 필드 추가 시 dev 중이면 옛 state에 그 필드가 없어 런타임 에러. 접근 시 `?.`/`?? {}` 방어 + 하드 새로고침.
- **단일화면 레이아웃 규칙(UI 대개편 후)** — 루트 `h-screen overflow-hidden flex-col`, 맵/콘텐츠 `flex-1 min-h-0`, 나머지 `shrink-0`. 페이지는 절대 스크롤 안 함(콘텐츠 내부만). 새 화면도 이 규칙 유지.
- **아이콘** — 이모지 대신 `GameIcon`(game-icons.net CC BY 3.0). 새 아이콘 필요 시 `/tmp/gi.json`(github 트리) 또는 재다운로드 → 배경 rect(`M0 0h512v512H0z`) 다음 path 추출 → `GameIcon.tsx` PATHS에 추가. currentColor라 `text-amber-400` 등으로 틴트.
- **폰트** — `font-display`(Cinzel+Song Myung)는 세계관 문구(로고·지명·마법의책·월드맵)에만. 섹션 제목·카드·버튼은 Sans. 남발 금지.
- **TownIsoPreview auto-fit** — `interactedRef`로 팬/줌 전까지 리사이즈·마을변경마다 재정렬(모바일 잘림 방지). 팬/줌하면 고정.
- **색 역할** — 배경 stone, 강조/골드 amber, 마법 sky, 성공 emerald, 위험 rose. 초록은 성공 상태에만(패널 배경 금지).
