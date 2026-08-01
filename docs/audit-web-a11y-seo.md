# 웹 표준 · 접근성 · SEO 감사 — 마지막 도시

작성 2026-08-01. 이 게임은 클라이언트 중심 SPA(Next.js 16 App Router)라 콘텐츠 사이트와 기준이 다르다. 게임 특성상 화면 리더 완전 지원은 한계가 있으나, 표준·시맨틱·공유용 SEO는 충분히 개선 가능하다.

> **적용 완료 (2026-08-01).** 아래 T1·T2·T3를 전부 구현·검증했다(tsc·eslint 0·next build·playwright 스모크: 모달 role=dialog·초기 포커스·ESC 닫기·스크롤 잠금 복원 확인). 커밋: `3198d7c`(SEO)·`8b7dc39`(접근성). 이 문서는 이제 "무엇을 왜 했는지"의 기록이다.

---

## 0. 한눈에 (적용 결과)

| # | 영역 | 갭 | 심각도 | 상태 |
|---|---|---|---|---|
| 1 | 접근성 | 모달 14개에 `role="dialog"`·`aria-modal`·`aria-labelledby`·ESC·포커스 트랩/복원 없음 | 높음 | ✅ `useDialogA11y` 훅으로 14개 적용 |
| 2 | SEO | `openGraph`·`twitter`·`robots`·`metadataBase` 없음, `manifest`/`robots`/`sitemap`/`opengraph-image` 파일 없음 | 중간 | ✅ metadata 확장 + 3개 규약 파일 |
| 3 | 접근성 | 흥정 input에 라벨 없음(placeholder만) + `focus:outline-none`으로 포커스 표시 제거 | 중간 | ✅ aria-label 추가(포커스는 wrapper `focus-within` 링 유지) |
| 4 | 접근성 | 버튼 다수에 `focus-visible` 링 없음(기본 아웃라인 의존) | 중간 | ✅ 전역 `:focus-visible` 링 |
| 5 | 시맨틱 | 메인 게임 화면에 `<h1>` 없음(인트로에만) | 낮음 | ✅ `sr-only h1`(단일 문서 제목) |
| 6 | SEO | 클라 렌더라 SSR HTML에 콘텐츠 없음 + `<noscript>` 안내 없음 | 낮음 | ✅ `<noscript>` 소개 추가 |
| 7 | 접근성 | 색 대비(보조 텍스트·플레이스홀더) 미확인 | 낮음 | ⏳ 수동 확인 권장(정적 감사 불가) |
| 8 | 접근성 | `city/PlacementPanel` dialog 미적용 | 낮음 | ⏸ 보류(중앙 모달 아닌 배치 패널) |

---

## 1. 웹 표준 — 대체로 양호

- ✅ `<html lang="ko">`(`layout.tsx:39`), `<main>`·`<footer>` 랜드마크, 시맨틱 `<button>` 사용.
- ✅ `viewport`(`layout.tsx`, viewport-fit=cover) — 이번 크로스브라우징 작업에서 추가됨.
- ✅ deprecated API 없음(`keyCode`/`which`/`BroadcastChannel` 직접사용 없음).
- ✅ 타일 히트영역은 `<button aria-label="빈 터 x,y">`로 노출(`IsoCityMap`).
- ⚠️ 개선점은 접근성·SEO 절 참조.

---

## 2. 접근성 (a11y) — 부분적

### 2-1. 모달 다이얼로그 (가장 큰 갭)
- **현황**: 모달 13개(`components/game/modals/*` + `city/PlacementPanel`)가 각각 `fixed inset-0 ... bg-black/60` div로 백드롭을 직접 구성. 백드롭 클릭 닫기는 대부분 있음(`onClick={onClose}` + 내부 `stopPropagation`).
- **발견**:
  - `role="dialog"`·`aria-modal="true"`·`aria-labelledby` **전무**(0개 파일). 화면 리더가 "대화상자"로 인식 못 함.
  - **ESC 닫기 없음**(`HaggleDialog`만 keydown 있으나 입력 Enter 용도).
  - **포커스 트랩/초기 포커스/포커스 복원 없음**(`tabIndex` 미사용). 모달 열려도 포커스가 뒤 배경에 남고, Tab이 배경 요소로 샘.
  - 모달 제목 heading(h2/h3)은 대부분 존재 → `aria-labelledby` 연결만 하면 됨(이미 반은 갖춤).
