# 핸드오프 — Ashen Kingdom (망한 도시의 후계자)

다음 세션/개발자가 바로 이어받도록 정리한 인수인계 문서. 최종 갱신 2026-07-22.

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
- **서버 전용 진실** — `src/lib/server/economy.ts`(가격·상인 스펙·성향·호감도Δ·흥정식·초상화풀·`getProfileHint`/`getWeaknessHint`), `src/lib/server/world.ts`(일별 상인 6명 생성·마을 배치), `src/app/api/*`(haggle/town/news/**book-advice** 라우트).
- **클라 공개 데이터** — `src/lib/game-data.ts`(자재·건물·마을·상수·`BUILDING_RENDER_SCALE`·`TOWN_ICON`·`BOOK_XP_THRESHOLDS`), `src/lib/game-state.ts`(GameState·생산·게이팅·`homeIcon`).
- **UI** — `src/components/*`. 오케스트레이터 `Game.tsx`(상태 소유·푸터HUD·모달들·Tutorial), 홈 아이소맵 `IsoCityMap.tsx`, 마을 `TownView.tsx`+미리보기 `TownIsoPreview.tsx`, 상인 `MerchantPanel.tsx`+흥정 `HaggleDialog.tsx`, 마법의 책 `BookCodex.tsx`, 재료 아이콘 `MaterialIcon.tsx`, **UI 아이콘 `GameIcon.tsx`(game-icons SVG 12종, currentColor)**.
- **데이터 명세** — `docs/경제모델.md`(구현 반영), `docs/기획서.md`.

## 5. 자산 파이프라인
- **건물 스프라이트** — itch "Isometric Realm — Medieval" by JP Cummins(구매, README 크레딧 필수). 원본 고해상 → PowerShell `System.Drawing`으로 max ~400~512px 다운스케일 → `public/buildings/{id}.png`. `buildingSprite(id)`가 id→png 매핑.
- **UI/재료 아이콘** — ChatGPT 생성 이미지 또는 팩 재활용 → `public/ui/`, `public/materials/{materialId}.png`.
- **배경 투명화** — ChatGPT 이미지에 흰/회색 배경이 남으면 PowerShell **가장자리 flood-fill(region-grow, tol~50-70)** 로 투명 처리(이전 세션 스크립트 참고: LockBits + 스택 BFS). 코너 알파=0으로 검증.
- **크기 조정** — `BUILDING_RENDER_SCALE`(game-data)는 **전역**(홈맵+마을 미리보기 공용). 특정 스프라이트만 키/줄일 때 사용. 같은 키를 여러 마을이 공유하니 주의(예: tree 0.2는 모든 곳에 적용).

## 6. 이번 세션에서 한 것 (2026-07-22, 커밋됨 · UI 대개편 + 신규 기능)
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
1. **잔여 이모지 마무리** — 핵심 UI는 game-icons로 끝났으나 소소한 곳 남음: 뉴스 📰, 생산 🏭, 건물 이동/회전/삭제 버튼(🚚↔🗑), 책 잠금 🔒, 물물교환/장식. 아이콘 경로 찾다 인터럽트로 중단됨. `game-icons.net` 트리 json은 `/tmp/gi.json`(재다운로드 가능), 추출 스크립트 패턴은 이 세션 참고.
2. **마을뷰 심화** — 마을 이미지 정보 오버레이(👥 상인 N·💬 소문 N), 소문/판매 탭(모바일), 상인 카드 정보(보유품목/호감도).
3. **밸런스 시뮬** — 하한가 플레이 총비용 vs 시작자금(400)·수입 곡선으로 N일 클리어 가능성 검증. rope 추가로 T1 수요 약간↑. `경제모델.md §8` 참조.
4. **승리 조건/엔딩 화면** — 미구현(오픈엔드, 대성당이 최고난도 건물).
5. **P5 산출물** — Vercel 배포(ANTHROPIC_API_KEY 필요 — 없으면 AI가 폴백), 데모 영상, 게임 소개·AI 기술문서.
6. **아트** — 초상화 풀 확충(아키타입당 1장), 애니 프레임(사용자 제작).

## 8. 알아둘 함정
- 모달이 타일/스프라이트에 덮이는 문제 → 부모에 `isolate`(isolation:isolate)로 스택 컨텍스트 격리(모달 z-40 아래로 자식 z 가둠). IsoCityMap boardArea, TownIsoPreview 루트에 적용됨.
- 타일 클릭이 한 칸 앞으로 잡힘 → 버튼 style에 clip-path 다이아 넣어 히트영역 클립(해결됨).
- 대풍작 이벤트는 슬라이딩 윈도우(지속 4일 ≥ 최대 이동거리 3)라 뉴스 듣고 이동해도 유효.
- 「상인의 신표」(token)는 구매·판매 불가 — 호감도 ≥90 흥정 보상 전용. 「대건축가의 설계도」(blueprint)는 확률 6%·Lv3 잠금, 보유 시 장식 배치 해금.
- GitHub 리모트: `github.com/leeyounagh/nhn-city` (master). 과거 `public/sprites` 41MB 데드 에셋은 히스토리에서 제거됨(.gitignore에 `/public/sprites/`).
- **단일화면 레이아웃 규칙(UI 대개편 후)** — 루트 `h-screen overflow-hidden flex-col`, 맵/콘텐츠 `flex-1 min-h-0`, 나머지 `shrink-0`. 페이지는 절대 스크롤 안 함(콘텐츠 내부만). 새 화면도 이 규칙 유지.
- **아이콘** — 이모지 대신 `GameIcon`(game-icons.net CC BY 3.0). 새 아이콘 필요 시 `/tmp/gi.json`(github 트리) 또는 재다운로드 → 배경 rect(`M0 0h512v512H0z`) 다음 path 추출 → `GameIcon.tsx` PATHS에 추가. currentColor라 `text-amber-400` 등으로 틴트.
- **폰트** — `font-display`(Cinzel+Song Myung)는 세계관 문구(로고·지명·마법의책·월드맵)에만. 섹션 제목·카드·버튼은 Sans. 남발 금지.
- **TownIsoPreview auto-fit** — `interactedRef`로 팬/줌 전까지 리사이즈·마을변경마다 재정렬(모바일 잘림 방지). 팬/줌하면 고정.
- **색 역할** — 배경 stone, 강조/골드 amber, 마법 sky, 성공 emerald, 위험 rose. 초록은 성공 상태에만(패널 배경 금지).
