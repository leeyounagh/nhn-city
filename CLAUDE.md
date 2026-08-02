# CLAUDE.md — 마지막 도시 (Ashen Kingdom)

> NHN NAN 2026 게임×AI 해커톤 사전과제. LLM 밀실 추리형 도시 재건 게임.
> Next.js 16 App Router · React 19 · Tailwind v4 · TypeScript · Anthropic API.
>
> 본 파일은 **글로벌 `~/.claude/CLAUDE.md` 10개 룰을 그대로 따른다.** 그 위에 이 프로젝트만의 결정을 응축한 빠른 참조다.

@AGENTS.md

---

## 0. 상세 문서 매핑 (작업 전 / 막혔을 때)

| 주제 | 파일 |
|---|---|
| 게임 기획 (스토리·시스템·화면) | `docs/기획서.md` |
| 경제 모델 (가격·생산·밸런스·perk) | `docs/경제모델.md` |
| 진행 영속화 (IndexedDB·용량·우려) | `docs/indexeddb-persistence.md` |
| 세션별 결정의 "왜" + 함정 | `docs/context-notes.md` |
| 인수인계 (시작점·남은일·함정) | `docs/handoff.md` |
| 실행 체크리스트 | `docs/checklist.md` |
| 지인 초상화 프롬프트 | `docs/allies-portrait-prompts.md` |

---

## 1. ⚠️ 반드시 지킬 것

- **Next.js 16은 학습데이터와 다른 특수 버전.** 코드 작성 전 `node_modules/next/dist/docs/` 관련 가이드를 읽어라 (`AGENTS.md`).
- **커밋/푸시는 사용자 요청 시에만.** 변경 착수 전 승인받는다.
- **아트/애니 프레임은 사용자가 직접 제작.** 코드/교체 슬롯만 담당.
- **AI 활용 경로(초상화·페르소나·흥정 대사·소문·조언)를 정적 지름길로 깎지 말 것.** 폴백은 "AI가 없을 때만"의 안전망이지, AI 경로를 대체하는 게 아니다.
- **파일 이동·대량 import 변경 시 `.next` 삭제 후 dev 재시작** (Turbopack 스테일 캐시).

---

## 2. 기술 스택

- **Next.js 16 App Router** (Turbopack), **React 19**, **Tailwind v4** (`@tailwindcss/postcss`, Lightning CSS 내장 → vendor prefix 자동), **TypeScript**, **pnpm**.
- **Anthropic SDK** (`@anthropic-ai/sdk`) — 서버 라우트 전용. 키 없으면 키워드/정적 폴백.
- **recharts** — 시세 그래프. **zod** — 입력 검증. **server-only** — 서버 모듈 경계.

---

## 3. 2레이어 아키텍처 (핵심)

**판정·수치는 코드, 소문·연기·발언분류만 LLM** (2레이어 격리). LLM이 가격·하한가·정답을 판정하지 않는다.

- **서버 전용 진실** — `src/lib/server/`
  - `economy.ts` (가격·상인 스펙·성향·호감도Δ·흥정식·`MERCHANTS` 영구 24명 정체성)
  - `world.ts` (24명 슬라이딩 체류·하루 6명 등장·`daysLeft`)
  - `rumor.ts` (소문 신선도·위치필터), `merchant.ts`, `news.ts`
  - `llm.ts` (LLM 호출 래퍼 · 키 체크), `prompt.ts` (프롬프트 빌더)
  - `fallback/` (**AI 토큰 없을 때 정적 폴백** — §7)
- **클라 공개 데이터** — `src/lib/`
  - `game-data.ts` (자재·건물·인구·렌더 스케일), `game-state.ts` (GameState·호감도 감쇠·생산·게이팅)
  - `allies.ts` (지인·perk·조력 이벤트), `missions.ts` (온보딩 상태기계), `labels.ts` (UI 표시 라벨)