- **대책**: 공용 `Modal` 프리미티브(`src/shared/Modal.tsx`) 신설 — 백드롭 + `role="dialog"` + `aria-modal` + `aria-labelledby`(제목 id 연결) + ESC 닫기 + 포커스 트랩 + 열기 전 포커스 저장→닫을 때 복원. 13개 모달을 이 래퍼로 리팩터(중복 백드롭 제거 겸). `useEffect`로 `document.body` 스크롤 잠금도 함께.

### 2-2. 폼 / 입력
- **발견**: 흥정 입력 `HaggleDialog.tsx:287-288` — `placeholder="상인을 어떻게 설득할까…"`만 있고 **접근 가능한 이름(label/aria-label) 없음**. + `focus:outline-none`으로 포커스 표시 제거(대체 링 없음).
- **대책**: `aria-label="흥정 발언 입력"` 추가. `focus:outline-none` 대신 `focus-visible:ring-2 focus-visible:ring-amber-500` 등으로 포커스 가시성 확보.

### 2-3. 포커스 가시성 (키보드)
- **발견**: `focus-visible`/`focus:ring` 스타일이 거의 없음(전체에서 2곳). 대부분 버튼이 브라우저 기본 아웃라인에 의존 → 다크 테마에서 잘 안 보일 수 있음.
- **대책**: 공용 포커스 링 정책 수립(globals.css에 `:focus-visible` 기본 스타일, 또는 버튼 공용 클래스). 최소한 주요 액션 버튼·타일·모달 컨트롤에 `focus-visible:ring`.

### 2-4. 시맨틱 / 헤딩
- **발견**: `<h1>`이 `IntroCutscene.tsx:160`(인트로 컷신)에만 존재. 메인 게임 화면엔 문서 제목 역할 heading 없음.
- **대책**: 메인에 시각적으로 숨긴 `<h1>`(예: `sr-only` "마지막 도시 — 도시 재건") 1개. 모달 제목은 h2/h3 유지 + `id` 부여해 `aria-labelledby` 연결.

### 2-5. 이미지 대체 텍스트
- ✅ 스프라이트·초상화는 장식이므로 `alt=""`가 적절(정보는 인접 텍스트/aria-label로 전달). 초상화 실패 시 `GameIcon` 폴백도 있음. **현 상태 적절.**

### 2-6. 색 대비 / 모션
- ✅ `prefers-reduced-motion: reduce` 지원(`globals.css:69`).
- ⚠️ 색 대비(amber/stone on dark)는 정적 감사 불가 → 수동 확인 권장(특히 `text-stone-500` 플레이스홀더·보조 텍스트가 4.5:1 미달 가능).

### 2-7. 월드맵 내비게이션
- **발견**: `WorldMap.tsx` 지역 노드는 `<button>`(ok), 장식 그리드는 `aria-hidden`(ok). 다만 `<nav>` 랜드마크·현재 위치 `aria-current` 없음.
- **대책(선택)**: 지역 선택 영역을 `<nav aria-label="월드맵">`으로 감싸고 현재 위치 노드에 `aria-current="location"`.

---

## 3. SEO — 미흡 (게임이지만 공유/색인 기본은 필요)

### 3-1. 메타데이터
- **발견**: `layout.tsx:27` metadata에 `title`·`description`만. `metadataBase`·`openGraph`·`twitter`·`robots`·`keywords`·`alternates` 없음.
- **대책**: metadata 확장 —
  - `metadataBase: new URL(배포 URL)`
  - `openGraph`(title/description/type:"website"/locale:"ko_KR"/siteName/images)
  - `twitter`(card:"summary_large_image"/title/description/images)
  - `robots`(index/follow, 배포 전엔 noindex 옵션)
  - `keywords`(선택)

