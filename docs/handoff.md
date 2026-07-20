# 핸드오프 — Ashen Kingdom (망한 도시의 후계자)

다음 세션/개발자가 바로 이어받도록 정리한 인수인계 문서. 최종 갱신 2026-07-21.

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
- **서버 전용 진실** — `src/lib/server/economy.ts`(가격·상인 스펙·성향·호감도Δ·흥정식·초상화풀), `src/lib/server/world.ts`(일별 상인 6명 생성·마을 배치), `src/app/api/*`(haggle/town/news 라우트).
- **클라 공개 데이터** — `src/lib/game-data.ts`(자재·건물·마을·상수·`BUILDING_RENDER_SCALE`·`TOWN_ICON`), `src/lib/game-state.ts`(GameState·생산·게이팅·`homeIcon`).
- **UI** — `src/components/*`. 오케스트레이터 `Game.tsx`(상태 소유), 홈 아이소맵 `IsoCityMap.tsx`, 마을 `TownView.tsx`+미리보기 `TownIsoPreview.tsx`, 상인 `MerchantPanel.tsx`+흥정 `HaggleDialog.tsx`, 재료 아이콘 `MaterialIcon.tsx`.
- **데이터 명세** — `docs/경제모델.md`(구현 반영), `docs/기획서.md`.

## 5. 자산 파이프라인
- **건물 스프라이트** — itch "Isometric Realm — Medieval" by JP Cummins(구매, README 크레딧 필수). 원본 고해상 → PowerShell `System.Drawing`으로 max ~400~512px 다운스케일 → `public/buildings/{id}.png`. `buildingSprite(id)`가 id→png 매핑.
- **UI/재료 아이콘** — ChatGPT 생성 이미지 또는 팩 재활용 → `public/ui/`, `public/materials/{materialId}.png`.
- **배경 투명화** — ChatGPT 이미지에 흰/회색 배경이 남으면 PowerShell **가장자리 flood-fill(region-grow, tol~50-70)** 로 투명 처리(이전 세션 스크립트 참고: LockBits + 스택 BFS). 코너 알파=0으로 검증.
- **크기 조정** — `BUILDING_RENDER_SCALE`(game-data)는 **전역**(홈맵+마을 미리보기 공용). 특정 스프라이트만 키/줄일 때 사용. 같은 키를 여러 마을이 공유하니 주의(예: tree 0.2는 모든 곳에 적용).

## 6. 이번 세션에서 한 것 (커밋됨)
- 마을 아이소 미리보기(9×9) + 4마을 씬(유리섬 요새/무쇠고개 농촌/베틀마을 장터/삼목골 숲).
- 지을 수 있는 건물 대폭 확장 — 상업(노점·상점·선술집·시장군)·방어 타워. (기존 14 → 약 31 + 장식 7)
- 고향 「하루 넘기기」(이동 없이 하루 정산), 완성도 진화 고향 아이콘.
- 이모지 → 이미지 교체(이동/하루넘기기/마법의책/단서노트/창고/건설), 마을 대표 썸네일.
- 재료 15종 아이콘(팩 4종 재활용 + ChatGPT 11종) + UI 연결.
- 건물 팔레트 마우스 좌우 드래그 스크롤(축 분리: 가로=스크롤, 세로=배치).
- `경제모델.md`·`기획서.md` 구현 반영 갱신.

## 7. 남은 일 (우선순위 순)
1. **재료 종류 확장 마무리** — 사용자가 재료 아이콘까지 준비. **새 재료를 건물 레시피·economy 가격표·마을 특산·상인 풀에 연동**하는 작업이 남음(현재는 아이콘만/기존 15종). "나중에 확장" 합의됨.
2. **밸런스 시뮬** — 하한가 플레이 총비용 vs 시작자금(400)·수입 곡선으로 N일 클리어 가능성 검증 후 수치 조정. `경제모델.md §8` 참조.
3. **승리 조건/엔딩 화면** — 현재 미구현(대성당 등 최상위 건물이 목표 역할만).
4. **P5 산출물** — Vercel 배포, 데모 영상, 게임 소개 문서, AI 기술 문서. (단, 사용자 지시: "배포 전에 UI 먼저" → UI 폴리시 우선.)
5. **아트** — 초상화 풀 확충(현재 아키타입당 1장), 애니 프레임(사용자 제작).

## 8. 알아둘 함정
- 모달이 타일/스프라이트에 덮이는 문제 → 부모에 `isolate`(isolation:isolate)로 스택 컨텍스트 격리(모달 z-40 아래로 자식 z 가둠). IsoCityMap boardArea, TownIsoPreview 루트에 적용됨.
- 타일 클릭이 한 칸 앞으로 잡힘 → 버튼 style에 clip-path 다이아 넣어 히트영역 클립(해결됨).
- 대풍작 이벤트는 슬라이딩 윈도우(지속 4일 ≥ 최대 이동거리 3)라 뉴스 듣고 이동해도 유효.
- 「상인의 신표」(token)는 구매·판매 불가 — 호감도 ≥90 흥정 보상 전용. 「대건축가의 설계도」(blueprint)는 확률 6%·Lv3 잠금, 보유 시 장식 배치 해금.
- GitHub 리모트: `github.com/leeyounagh/nhn-city` (master). 과거 `public/sprites` 41MB 데드 에셋은 히스토리에서 제거됨(.gitignore에 `/public/sprites/`).