- **로직 훅** — `src/hooks/useGameEngine.ts` — **게임 로직은 전부 여기.** 클라 상태 소유 + 서버 호출 + 모든 액션 + 미션/지인/인구 파생. `Game.tsx`는 렌더 조립만.
- **서버 라우트** — `src/app/api/*` (haggle·town·news·book-advice·merchant·rumors·prices·ally).

---

## 4. 폴더 구조

```
src/
  app/
    layout.tsx           # metadata + viewport(viewport-fit=cover)
    globals.css          # Tailwind + 애니메이션 + 크로스브라우저 유틸(§8)
    api/                 # 서버 라우트 (2레이어 서버측)
  lib/
    game-data.ts game-state.ts allies.ts missions.ts labels.ts town-scenes.ts
    server/              # server-only 진실
      economy.ts world.ts rumor.ts merchant.ts news.ts llm.ts prompt.ts
      fallback/          # AI 폴백 데이터 (pick·personas·haggle·rumors·headlines·book-advice + index)
  hooks/
    useGameEngine.ts     # ★ 게임 로직·상태·액션
  components/
    Game.tsx             # 얇은 조립
    game/modals/ game/hud/ ModalStack.tsx
    city/ IsoCityMap.tsx TownView.tsx TownIsoPreview.tsx
  shared/icon/           # GameIcon(SVG) · MaterialIcon
  types/
```

---

## 5. 명명 / 주석 정책

- 폴더·비컴포넌트 파일 = kebab-case. 컴포넌트 = PascalCase.tsx. 상수 = SCREAMING_SNAKE_CASE. 타입 = PascalCase.
- **파일 헤더 (필수)** — 새 소스 파일은 `'use client'` 등 지시자 다음에 목적을 설명하는 한국어 한 줄 주석으로 연다.
- **한국어 문장은 마침표로 끝낸다** (콜론 금지 — 영어식 패턴 회피).
- 비자명한 로직엔 "왜"를 인라인 주석으로. 자명한 "무엇"은 생략.

---

## 6. 진행 영속화 (IndexedDB)

- 진행은 **IndexedDB에 저장**된다 (`src/lib/persist.ts`, DB `ashen-kingdom`·단일 키 `game`). 재접속 시 이전 상태 복원. 설계·용량·우려는 `docs/indexeddb-persistence.md`.
- 저장 대상: **GameState 전체** + 온보딩 플래그(`alliesSeen`·`acked`·`missionDismissed`·`lastNewsDay`). 파생값(미션·지인·인구·수입)은 **저장 안 하고 상태에서 재계산** — 지인 해금·상인 관계는 원본(placements·merchantMemory)이 저장되므로 유지된다(desync 없음).
- 로드는 비동기 → 완료(`hydrated`)까지 검은 커버로 게임 노출 차단(인트로 커버와 동일 z-60). 저장은 상태 변경 500ms 디바운스 + 탭 숨김(visibilitychange) 시 즉시 flush.
- IDB 불가(프라이빗 모드 등)·손상·버전 불일치 시 조용히 미영속/새 게임으로 폴백(크래시 X). 「새 게임」 = 푸터 버튼 → 확인 모달(`ResetConfirmModal`) → `clearSave()` + 초기화.
- `GameState`에 필드 추가 시: 옛 저장분엔 그 필드가 없다 → `persist.ts`의 `normalizeSave`가 `initialState()` 기본값으로 병합해 방어. 형태가 크게 바뀌면 `SAVE_VERSION`을 올린다(불일치분은 새 게임으로 폴백).

---

## 7. AI 폴백 규칙