### 3-2. 라우트 규약 파일 (없음 → 추가)
- `app/manifest.ts` — PWA 기본(name/short_name/icons/theme_color/background_color/display). 파비콘 `icon.png` 재사용.
- `app/robots.ts` — `rules: { userAgent:"*", allow:"/" }` + sitemap 링크(단일 페이지라 간단).
- `app/sitemap.ts` — 루트 1개.
- `app/opengraph-image`(또는 metadata `openGraph.images`) — 공유 카드 썸네일(엠블럼/타이틀 이미지 재사용).

### 3-3. SSR 콘텐츠 / noscript
- **발견**: 게임은 `useGameEngine` 클라 상태라 SSR HTML에 실제 콘텐츠 거의 없음(크롤러가 볼 텍스트 부족). `<noscript>` 안내 없음.
- **대책**: `<noscript>`에 게임 소개 문단(제목·설명) 제공 → JS 미실행 크롤러/사용자 대비. metadata description이 주 색인 소스가 되도록 충실히.
- **참고**: 게임 특성상 본문 색인 가치는 낮음. 무리하게 SSR 콘텐츠를 만들 필요는 없고, 메타데이터+OG+noscript 소개면 충분.

### 3-4. 구조화 데이터(선택)
- 배포 시 `VideoGame`/`WebSite` schema.org JSON-LD를 넣으면 리치 결과에 유리(우선순위 낮음).

---

## 4. 실행 계획 (티어) — 전부 적용 완료 (2026-08-01)

- ✅ **T1 — SEO 기본**: metadata 확장(OG·twitter·robots·metadataBase·keywords) + `manifest.ts`·`robots.ts`·`sitemap.ts` + OG 이미지(타이틀 아트 `/intro/title.png` 재사용) + `<noscript>` 소개. 커밋 `3198d7c`.
- ✅ **T2 — 시맨틱·포커스**: 메인 `sr-only <h1>`(단일 문서 제목), 흥정 input `aria-label`, 전역 `:focus-visible` 링(globals.css), WorldMap `<nav aria-label>`/`aria-current`. 커밋 `8b7dc39`.
- ✅ **T3 — 모달 접근성**: 공용 `Modal` 프리미티브 대신 **`useDialogA11y` 훅**(마크업 재구성 없이 패널에 얹음) 채택 — `role=dialog`·`aria-modal`·`aria-labelledby`·ESC 닫기·포커스 트랩·열기 전 포커스 저장→복원·body 스크롤 잠금. 14개 모달 적용, 각 제목을 aria-labelledby로 연결. 커밋 `8b7dc39`.
  - **훅 방식 선택 이유**: 13개 모달의 백드롭 마크업(z-index·정렬·패딩)이 제각각이라 공용 래퍼로 감싸면 레이아웃 회귀 위험이 컸다. 훅은 속성만 추가해 기존 마크업을 보존하므로 저위험.
  - **검증**: playwright로 튜토리얼 모달 role=dialog·초기 포커스 내부·ESC 닫힘·스크롤 잠금 복원 확인. tsc·eslint 0·next build 통과.

### 남은 것 (선택)
- 색 대비 수동 확인(보조 텍스트·플레이스홀더가 4.5:1 충족하는지) — 정적 감사 불가.
- `city/PlacementPanel`은 중앙 모달이 아니라 배치 패널이라 dialog 미적용(필요 시 적용 가능).

## 5. 게임 특성상 보류/제외
- 전면 SSR 콘텐츠화(색인용) — 게임이라 가치 낮음, 스코프 밖.
- 아이소맵 전체 키보드 조작(방향키 타일 이동 등) — 큰 UX 설계 필요, 별도 논의.
- 완전한 화면 리더 게임플레이 — 실시간 캔버스형 게임 특성상 한계. 모달·폼·랜드마크 수준까지가 현실적 목표.