- AI 토큰(크레딧) 없을 때 쓰는 정적 폴백 데이터는 **`src/lib/server/fallback/`에 종류별 파일로 둔다** — `personas`(페르소나) · `haggle`(분류+대사) · `rumors`(소문) · `headlines`(뉴스) · `book-advice`(책 조언). `pick.ts`의 `variant()`로 seed 결정론 선택.
- **컴포넌트·라우트에 폴백 데이터를 인라인하지 말 것.** 데이터는 lib, 소비는 import.
- `prompt.ts`는 **프롬프트 빌더만.** 하위 호환을 위해 `export * from "./fallback"`로 폴백을 re-export한다(임포터는 `@/lib/server/prompt`에서 그대로 가져와도 됨).
- 지인 대사 폴백(greeting)은 `src/lib/allies.ts`에 지인 객체와 함께.

---

## 8. 크로스 브라우저 규칙 (타깃: Chrome/Edge 최근 2, Safari 15.4+/iOS, Firefox ESR)

- **Browserslist** — `package.json`에 명시. 모든 빌드/폴백 기반.
- **자동 처리** — Tailwind v4(Lightning CSS)가 CSS 클래스의 vendor prefix(`-webkit-backdrop-filter` 등)를 자동 생성. autoprefixer 불필요.
- **인라인 style은 자동 prefix 안 됨** → React `style={{}}`의 `clipPath`는 반드시 `WebkitClipPath`를 함께 쓴다 (아이소맵 다이아몬드 타일).
- **뷰포트 높이** — 풀스크린 컨테이너는 `h-screen`(=100vh, iOS 주소창 버그) 대신 `h-dvh-safe`(globals.css 유틸, vh 폴백+dvh). 모달 높이 캡은 `dvh` 단위.
- **safe-area** — `viewport-fit=cover`(layout.tsx viewport) + `pb-safe`(globals.css 유틸)로 노치/홈바 회피. 하단 HUD(GameFooter)에 적용.
- **폼** — input은 `text-base`(≥16px) 유지 (iOS 포커스 자동 줌 방지).
- **커스텀 유틸** — Tailwind v4 `@utility`로 globals.css에 정의(`h-dvh-safe`, `pb-safe`).

---

## 9. 자주 걸리는 함정 (상세: `docs/handoff.md` §8, `docs/context-notes.md`)

- **게임 로직은 `Game.tsx` 아님 → `hooks/useGameEngine.ts`.**
- **setState updater 안에서 값 대입 → 밖에서 동기로 읽기**는 핸들러의 첫 setState일 때만 안전(React eager-update). 선행 setState가 있으면 값이 null → 순수함수 분리 + `queueMicrotask`로 flush 이후 처리 (조력 이벤트 모달 버그 사례).
- **Turbopack 스테일** — 파일 이동/대량 import 후 "Module not found" 등 옛 오류 → `rm -rf .next` 후 dev 재시작.
- **슬라이딩 체류 경계** — 소문 위치는 `daysLeft>3`인 상인만 흘려 100% 존재 보장. 이 필터 건드리면 "소문 보고 갔는데 없음" 버그 재발.
- **모달 z-index** — 부모에 `isolate`로 스택 컨텍스트 격리.

---

## 10. 실행 & 검증

```bash
pnpm dev                 # localhost:3000
npx tsc --noEmit         # 완료 선언 전 필수
npx eslint <files>       # 게임 스프라이트 <img>의 no-img-element 경고는 의도됨 → 무시
npx next build           # Tailwind 커스텀 유틸·라우트 최종 검증
```

- **결정론 API 검증** — dev 서버에 fetch 스크립트로 economy/haggle 응답 확인(같은 seed=같은 결과).
- **브라우저 검증** — `playwright-cli`. 타일 클릭은 clip-path 다이아라 DOM `.click()` 오차 → 좌표/`eval` 클릭.

---

## 11. 커밋 (요청 시에만)

- Conventional Commits (`feat:` `fix:` `docs:` `refactor:` …). 한 커밋 = 한 논리 변경.
- `git push`는 PreToolUse work-log 훅이 막음 → 커밋 메시지에 `Work-Log: skip` 트레일러.
- 트레일러: `Co-Authored-By: ...` + `Claude-Session: ...`.
- GitHub 리모트: `github.com/leeyounagh/nhn-city` (master).
