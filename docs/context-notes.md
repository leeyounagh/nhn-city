# 컨텍스트 노트 (결정 기록) — 「마지막 도시」

향후 세션이 맥락 없이 이어받을 수 있도록 결정과 근거를 기록한다.

## 대회 정보
- NHN NAN 2026 (Next AI Network) — 채용 연계형 게임×AI 해커톤.
- 사전 과제 마감 **2026-08-10**, 본선 **2026-09-04~06** 판교 플레이뮤지엄.
- 개인 지원 (팀원 역할서 불필요).
- 제출 필수 = 플레이어블 빌드(웹 빌드 허용) + 전체 소스 GitHub + 시연영상 + 게임소개서 + AI 기술문서.
- 심사 계정 = dl_gameai_reviewer@nhn.com (Private 시 초대).

## 프로젝트 전환 이력
- 최초 컨셉 = LLM 밀실 추리게임(역전재판 톤). 게임 루프까지 완성했으나 **2026-07-19 "재미 없다" 피드백으로 보류**. 코드는 github.com/leeyounagh/nhn-mystery에 보존.
- **2026-07-19 새 컨셉 전환** = 도시건설 타이쿤 + 떠돌이 상인 자연어 흥정.
  - 근거 = 추리는 정답 1회 클리어면 끝(리플레이 없음). 절차생성 상인 + 경제 압박 + 책 성장 = 로그라이크식 반복 손맛. 10~30대 남성층에 리플레이성 소구.

## 확정된 설계 결정과 근거
- **코어 = 떠돌이 상인 자연어 흥정** (도시건설은 목표/틀로 경량).
  - 근거 = "왜 AI"와 "재미"가 둘 다 흥정에 있다. 타이쿤 시뮬을 키우면 AI가 묻히고 마감 못 맞춤. 지난 게임 노잼 원인=얄팍한 루프 → 흥정 깊이로 해결.
- **2레이어 분리** = 코드가 경제·판정 소유, LLM은 생성·연기만.
  - 근거 = LLM 판정은 헛거래·가격붕괴 유발. 공정성·클리어 보장은 코드가.
- **LLM은 분류만, 판정은 코드** = 플레이어 발언을 카테고리(아부/논리/대량/딱한사정/협박 등)로 분류 → 코드가 상인 성향에 대입해 호감도·가격 계산.
- **절차생성 상인** = 매 등장마다 성격·외모·말투 다름. AI 필연성의 핵심.
- **마법의 책 = 정보 게이트 + AI 서사 래핑.** 레벨업으로 상인 약점 노출 → 정보=힘. 책이 상인을 "읽는다"=LLM이 프로필 생성.
- **정보 격리** = 상인 프롬프트엔 자기 스펙만. 인젝션 방어로 하한가·정답 유출 차단.

## 4대 확정 결정 (2026-07-19, 사용자 승인)
- **타이쿤 타일 배치 방식** (슬롯 기반으로 단순화해 스코프 관리).
- **스토리 A안** = 문명 붕괴 후 유랑 교역 세계. 스승 유산으로 마법의 책 + "마지막 도시 재건" 유언.
- **멀티턴 흥정.**
- **승리조건 = 도시 완성** (핵심 랜드마크 완성).

## 아트 결정
- **상인 초상화 = Midjourney** (2026-07-19 확정). `--sref`로 스타일 통일, 아키타입별 배치 생성 50장+, public/merchants + 태그 json 매핑.
  - 사전생성 풀(B)을 배포 메인으로. fal.ai 라이브 생성(A)은 선택적 데모 플렉스.
  - 근거 = 3주 솔로 + 데모 안정성 + Anthropic 결제도 막힌 상황에 두 번째 유료 API 리스크 회피. "매번 바뀜" 손맛은 LLM 페르소나가 이미 책임.
- **건물 = Kenney.nl 무료 아이소 시티 에셋.** AI 타일 생성은 일관성 문제로 비채택.

## 기술 스택
- Next.js App Router + React + Tailwind + TS, pnpm. Anthropic Claude API(.env.local, 서버 라우트에서만).
- Vercel 배포(서버리스). 데스크톱 우선(타이쿤 타일 특성) — mobile-first 유지 여부는 열린 항목.

## 추가 확정 (2026-07-19)
- **게임 제목 = 「마지막 도시」** 확정.
- **데스크톱 우선 + 모바일 반응형** 대응.
- **신규 리포** 생성 예정 (nan-mystery 재사용 안 함).

## 서버 레이어 구현 (2026-07-18 완료, task 8)
- **seed 기반 무상태 비밀 모델** = 서버가 `seed`(number)로 mulberry32 결정론 PRNG를 돌려 상인 전문화·성향·자재별 offer0/floor/재고를 매번 복원. 비밀(성향·하한가)은 클라에 안 보냄. 클라는 seed + 흥정 상태(disposition, turnsLeft, qualityApplied)만 들고 매 턴 서버가 재계산.
  - 근거 = Vercel 서버리스에 crypto/세션스토어 없이 비밀 격리. 책 레벨 힌트는 의도적 노출.
- **파일 구성**
  - `src/lib/server/economy.ts` (server-only) = PRICES(base/floor), SPECIALIZATIONS 6종, PROFILES 4종, EFFECT Δ표, mulberry32, deriveMerchant/priceAt/applyCategory/initialDisposition/buildPublicMerchant. 이 파일 밖으로 성향·하한가 안 나감.
  - `src/lib/server/llm.ts` = Anthropic 래퍼. 키 없으면 null 반환 → 호출부 폴백.
  - `src/lib/server/prompt.ts` = 페르소나/흥정 시스템 프롬프트 + 전문화별 폴백 페르소나 + 키워드 폴백 분류.
  - `src/app/api/merchant/route.ts` = POST {bookLevel, seed?} → seed 롤 + 페르소나(LLM/폴백) → 책레벨 게이팅된 PublicMerchant.
  - `src/app/api/haggle/route.ts` = POST {seed, materialId, utterance, disposition, turnsLeft, qualityApplied} → LLM 분류+연기(폴백) → 코드가 호감도·현재가·status 계산.
- **흥정 수식** = currentPrice = floor + (offer0 - floor) × (1 - disposition/100). quality 성공 시 offer0 일회성 ×0.92.
- **검증 완료** = tsc/eslint/next build 그린 + seed 12345(greedy 만물상) bulk 발언 → 호감도 20→38, 현재가 13→11 정상.
- ⚠️ **curl Korean 인코딩** = Windows 콘솔에서 curl -d에 한글 넣으면 깨짐(요청 body만). 테스트는 UTF-8 파일 --data-binary @file 사용. 서버 응답 한글은 정상.

## 게임 UI 구현 (2026-07-19 완료, task 9)
- **클라이언트 상태 소유** = `src/lib/game-state.ts` (GameState: gold/day/xp/inventory/built/merchant/haggle/won + 헬퍼 bookLevelFromXp/xpToNext/dailyIncome/checkBuild). 서버 비밀 없음.
- **컴포넌트** (모두 'use client')
  - `Game.tsx` = 오케스트레이터. 상태 useState, 라우트 호출(summonMerchant/nextDay/startHaggle/sendUtterance/buy/build), HUD·WinScreen 인라인.
  - `CityView.tsx` = 창고(인벤토리 스트립) + 건물 슬롯 카드(요구자재 have/need·선행·책레벨·건설버튼). 건물 아이콘 이모지 임시.
  - `MerchantPanel.tsx` = 페르소나(초상화 이모지 임시) + 책 레벨별 힌트(profileHint/weaknessHint) + 자재 목록(제시가·하한힌트). 빈 상태=상인 부르기.
  - `HaggleDialog.tsx` = 멀티턴 모달. 대화 로그(플레이어/상인/카테고리태그), 호감도 바·현재가·남은턴, 입력→제안, 수량 선택→수락 구매. status ongoing/timeup/closed 분기.
- **흥정 시작 흐름** = 클라가 첫 턴엔 disposition 안 보냄 → 서버가 initialDisposition(성향) 시드 → 이후 클라가 응답값 추적. 초기 호감도도 서버에 격리(라우트 disposition optional로 변경).
- **루프** = 다음 날 버튼 → 수입 지급 + 상인 등장 → 자재 흥정 구매 → 건설(자재 소모·경험치·책레벨업) → 대성당(랜드마크) 완성 = 승리.
- **검증** = tsc/eslint/next build 그린. 홈 렌더 HTTP 200(마지막 도시·상인 부르기·창고 마크업 확인). 첫턴 시드 흥정(seed 12345, 아부→greedy +0, 13→12골드) 정상.
- ⚠️ **브라우저 클릭 e2e 미검증** = 현재 환경에 브라우저 자동화 없음. 렌더+API 레이어까지만 확인. 로컬 `pnpm dev`로 수동 플레이 검증 필요.
- ⚠️ **구매 수량 재고 미반영** = MVP는 골드 한도로만 제한(서버 재고 stock은 derive엔 있으나 클라 미노출). 밸런스 패스에서 재고 캡 추가 여부 결정.

## UX 개선 (2026-07-19, 사용자 피드백 반영)
- **상인 부르기 버튼 제거** = 수동 소환 버튼이 어색. 상인은 마운트 시 자동 1명 등장(Game.tsx spawnedRef 가드) + 「다음 날」마다 새 상인. MerchantPanel 빈 상태는 수동적 안내만.
- **건설 = 자재 칩 드래그 방식** = 원클릭 건설 폐기. 창고 자재 칩을 건물 카드로 drag&drop(HTML5 dataTransfer "text/lc-material") 또는 모바일용 탭 대체(칩 선택 후 건물 탭)로 1개씩 투입. 슬롯이 모두 차면 그 자리에서 자동 완공.
  - `GameState.progress`(건물id→자재id→투입수량) 추가. deposit()이 1개씩 인벤→progress 이동, 완성 시 built 등록·xp·승리 처리.
  - **소프트락 방지** = 미완성 건물에 넣은 자재는 「자재 회수」 버튼으로 전부 인벤 복귀. "언제나 클리어 가능" 원칙 유지.
- **검증** = tsc/eslint/next build 그린. 브라우저 클릭 e2e는 여전히 수동.

## 열린 항목
- 흥정 턴 수 최종 수치 (MVP 5턴 가정).
- 클리어 밸런스 시뮬레이션 (경제모델 §6 — 하한가 플레이 총비용 ≈ 2,300골드 vs 시작 400 + 수입곡선).
- UI (task 9) = HUD, 아이소 슬롯 건설, 상인/책 열람, 멀티턴 흥정 대화, 승리 엔딩.

## 주의점 (지난 프로젝트에서 이월)
- ⚠️ **API 키** = .env.local(.gitignore). 소스 공개 심사라 커밋 시 즉시 노출. 커밋용은 .env.local.example.
- ⚠️ **Anthropic 크레딧** = 한국카드 해외결제 이슈로 결제 실패 이력. 흥정(LLM)엔 크레딧 필요. 데모 안정성 위해 초상화는 사전생성으로.
- ⚠️ **Next 최신 버전 breaking change** = 코드 작성 전 node_modules/next/dist/docs/ 확인. next lint 제거됨 → eslint 직접 실행.
- 작업 폴더 = `C:\Users\whdud\Desktop\nan2026-citybuilder`.

## 맵 탐험 모드 전환 (2026-07-19)
- 패널 기반 UI → **걸어다니는 폐허 맵**으로 전환. 사용자 요청.
- `src/components/MapView.tsx` 신규. 게임 두뇌(economy·haggle·book·LLM)는 손대지 않고 **화면·조작 껍데기만** 교체. startHaggle/deposit/reclaim/MerchantPanel 전부 재사용.
- **이동** = 방향키·WASD(키보드) + 맵 탭(모바일). requestAnimationFrame 루프, % 좌표계, 단일 화면 고정(스크롤 카메라 없음). 정지 시 0프레임.
- **조우** = 마차(상인)에 근접 후 Space/탭 → MerchantPanel 팝업 → 자재 선택 시 기존 HaggleDialog. 상인 위치는 seed에서 결정적 도출(hash01) → 매일 새 위치.
- **건축** = 건물터 7개 고정 위치. 근접 시 BuildSitePanel 팝업(투입 버튼 방식, 모바일 친화). 완공 마커 표시. CityView는 삭제(맵 팝업이 대체).
- **에셋** = public/sprites/ 에 hero/{down,side,up}-{0..3}.png(오른쪽=side 반전), merchant-cart.png, map-bg.png. GPT 생성 시트를 알파 프로파일로 실측해 잘라냄(균등분할 아님 — 여백 offset 존재).
- **파비콘** = 해골+청록눈을 정사각 크롭 → src/app/icon.png. 기본 favicon.ico 제거.
- **흥정창 초상화** = HaggleDialog 헤더에 /merchants/{portrait}.png (없으면 이모지 폴백). 미드저니 초상화는 아직 미투입.
- React19 lint: 렌더 중 ref.current 쓰기 금지 → useEffect로 동기화.
- ⚠️ 미검증 = 브라우저 상호작용(이동·조우·투입) e2e는 이 환경에서 못 돌림. tsc·eslint·렌더·에셋200만 확인. 사용자 수동 테스트 필요.
- 남은 아트 = 건물 스프라이트(현재 이모지 마커), 상인 초상화 6종.

## 맵 조작 버그 3건 수정 (2026-07-19)
- **좌우 스프라이트 뒤집힘** = side 프레임 원본이 오른쪽을 봄. flip 조건을 `dir === "right"` → `dir === "left"`로 반전.
- **"기본으로 상인 조우"** = 상인 위치가 완전 랜덤이라 시작점(50,55) 반경 11% 안에 종종 스폰(~8%). merchantPos를 시작점 기준 각도+반경(30~48%)으로 바꿔 항상 멀리 스폰 → 돌아다녀야 만남.
- **보이지 않는 벽** = map-bg는 하늘 없는 탑다운 전면 지면인데 이동 bound(6~94/15~88)가 가장자리 지면을 잘라냄. bound를 3~97/8~94로 넓힘.
- 검증: tsc·eslint 통과(기존 <img> 경고만). 브라우저 e2e는 여전히 사용자 수동 확인 필요.

## 2×2 구역 맵 확장 (2026-07-19)
- 단일 화면 → **2×2 구역(북서/북동/남서/남동)**. 각 구역은 자체 0~100 좌표계 + 배경 1장.
- 안쪽 경계를 넘으면 이웃 구역으로 전환하고 반대쪽 끝에서 재등장. 바깥 경계(맵 끝)는 하드 벽.
- 건물 7개를 구역별로 분산(북서 hut/warehouse, 북동 well/workshop, 남서 market/wall, 남동 cathedral).
- 상인은 seed로 구역+좌표 결정 → 4구역 중 하나에 있어 **직접 탐험해야 만남**. nextDay마다 새 seed=새 구역.
- 배경 파일: /sprites/map-bg-{nw,ne,sw,se}.png. **아직 없으면 map-bg.png로 자동 폴백**(CSS 다중 배경)이라 지금도 테스트 가능.
- 우상단에 구역명 + 2×2 미니맵 표시기 추가(현재 구역 하이라이트).
- 상태 추가: region {col,row}, regionRef. 전환 시 탭 이동 target 초기화.
- 검증: tsc·eslint 통과(기존 <img> 경고만). 브라우저 이동·전환 e2e는 사용자 수동 확인 필요.

## 재건 단계별 배경 + 완성 마커 숨김 (2026-07-19)
- 방식 A(점진): 구역 배경이 그 구역 완성 건물 수(0/1/2)에 따라 바뀜. `regionBgStack(rkey, builtCount)`가 CSS 다중배경 폴백 체인 반환(단계img → 구역기본 → 공용 map-bg.png).
- 파일명: map-bg-{slug}.png(0채) / map-bg-{slug}-{n}.png(n채). slug=nw/ne/sw/se. 단계 이미지 없으면 자동 폴백이라 지금도 동작.
- 완성된 건물 마커(이모지)는 숨김 — 렌더 필터에 `!state.built.includes(b.id)` 추가. 죽은 built 스타일 분기 제거.
- 상태 추가 없음: state.built 갱신 → 재렌더 → 배경 자동 전환.
- 아직 필요한 아트 7장(A): map-bg-{nw,ne,sw}-{1,2}.png + map-bg-se-1.png.

## 스테이지 배경 7장 배치 (2026-07-19)
- GPT로 제작한 7장을 `public/sprites/`에 매핑 배치. 모두 1536x1024 (3:2), 코드 변경 없음 (regionBgStack이 파일명 자동 탐지).
- 매핑: nw-1(오두막)·nw-2(+창고), ne-1(우물)·ne-2(+공방연기), sw-1(시장천막)·sw-2(+성벽), se-1(대성당).
- 폴백 체인: map-bg-{slug}-{n}.png → map-bg-{slug}.png → map-bg.png. 파일 없으면 자동으로 이전 단계 노출.

## 초상화 A안 - 성향 랜덤 배정 (2026-07-19)
- 원안(기획서 90/98) 재정렬. economy.ts에 PORTRAITS 매니페스트 + pickPortraitFile(archetype, profile, seed) 추가.
- 배정 = 아키타입 일치 후보 중 mood==성향 우선, seed 독립 스트림(seed ^ 0x9e3779b9)으로 랜덤 픽. 경제 rng 불변(가격/재고 안정).
- PublicMerchant.portraitFile 추가 = 실제 파일명. portrait(아키타입)는 이모지 폴백 키로 유지. HaggleDialog Portrait는 file ?? portrait로 src 구성.
- 현재 6장(아키타입당 1장) = 각 아키타입 기본으로 동작. mood 태그 초상화를 추가할수록 성향별 다양성↑.
- B안(fal.ai 런타임 생성)은 미착수 = 나중 데모 버튼. 크레딧 이슈로 폴백 필수.

## 대형 피벗 — 「망한 도시의 후계자」 (2026-07-19)
- 「마지막 도시」(단일 상인 타이쿤) → **「망한 도시의 후계자」**(소문 추리 + 다중 상인 거래 + 도시 재건)로 전환.
- **스토리** = 적 침략으로 도시 붕괴 → **퇴직기사**(스승 아님)가 국보 「마법의 책」을 품고 후계자와 탈출 → 수년 유랑 후 폐허 귀환 → 책의 힘으로 상인 추적·거래해 재건.
- **AI 필연성 재정의** = 소문에서 상인 위치/재고/원하는물품을 추리하는 게 별점. 고정 텍스트로 성립 불가.
- 재활용 = economy.ts(가격·profile·seed·흥정 수식), HaggleDialog 멀티턴 UI, LLM 폴백, 마법의 책 게이트, Next 스캐폴드, 초상화 A안. 폐기 = MapView 걸어다니는 2×2 맵 → 월드맵 노드, 단일 상인 조우.

### 5대 확정 결정 (2026-07-19, 사용자 승인)
1. **화폐 = 골드 메인 + 변동 시세**(품귀·뉴스). **물물교환은 희귀템 전용.** (하이브리드 아님 — 순수 골드 매매 + 희귀템만 교환.)
2. **추리 = 자유형** — 코드가 채점 안 함. 틀리면 이동시간 낭비가 페널티.
3. **거래 협상 = 기존 멀티턴 HaggleDialog UI 재사용.**
4. **맵 = 4마을 월드맵(노드 선택) + 마을 진입 대화 화면.** 걸어다니는 맵 폐기.
5. **규모(MVP) = 마을 4, 상인 6, 하루 1회 상인 이동.**

### 생산 + 경제 설계 확정 (2026-07-19, 사용자 승인)
- **마을 특산 = 업종 단위**(특정 물품 아님). 사용자 명시: "철 유리 같은 정확한 물품이 아니라 광업·향신료·장신구 같은 업종형태". 현재 13자재에 맞춰 매핑: 북서=임업(wood/planks), 북동=광업(stone/steel/bronze/marble/scrap), 남서=직물(cloth/clay/brick), 남동=유리세공(glass/stainedglass). (향신료·장신구는 예시 — 신규 자재 추가는 MVP 밸런싱 부담이라 기존 자재 재사용.)
- **가격식** = 기본가 × 품귀배수 × 이벤트배수 × 마을배수, 하한가로 클램프. 폭락해도 floor 밑으로 안 감(최소 가치 보장).
- **아침 뉴스 방송** = 동물의숲 여울 톤, 하루 1회 아침 팝업. LLM 헤드라인 연기 + 코드 고정 %보정(판정=코드). 대풍작/증산 이벤트 → 해당 마을 업종 물품 일시 폭락 → 차익거래 기회.
- **생산 시스템(b안 확정)** = 건물이 매일 물품 생산, 도시 발전 시 상위 생산품 해금. 용도 = **자급자족 + 잉여분 시세 판매(골드화)**. 생산품도 §6.4 시세 영향 받음(과잉생산=가격하락).
- **단계 배치** = 경제/뉴스 P3, 생산/특산 P4 (사용자 "상관없음"). 기획서 §6.1/6.4/6.7 + checklist P3/P4 반영 완료.

### 제목 확정 + 승리 개념 제거 (2026-07-19)
- **게임 제목 = Ashen Kingdom** (부제 「망한 도시의 후계자」). layout.tsx metadata·Game.tsx 헤더·인트로 폴백 타이틀·문서 제목 전부 반영.
- 옛 title.png·start-button.png("마지막 도시/LAST CITY" 카피)는 `public/intro/_old-lastcity/`로 이동 → CSS 폴백 타이틀(Ashen Kingdom)이 뜸. 새 타이틀 이미지는 사용자 제작 몫.
- **승리 개념 제거** = 랜드마크 완성=승리 폐기, 오픈엔드(계속 성장). 기획서 §3/§5.6/§6.4 + checklist P4 반영. ⚠️ 코드(game-state.ts `won`, Game.tsx WinScreen·notice, 대성당 landmark)엔 옛 승리·스승 서사 카피가 남음 — P1~P4 Game.tsx 재작성 때 정리 예정.
- 인트로 컷 = 05-receive·09-will 폐기(스승 임종/유언 장면), 나머지 11컷 자막을 새 스토리로 교체. "인트로 마지막 자막" 변경은 사용자가 스킵.

### P1-2 소문 생성 + 인젝션 방어 (2026-07-19, 구현 완료)
- **1소문 = 진실 1조각 = LLM 호출 1회.** 인젝션이 다른 조각으로 번지지 못하도록 조각별로 격리 생성(route.ts에서 `Promise.all`로 병렬 호출). `extractJson`이 첫 `{...}` 하나만 뽑으므로 조각당 단일 객체 출력과 맞음.
- **파일**: `lib/server/rumor.ts`(조각 선택, 서버 전용), `lib/server/prompt.ts`(rumorSystem/rumorUser/fallbackRumor 추가), `app/api/rumors/route.ts`(POST {day,town,bookLevel}, zod 검증).
- **결정론**: `rumorSeed(day, townId)` → mulberry32. 같은 (day, town, bookLevel)이면 항상 같은 소문. 스모크로 2회 호출 일치 확인.
- **책 레벨 게이팅**(allowedKinds): Lv1=location만, Lv2=+wants, Lv3=+moving. 조각 종류를 아예 안 만들어서 하위 레벨엔 노출 원천 차단.
- **거짓/오래된 조각**(unreliableChance): Lv1 40% / Lv2 28% / Lv3 20%. stale=이웃마을 지목, false=아무 다른 마을/안 원하는 물품/이동여부 뒤집기. **Lv3에서만 `suspect:true`** 플래그로 판별 보조(하위 레벨은 진짜/가짜 구분 못 함 = 난이도).
- **상인 다양성**: 소문 하나당 서로 다른 상인 seed(`usedMerchants`). 같은 상인 중복 소문 방지(결정 #1 "정보원 각각 진실 1조각"). 아키타입은 우연히 겹칠 수 있으나 seed·지목 마을이 달라 별개 상인.
- **인젝션 방어**(rumorSystem): (a)조각에 없는 사실 창작 금지 (b)가격·재고·수치 언급 금지(애초에 프롬프트에 없음) (c)`<조각>` 내부 지시문 무시=데이터일 뿐. 조각은 명령형이 아니라 "사실:" 서술로만 감쌈.
- **폴백**: 크레딧 없으면 `fallbackRumor` 템플릿(종류별 문장). 실제 스모크는 키 없이 돌아 폴백 경로 검증됨.
- ⚠️ 남은 것: P1-3 단서 노트 상태/UI에서 이 Rumor[]를 마을·상인·물품 축으로 누적.

### P1-3 단서 노트 상태 + UI (2026-07-19, 구현 완료)
- **사용자 결정**: 표시 축=마을별 그룹(전자), 날 바뀌면 노트 비움(후자), 상태는 `GameState.clues: Rumor[]`(id 중복 덮어쓰기). 수집 배선은 **(a) P2로 미룸** — 지금은 노트 상태·컴포넌트만 마운트, `/api/rumors` fetch는 P2 마을 진입 UI에서 연결.
- **파일**: `game-state.ts`(clues 필드 + `mergeClues`·`groupCluesByTown`), `components/ClueNotebook.tsx`(마을별 그룹 모달, 종류 뱃지 위치/원함/이동·아키타입·물품·suspect "의심스러움"·정보원), `Game.tsx`(헤더 "📓 단서 노트" 토글 버튼 + 모달 렌더 + nextDay에서 `clues:[]`로 날 초기화).
- **왜 (a)**: 현재 Game.tsx는 P2 이전 흐름(하루 상인 1명 소환, 마을·플레이어 위치 개념 없음)이라 "어느 마을에서 소문을 듣는가"가 없음 → 임시 버튼은 P2에서 걷어낼 throwaway. 노트는 마운트해 빈 상태로 열림, P2에서 마을 진입 시 mergeClues로 채움.
- ⚠️ 한계: 노트 모달 시각 검증은 브라우저 e2e 불가로 미검. tsc/eslint 그린 + 홈 200까지만 확인.
- **P1 완료** (P1-1 세계진실+4마을 / P1-2 소문+인젝션방어 / P1-3 단서노트). 다음 = P2 월드맵·이동·거래(여기서 소문 수집을 마을 진입에 배선).

### P2 착수 — 고향=별도 노드 확정 (2026-07-19, 사용자 승인)
- **월드맵 = 폐허 고향(home) 1 + 상인마을 4.** 상인마을=거래·소문, 고향=건설. 스토리("도시를 다시 세운다")와 정합.
- **건설은 P4 항목**이라 P2에선 고향에 기존 BuildSitePanel을 리스트로 임시 이식만(걷기 없이). 생산·특수템은 P4.
- `LocationId = TownId | "home"` 신설. `travelDays`가 home 처리(4마을과 각 1일 허브), `locationName`·`HOME_NAME`("폐허가 된 고향") 추가.

### P2-1 상태 + /api/town (2026-07-19, 완료)
- `GameState`에 `location: LocationId`(시작 "home"), `townMerchants: PublicMerchant[]` 추가. 기존 `merchant`(흥정 중 상인)는 유지 — townMerchants에서 고른 단건. `initialState` 갱신.
- **신규 `/api/town`**(POST {day,town,bookLevel}) → `{merchants[], rumors[]}`. `deriveWorld→merchantsInTown→generatePublicMerchant` + `generateRumors`를 `Promise.all` 병렬.
- **DRY 리팩터**: 상인 조립을 `lib/server/merchant.ts` `generatePublicMerchant(seed,bookLevel)`로 추출(/api/merchant도 이걸로), 소문 생성을 `rumor.ts` `generateRumors(day,town,bookLevel)`로 추출(/api/rumors도 이걸로). prompt.ts→rumor.ts는 type-only라 런타임 순환 없음.
- 검증: tsc/eslint 그린. /api/town 스모크 — 결정론(2회 동일), 마을 상인 목록(seed 결정론)·소문 동시 반환, **진실 정합**(ne 소문 "고물상 무쇠고개" ↔ 실제 junker가 ne 상인목록에 존재), relic Lv2 잠김·Lv3 해금, /api/merchant 회귀 200.

### P2-2/3/5 월드맵·마을진입·고향건설 (2026-07-20, 완료)
- **월드맵**(`WorldMap.tsx`): 3×3 격자 5노드(고향 중앙, 4마을 모서리). 각 노드에 이동일수 뱃지/"현재 위치". 현재 위치·busy면 비활성. `onTravel(dest)`.
- **Game.travelTo(dest)**: 이동 = 시간의 유일한 흐름(「다음 날」버튼 폐기). `days=travelDays`, `gain=dailyIncome*days` 정산, `day+days`·`location=dest`로 갱신하며 이전 마을의 townMerchants·merchant·haggle·clues 전부 초기화. dest가 마을이면 `/api/town` fetch → `townMerchants` + `clues=rumors`. **이게 P1-3(a)에서 미룬 소문 자동 수집 배선의 완결**(마을 진입 시 노트가 채워짐).
- **startHaggle 시그니처 변경**: `(materialId)`→`(merchant, materialId)`. 이제 TownView에서 고른 상인을 인자로 받아 `state.merchant` 세팅. sendUtterance는 state.merchant를 읽으므로 그대로 유효.
- **마을 진입**(`TownView.tsx`): 좌=상인 목록(초상화 이모지+이름+칭호, 클릭→MerchantPanel 모달→onHaggle), 우=이 마을 소문 리스트(ClueNotebook과 같은 종류 뱃지). 상인 0명이면 "오늘 이 마을엔 상인이 없다." `MerchantPanel`의 `PORTRAIT_EMOJI`를 export해 재사용.
- **고향 건설**(`HomeView.tsx`, P2-5 앞당김): MapView의 BuildSitePanel 로직을 건물 카드 그리드로 재구성(맵 좌표·걷기 제거). checkBuild/canDeposit/deposit/reclaim 그대로 재사용. **앞당긴 이유**: travelTo 루프로 바꾸면서 deposit/reclaim이 미사용→eslint 에러가 되고, 건설 진입점이 사라져 플레이 불가해짐. 별도 서브페이즈로 미루면 그 사이 빌드가 깨짐.
- **제거**: Game.summonMerchant/spawnedRef/자동등장 useEffect/「다음 날」버튼/useRef import. 튜토리얼 문구도 이동 기반 루프로 갱신.
- ⚠️ **MapView.tsx는 이제 데드**(어디서도 import 안 됨). 내 변경이 만든 고아지만 505줄 통짜 파일이라 승인 없이 삭제 안 함 — 사용자 확인 대기.
- 검증: tsc/eslint 그린(신규 3파일 경고 0). /api/town 3일×4마을 스모크 = 마을당 상인 0~3·소문 2~3 결정론 분포 확인(6상인이 매일 재배치). ⚠️ 이동·상인클릭·흥정 클릭 플로우 시각검증은 브라우저 e2e 불가로 미검.
- ⚠️ 남은 P2 = **P2-4 물물교환**: PublicMerchant에 `wants` 필드 없음 → 추가 + barter 라우트/로직. 골드 매매(HaggleDialog)는 배선 완료.

### 건물 확장 + 대성당 목표 해제 (2026-07-20, 사용자 승인 후 구현)
- **세계관 결정**: 현대 전환 검토했으나 **중세 유지**로 확정. 이유 = 현대로 가면 자재·상인업종·아이콘까지 번지고 인트로 애니(직접 제작분)도 다시 그려야 해 마감 리스크. 중세 유지 = 건물 리스트·승리판정만 손대면 됨.
- **대성당은 목표가 아님**: `landmark:true` + `GameState.won` + `LandmarkScreen`("옛 영광이 되살아났다" 팝업) + `milestoneSeen` + `restart` 전부 제거. 대성당은 이제 그냥 income25·xp35의 최고난도 건물(prereq 예배당+영주관, relic 필요). 게임은 정해진 끝 없는 오픈엔드.
- **건물 7→14개** (game-data BUILDINGS): T0 오두막·우물·창고 / T1 방앗간·대장간·여관 / T2 시장·작업장·예배당(minBook2) / T3 성벽(Lv2)·망루(Lv3)·길드회관(Lv3) / T4 영주관·대성당(Lv3). prereq 4단, 기존 자재 13종만 사용(tradability 불변). relic은 대성당에만.
- HomeView BUILDING_ICON에 신규 7개 아이콘 추가(방앗간🌾 대장간⚒️ 여관🍺 작업장🔨 예배당🕯️ 망루🗼 길드회관🏛️ 영주관🏰). HomeView의 landmark ★ 렌더 제거.
- **types의 `landmark?: boolean`는 남겨둠** — 데드 MapView.tsx가 아직 참조. MapView 삭제 승인 나면 이 필드도 같이 제거 예정.
- 검증: tsc 그린, eslint 그린(기존 img 경고 3개만). 자재↔건물 매핑 13종 전부 존재 확인.

### MapView 삭제 + 창고(인벤토리) UI (2026-07-20)
- **MapView.tsx 삭제**(사용자 승인). 월드맵/마을진입 구조로 완전 대체돼 어디서도 import 안 되던 데드 파일. 이와 함께 types의 `BuildingDef.landmark?` 필드도 제거(마지막 참조처가 MapView였음). 잔재 grep 0건.
- **InventoryPanel.tsx 신규**: 헤더 "🎒 창고 (N)" 버튼 → 모달로 보유 자재를 티어별(1기본/2가공/3희귀) 그리드 표시. 어디서든(고향·마을) 확인 가능. 빈 상태 안내 포함. 단서 노트와 같은 모달 패턴.
- ⚠️ **UI는 추후 전면 개편 예정**(사용자 명시) → 창고는 최소 구현으로만. 개편 시 HomeView 상단 자재칩·이 모달을 통합 재설계 예상.
- 검증: tsc 그린, eslint 그린(HaggleDialog img 경고 1개만 잔존 — MapView 삭제로 경고 3→1), 홈 200 + "🎒 창고" 렌더 확인.

### P2-4 물물교환 (2026-07-20, 사용자 승인 후 구현)
- **설계 확정**(사용자): 희귀템 = **tier3 전부**(marble·bronze·stainedglass·relic), 지불 재료 = **상인 wants 중 플레이어가 선택**, 교환비 = **N:1**, UI = **기존 HaggleDialog 재사용**.
- **교환비 산출**(economy `barterRatio`): 시작N = ceil(희귀템 offer0 / 지불물품 base), 하한N = ceil(희귀템 floor / 지불물품 base), 최소 1. 흥정 카테고리로 호감도↑ → `priceAt(baseN, floorN, disposition)`로 N을 깎음(골드식과 동일 공식·판정 재사용). currentPrice 필드를 골드=가격/물물교환=N개로 겸용.
- **첫 턴 후 확정**: 지불물품 base는 클라에 노출 안 하는 게 원칙(game-data 주석)이라 시작 N을 클라가 못 구함 → startBarter는 currentPrice 0으로 열고, 첫 흥정 턴 서버 응답이 N을 채운 뒤에야 교환 버튼 활성. 다이얼로그에 "흥정으로 교환비를 정한 뒤 교환" 안내.
- **서버 검증(2레이어 유지)**: /api/haggle `mode:"barter"` 분기가 (a)대상 mat.tier===3 (b)payMaterialId가 유효 자재 (c)**day로 deriveWorld 복원해 그 상인의 wants에 payMaterialId 포함** 확인. 클라가 임의 재료로 싸게 교환하는 걸 서버가 차단. seed는 (day,i)에서 나오므로 day 필수.
- **wants 노출 경로**: world.ts엔 이미 `WorldMerchant.wants` 존재 → PublicMerchant.wants({id,name}[]) 신설, buildPublicMerchant/generatePublicMerchant/api/town이 전달. /api/merchant 단건은 wants=[] 기본값.
- **지불/수령**: Game.buy가 barter 분기 — 창고에서 지불물품 N×수량 차감(보유 부족이면 거부), 희귀템 수량 지급, 골드 불변. maxQty도 골드 대신 창고 보유량 기준.
- **UI**: MerchantPanel 하단에 초록 "🔄 물물교환" 섹션(파는 tier3 미잠금 항목 → "교환 ▸" → wants 칩으로 지불재료 선택 → onBarter). HaggleDialog는 mode==="barter"면 헤더/상태바/구매버튼 문구를 교환비·개수로 전환.
- 검증: tsc/eslint 그린(신규 경고 0, 기존 img 1개만). /api/haggle 스모크 — 정상 barter(bronze←wood, N=10), 원치않는물품 거부, tier2 거부, day누락 거부, 골드모드 회귀 200 전부 확인. ⚠️ 흥정 다중턴으로 N 감소·교환 클릭 시각검증은 브라우저 e2e 불가로 미검.
- **P2 완료** (P2-1~P2-5 + P2-4). 다음 = P3 경제/뉴스.

### 인트로 컷 추가 삭제 (2026-07-20)
- 재생 순서 5·6번째(06-book-blur·07-book-read) 컷 제거 → 04-relic 다음 바로 08-awaken. 총 11→9컷. 이미지 파일은 남기고 SCENES 참조만 제거. 폐기 컷 = 05·06·07·09.

### P2-6 아이소메트릭 건설맵 + 인스턴스 데이터 모델 (2026-07-20, 사용자 승인 후 구현)
- **사용자 결정**: (1) 같은 건물 복수 배치 허용, (2) 기존 HomeView 완전 대체, (3) 7×7 그리드. 인터랙션 = 드래그 + 클릭 컨펌 둘 다(레퍼런스=현대 도시빌더 스샷, 조작·레이아웃만 참고, 게임은 중세 유지).
- **데이터 모델 리팩터**(game-state.ts): `built: string[]` + `progress: {건물id→자재id→수량}` → **`placements: Placement[]`**로 교체. `Placement = {id(인스턴스 고유), buildingId(종류), x, y, progress(자재id→수량), built(완공여부)}`. 같은 종류를 여러 채 지을 수 있어 인스턴스 id로 구분.
  - 헬퍼 재작성: `dailyIncome(placements)`=완공 건물 income 합, `builtTypes(placements)`=완공 종류 Set(선행 게이팅용), `checkPlace(buildingId,state)`=새 배치 가능 여부(선행·책, 복수배치라 alreadyBuilt 제한 없음, missingPrereq 반환), `checkPlacement(placement)`=인스턴스 슬롯 진행, `canDeposit(placement,materialId,state)`=인스턴스 투입 가능 여부. 옛 `checkBuild`는 제거.
- **Game.tsx**: `deposit(placementId, materialId)`/`reclaim(placementId)`을 인스턴스 id 기준으로 재작성(reclaim은 자재 반환 + **타일까지 반납**=철거). `placeBuilding(buildingId,x,y)` 신설(crypto.randomUUID로 인스턴스 id, 점유 타일·게이팅 방어). income·travelTo gain·dep array를 placements 기준으로 교체.
- **IsoCityMap.tsx 신규**(HomeView 대체, 파일 삭제): 7×7 CSS 다이아몬드 타일(clip-path polygon, TW64×TH32, `left=(x-y)*32+offset, top=(x+y)*16`), 건물 스프라이트(이모지+미완공 %오버레이·grayscale), 건물 팔레트(선행·책 게이팅+툴팁), 인스턴스 자재 투입 패널(투입/회수), 줌 −/＋ 툴바(0.6~1.6배 transform scale).
- **인터랙션 = 탭/클릭 + 드래그 병존**: (탭) 팔레트 건물 선택 → 빈 타일 탭 배치 / 건물 타일 탭 → PlacementPanel에서 투입·회수. (드래그, Pointer Events) 팔레트 카드→빈 타일 끌어놓기 배치 / 인벤토리 자재칩→미완공 건물 끌어놓기로 1개 투입.
- **드래그 구현 세부**: window pointermove/pointerup 리스너(useEffect). `dragRef`(startX/Y·moved), 6px 임계 넘어야 드래그로 간주(탭과 구분), `didDragRef`로 드래그 뒤 따라오는 click(선택 토글) 억제. 드롭 타일은 **elementFromPoint 대신 아이소 역변환 수학**으로 판정(스프라이트 가림 회피) — `boardRef.getBoundingClientRect()`로 scale 보정 후 `x=round((a+b)/2), y=round((b-a)/2)`. 포인터 따라다니는 고스트(fixed, pointer-events-none). 자재 드래그 중 미완공 건물에 emerald ring 강조.
- **팬** = 커스텀 없이 보드 컨테이너 `overflow-auto` 네이티브 스크롤(줌>100%일 때 스크롤바로 이동).
- **창고 UI 통일**(사용자 결정): 드래그 소스는 맵 상단 `InventoryStrip`(라벨 "🎒 창고 — 자재를 건물로 끌어다 채운다") 하나로 명확화. 헤더의 창고 모달 버튼은 **고향에선 숨김**(`state.location !== "home"`), 마을에서 확인용으로만 유지. 이유 = 모달이 맵을 덮어 뒤 건물로 드롭 불가 → 드래그 소스와 뷰어를 분리.
- **eslint 함정**: React19 `react-hooks/refs` 규칙이 "ref를 만지는 함수를 JSX 인라인 핸들러로 전달"을 render 중 ref 접근으로 오인 → 에러. 팔레트처럼 **자식 컴포넌트에 핸들러를 prop으로 넘기면** 회피됨(인벤토리 칩을 `InventoryStrip` 자식으로 추출).
- 검증: tsc 그린, eslint 그린(신규 파일 경고 0, 기존 HaggleDialog img 경고 1개만), 홈 200. ⚠️ 탭·드래그 배치·투입 시각검증은 브라우저 e2e 불가로 미검 — 사용자 수동 플레이 필요.
- **(2026-07-20 후속)** playwright로 P2-6 시각검증 **완료** — 7×7 배치·건물 렌더(0% 오버레이) 확인. Playwright bbox-center 클릭은 다이아몬드 오버랩으로 타임아웃(자동화 아티팩트, 실제 클릭/드래그·DOM 클릭은 정상). 향후 e2e는 iso 역변환 좌표로 클릭할 것.

### 월드맵 모달화 + 고향맵 auto-fit (2026-07-20, 사용자 승인 후 구현)
- **사용자 결정**: (1) 상단 인라인 월드맵 → **모달**로 전환, 노드 클릭 시 이동+모달 닫힘. (2) 마을·고향 어디서든 같은 모달로 **통일**(헤더 `🗺️ 이동` 버튼). (3) 고향 아이소맵을 **auto-fit**으로 화면 최대 비율. 근거 = 인라인 월드맵이 세로 공간을 크게 먹어 아이소맵이 눌렸음.
- **Game.tsx**: `showWorldMap` 상태 + 헤더 amber `🗺️ 이동` 버튼(항상 노출). `main`에서 인라인 `<WorldMap>` 제거. 고향이면 `main`을 전체폭(`w-full`, max-w 해제), 마을이면 기존 `max-w-5xl` 유지로 분기. 모달 래퍼 `WorldMapModal`(신규, 파일 내 로컬 컴포넌트) = 오버레이(`fixed inset-0 z-40` backdrop-blur) 안에 **기존 `WorldMap` 그대로 재사용**(WorldMap.tsx 무수정). onTravel = `setShowWorldMap(false)` 후 `travelTo(dest)`.
- **IsoCityMap.tsx auto-fit**: `scale` 단일 상태 → `fitScale`(자동)×`zoom`(사용자 ±배율, 0.6~1.6) 분리, `scale = fitScale*zoom`. 보드 영역(`boardAreaRef`)에 `ResizeObserver` 달아 `fitScale = min((clientW-32)/BOARD_W, (clientH-32)/(BOARD_H+TH))` 실측 산출(리사이즈 추종). 보드 영역 높이 `72vh` + `flex items-center justify-center`로 다이아몬드 중앙 배치. **스프라이트 상단 오버플로 TH**는 fit 높이에 `+TH` 포함 + 내부 boardRef `top: TH*scale`로 헤드룸 확보(잘림 방지). toTile 역변환은 boardRef rect를 `/scale`하므로 top 오프셋에 영향 없음(그대로 정상).
- 검증(brower): tsc/eslint 그린. 이동 버튼→모달(5노드·현재위치 강조)→삼목골 클릭→일차 1→2·소문2·단서노트2·모달닫힘 확인. 고향맵 전체폭+7×7 auto-fit 확인. 콘솔 에러 0. ⚠️ 트레이드오프 = 튜토리얼 닫아도 페이지 총높이 915>뷰포트720이라 팔레트 보려면 ~195px 스크롤(다이아 크게 유지 우선, 사용자 "최대 비율" 의도 반영). UI 전면 개편 시 flex-fill로 무스크롤화 여지.

### 도움말 모달화 + 아이소맵 크기제한 해제 + 드래그 팬 (2026-07-20, 사용자 지시)
- **사용자 지시 3건**: (1) 도움말(튜토리얼)도 모달로, (2) 아이소맵 크기 제한(높이 맞춤 축소) 두지 말고, (3) 마우스로 보드를 끌면 그 방향으로 팬.
- **도움말 모달화**(Game.tsx `Tutorial`): 인라인 배너(`mx-auto mt-3 max-w-6xl`) → `fixed inset-0 z-40` 오버레이(backdrop-blur, 배경/닫기 클릭으로 닫힘, `max-w-2xl` 중앙). `showTutorial` 기본 true 유지 → 인트로 종료 후 자동 1회 노출(온보딩). 내용은 무변경.
- **크기제한 해제**(IsoCityMap): P2-7의 auto-fit이 `min(폭,높이)`로 **높이에 맞춰 축소**하던 걸, **폭만 맞춤**(`fitScale = (clientW-32)/BOARD_W`)으로 변경. 세로는 제한 없이 넘치면 팬. 결과 배율 ~1.9→~2.7로 커짐(타일 확대). `flex items-center justify-center` 제거하고 내부 박스 `mx-auto`(블록 margin-auto는 오버플로 시 0마진이라 스크롤 안전, flex 센터링 버그 회피). 줌 상한 1.6→3.
- **드래그 팬**(IsoCityMap): 보드영역 `onPointerDown`(마우스 한정, `pointerType!=='mouse'`면 네이티브 스크롤에 위임)에서 시작점·scrollLeft/Top 기록 → window pointermove로 `el.scrollLeft/Top = 시작scroll - 이동량` 갱신(그 방향으로 팬). 6px 임계(DRAG_THRESHOLD 재사용) 넘으면 `didPanRef=true`로 뒤따르는 타일/스프라이트 click(배치·선택) 억제. 다음 pointerdown에서 `didPanRef=false` 리셋 → 깨끗한 탭은 정상 배치. 팔레트 카드·인벤토리 칩은 보드영역 밖이라 팬과 무충돌(기존 배치 드래그 그대로).
- 검증(browser): tsc/eslint 그린. 도움말 모달 자동노출·닫힘 확인. 맵 폭꽉참+세로오버플로(scrollH706>clientH516) 확인. 합성 마우스 드래그 팬 scrollTop 0→150 확인. **팬 후 탭 배치 정상**(sprites=1·occupied=1). 콘솔·서버 에러 0. ※ playwright bbox클릭은 여전히 다이아 오버랩으로 타임아웃 → DOM/합성 pointer로 검증(자동화 아티팩트, 실사용 무관).

### 무한 타일 평면 + 카메라 팬 (2026-07-20, 사용자 지시 — P2-7/P2-8의 고정격자·auto-fit 대체)
- **사용자 의도 정정**: 고정 7×7이 아니라 **경계 없는 무한 타일 평면**을 드래그로 카메라 옮겨가며(타일이 드래그 방향으로 밀림) 어디든 건설. 무한 캔버스형 도시빌더. → **진짜 무한(가시영역 가상화)** 채택(사용자 선택).
- **IsoCityMap 렌더 구조 교체**(P2-7/P2-8의 auto-fit·fit-width·스크롤 팬 폐기):
  - 좌표계: `GRID/OFFSET/BOARD_W/H/tilePos` 제거 → `worldPos(x,y)={(x-y)*32,(x+y)*16}`(경계보정 없음). 화면좌표 = `worldPos*scale + pan`. `pan{x,y}`=카메라 오프셋(화면px).
  - 팬: 보드영역 `overflow-hidden`, 배경 마우스 드래그(pointerdown→window pointermove)로 `setPan(startPan + 이동량)`. 음수 좌표 포함 사방 무한. 6px 임계·`didPanRef`로 뒤따르는 타일 click 억제(탭 배치 무영향). 터치/펜은 미처리(데스크톱 데모).
  - 가상화: 뷰포트(ResizeObserver로 실측) 네 모서리를 역변환해 타일좌표 범위(txMin~txMax,tyMin~tyMax) 산출 → 그 범위만 순회하며 화면 밖 타일 컬링. 렌더 타일 ~600개. 타일·스프라이트를 좌표 순회 중 함께 push(스프라이트는 점유타일에만). zIndex=1000+tx+ty(타일)/100000+tx+ty(스프라이트).
  - 카메라 초기화: 최초 측정 시 원점(0,0)을 뷰포트 중앙에 오도록 `pan={w/2,h/2}`(panInitRef 1회).
  - 줌: `scale` 상태(기본 1.2, 0.5~3). `zoomTo(nz)`=뷰포트 중앙 월드점 고정하며 확대(pan 재계산). 건물 이모지 `fontSize:30*scale`로 줌 따라 커짐(타일 크기도 `TW*scale` 직접 반영, 부모 transform 제거).
  - toTile(드롭 배치): boardArea rect + `(cx-rect.left-pan.x)/scale` 역변환, 경계검사 없음. deps에 pan 추가.
- **불변**: BuildingPalette/InventoryStrip/PlacementPanel/ZoomBtn/BUILDING_ICON, Game.tsx, 배치·투입·흥정·이동 로직, 데이터 모델(Placement{x,y}는 무한 좌표 허용).
- 검증(browser): tsc/eslint 그린. 무한 격자 렌더(가시 605타일, 좌표 −16~16 **음수 포함**). 오두막 (0,0) 탭 배치 확인. **드래그 팬 → 건물이 드래그 방향으로 이동**(중앙→우하단) + 팬 후 좌표범위 −16~16 → **−23~9로 이동(새 타일 계속 생성)** 확인. 콘솔 에러 0.
- ⚠️ 성능: 팬 1픽셀마다 ~600 타일 버튼 리렌더. 데모 규모는 OK지만 저사양·과확대 시 버벅일 수 있음 → 필요 시 컬링 타이트닝/버튼 경량화 여지. 빈 타일 대비 여전히 낮음(격자 옅게 보임) — UI 개편 시 조정.

### [버그픽스] 모달이 타일에 가려짐 — 보드 stacking context 격리 (2026-07-20)
- **증상**(사용자 신고): 단서 노트 모달 X/본문이 안 눌림. → 재현: 홈에서 노트 열고 모달 본문(640,300) elementFromPoint = **타일 버튼(z:990)**, 모달(z-40) 아님. 타일이 모달을 덮어 클릭 가로챔.
- **근본원인**: P2-9에서 보드 `transform: scale()` 래퍼(스태킹 컨텍스트 생성원)를 제거 → 타일/스프라이트 z-index(981~100000)가 **루트 스태킹 컨텍스트로 새어나가** 모든 모달(z-40)을 이김. 모달 본문(보드영역과 겹치는 y)이 타일에 가려짐. 페이지 스크롤 시 X까지 보드 위로 올라와 가려질 수 있음. **홈 위 모든 모달(튜토리얼·월드맵·창고·흥정·노트) 공통 영향**.
- **수정**: 보드영역 div에 `isolate`(CSS `isolation: isolate`) 1개 추가 → 새 스태킹 컨텍스트 형성, 타일 z-index를 보드 내부로 가둠. 보드 자체는 in-flow(z-auto)라 fixed z-40 모달들 아래로. 1줄 최소 수정.
- **기각 가설**: (a)핸들러 파손 → DOM `.click()`으로 튜토리얼/노트 모두 닫힘, 정상. (b)playwright 클릭 실패 = 앱 버그 → 보드 잦은 리렌더로 snapshot ref가 stale(e1352 not found)일 뿐, 자동화 아티팩트. (c)인트로 오버레이(z-60) → 테스트 셋업에서 START GAME 미클릭 잔재였고 실사용 무관.
- 검증: tsc/eslint 그린. 수정 후 모달 본문 위 elementFromPoint = 모달 오버레이(z-40), X clickable=true, 스샷 깨끗. 팬/배치(sprites=1) 여전히 정상. 콘솔·서버 에러 0.

### P3-1 마을 특산 할인 + 가격식 토대 (2026-07-20)
- **설계**: P3 가격식 = base × markup × townMult × (eventMult·scarcityMult는 P3-2/3). P3-1은 **townMult**만. 특산 물품을 그 업종 마을에서 사면 ×0.8(`SPECIAL_TOWN_DISCOUNT`). 품귀 상태는 클라 recentBuys를 서버 전송(P3-2 예정), 뉴스/이벤트는 day 결정론(P3-3 예정).
- **구현**: economy `townMultiplier(townId,id)` = 특산이면 0.8 else 1. `deriveMerchant(seed, townId?)`가 offer0=round(base×markup×tm×(1+var)), floor=min(offer0, round(floorbase×markup×tm)). **rng 호출 순서 불변**(townMultiplier는 rng 미사용)이라 기존 variance/stock 결정론 유지. townId 없으면 tm=1(world.ts의 배치판정용 deriveMerchant 호출은 그대로).
- **양쪽 일관성**(표시가=거래가): /api/town은 요청 `town` 전달, /api/haggle은 `deriveWorld(day).merchants.find(seed).townId` 전달. 상인은 그 town에 있으므로(merchantsInTown) 두 town 동일 → 같은 offer0/floor. barter의 world 조회도 이 wm 재사용(중복 제거).
- **검증**(dev 서버, 결정론): 표시 8일×4마을 136건 중 특산 56건 floorHint 정확(0실패). floor는 variance 없어 `round(floorbase×markup×tm)` 정밀 대조 가능 — 이게 이번 검증의 핵심 seam. 거래 8건 흥정가 모두 할인 [floor,offer] 범위 내. tsc/eslint 그린.
- **테스트 함정**: 만물상(general)만 markup 1.15 → 검증식에 markup 반영 필요(초기 실패는 이걸 빠뜨린 테스트 버그였음, 코드 정상).
- **다음**: P3-2 품귀(recentBuys, 이동 감쇠) → P3-3 뉴스+대풍작 이벤트.

### P3-2 품귀(scarcity) (2026-07-20)
- **설계**: 플레이어가 최근 많이 산 자재일수록 시세↑, 이동으로 완화. `scarcityMult = 1 + min(0.8, count×0.05)`(구매 1개당 +5%, 최대 +80%). 가격식 = base × markup × townMult × **scarcityMult**. townMult처럼 offer0·floor 양쪽에 곱해 하한까지 올려 "붙박이"(흥정으로 다 깎아도 오른 시세 유지).
- **상태**(game-state): `GameState.recentBuys: Partial<Record<MaterialId,number>>` 추가(init {}). buy 시 획득 자재 += qty(골드·물물교환 둘 다). 이동 시 `decayRecentBuys(rb, days)` = max(0, v − days×3), 0이하 제거. `RECENT_BUY_DECAY_PER_DAY=3`.
- **배선**: economy `scarcityMultiplier(recentBuys,id)` + `deriveMerchant(seed, townId?, recentBuys?)`. merchant.ts·/api/town·/api/haggle에 recentBuys 전달(zod `z.record(z.string(),z.number()).optional()`). 클라 Game.tsx: travelTo에서 decay 후 /api/town에 전송·상태반영, buy에서 증가, sendUtterance(/api/haggle)에 state.recentBuys 전송. useCallback deps에 state.recentBuys 추가.
- **표시=거래 일관**: 둘 다 같은 recentBuys를 같은 deriveMerchant에 전달. ⚠️ 마을 안에서 산 직후엔 표시 offer는 다음 town fetch 전까지 안 바뀜(haggle은 live 반영). 데모 허용, 품귀는 주로 방문·날짜 간 기제.
- **검증**(dev 서버, 결정론): 표시 101건 floorHint = round(floor×markup×townMult×scarcityMult) 0실패 + 품귀 offer ≥ 기본 offer 단조 0위반. 거래 8건 흥정가 count0<4<10 단조증가(예 nw wood 7→9→12) — count↓=이동감쇠와 동종이라 감쇠 방향도 함께 확인. 클라 이동(decay 경로) 콘솔 0에러. tsc/eslint 그린. (dev.err.log의 unhandledRejection은 이전 playwright eval 잔재 — 파일잠금으로 못 비웠을 뿐, 신규 재현 0)

### P3-3 아침 뉴스 + 대풍작 이벤트 (2026-07-20) — P3 완료
- **설계**: `dailyEvent(day)` 결정론(약 45% 날에 한 마을 대풍작 → 그 마을 특산품 ×0.5 폭락). 가격식 최종 = base × markup × townMult × **eventMult** × scarcityMult. 특산 할인(0.8)과 겹쳐 이벤트 마을 특산 = ×0.4 = 차익 기회.
- **economy**: `DailyEvent`, `dailyEvent(day)`(mulberry32(day별 시드), EVENT_CHANCE 0.45, EVENT_CRASH 0.5), `eventMultiplier(day, townId, id)`(이벤트 마을 && 그 마을 특산일 때만 0.5). `deriveMerchant(seed, townId?, recentBuys?, day?)` 4번째 인자 day 추가.
- **뉴스 파이프라인**: `news.ts`(`marketEvent(day)`=공개 서술{townName·industryName·materialNames·pct}, `generateNews(day)`=이벤트+LLM헤드라인/폴백). prompt `newsSystem/newsUser/fallbackHeadline`. `/api/news`(POST day). 타입 `MarketEvent`·`DailyNews`(types/game).
- **배선**: merchant.ts·/api/town·/api/haggle에 day 전달(표시·거래 동일 이벤트가). 클라 Game.tsx: `news`/`lastNewsDay` 상태, travelTo에서 newDay>lastNewsDay면 /api/news 논블로킹 페치→`NewsModal`(z-40, 목적지 무관). 뉴스는 "어디가 싸다"를 알려주는 전역 방송(도착 마을과 무관).
- **검증**(dev 서버): 14일 중 이벤트 7/평온 7. **뉴스↔시세 대조 231건 0실패** — 이벤트 마을 특산 floorHint=round(floor×markup×0.8×0.5), 그 외/비이벤트 마을 정상, pct=50 일치. 브라우저: 평온일 모달("잔잔한 장세")·이벤트일 모달("무쇠고개 광업 대풍작 −50%, 석재·강철·청동·대리석·고철") 정상 렌더, 콘솔 0에러. tsc/eslint 그린. (헤드라인은 API키 없어 폴백 경로 확인 — 키 있으면 LLM.)
- **P3 완료**: 가격식(마을×이벤트×품귀×하한클램프) + 특산 할인 + 품귀 + 대풍작/뉴스 전부. 다음 = P4(도시 건설 연결·생산·특수아이템) 또는 P5(배포·산출물).

### P4 착수 + P4-1 생산 시스템 (2026-07-20)
- **사용자 결정**: (a) 생산 모델 = **고정 산출**(투입→산출 공정 아님), (b) 판매처 = **아무 상인**(시장 건물 불필요), (c) 특수아이템 조건은 P4-3에서 확정(기본안: 흥정 호감도 임계 돌파).
- **P4-1 생산**: `BuildingDef.produces?: Partial<Record<MaterialId,number>>` 추가. 고정 산출 배정 — 방앗간 cloth1·대장간 steel1(T1) / 작업장 planks2(T2) / 길드회관 marble1(T3). "상위 발전=상위 티어 생산품 해금"이 prereq·minBook 사슬로 자연 게이팅(marble=tier3는 T3 길드회관에서).
- **정산**: `dailyProduction(placements)`(완공 건물 produces 합) 신설. Game.travelTo에서 income(gold)과 동일 패턴으로 `inventory[id] += dailyProduction(s.placements)[id] × days`. 도착 notice에 "생산: 강철 3, ..." 붙임(home·마을 공통). 생산은 목적지 무관·이동 일수만큼(건물은 자리 비워도 생산).
- **UI 슬롯**: 팔레트 카드·완공 PlacementPanel에 🏭 생산 라벨(MATERIAL_NAME 재사용).
- **검증**: 팔레트 UI가 실제 produces 데이터 표시(🌾방앗간 천·밧줄+1 / ⚒️대장간 강철+1 / 🔨작업장 판자+2 / 🏛️길드회관 대리석+1) — 렌더 소스=dailyProduction 소스라 실데이터 배선 확인. dailyProduction 합산·복수배치·정산×days·팬텀없음 로직 6케이스 0실패. income 정산과 동일 패턴(기검증). tsc/eslint 그린. ⚠️ 완전 e2e(생산자 건설→이동→재고)는 모든 생산건물이 선행 사슬(자재 ~30개 구매) 뒤라 자동화 비현실적 → 미실행, 수식 단위검증+실데이터 UI로 대체.
- **다음**: P4-2 잉여 자재 판매(아무 상인, 구매의 역) → P4-3 고호감도 특수아이템.

### 마을 거리 다양화 (2026-07-20, 사용자 요청)
- 기존 균일(고향→전 마을 1일, 마을간 1/대각선 2)이라 이동 선택 무게가 없어 **거리 프로필 차등화**. 대칭 유지.
- 고향거리: 삼목골 1 / 무쇠고개 2 / 베틀마을 2 / 유리섬 3. 마을간: 삼목골-베틀 1, 삼목골-무쇠·무쇠-유리·베틀-유리 2, 삼목골-유리·무쇠-베틀 3. 값 범위 1~3. game-data `TOWNS.neighbors` + `HOME_NEIGHBORS` 수정.
- 컨셉: **삼목골=허브**(가깝고 연결 좋음), **유리섬=오지**(멀지만 유리·스테인드글라스 특산). 원거리일수록 경과일↑ → 수입·생산 누적·품귀 감쇠·이벤트 조우 확률↑ (P3/P4와 연동). 검증: 대칭·제안값 일치, 월드맵 표시 1/2/2/3 확인.

### [버그픽스] 대풍작 이벤트 4일 지속 (2026-07-20, 거리 다양화 후속)
- **증상**(사용자): 대풍작 뉴스가 떠도 마을간 거리(≥2일) 때문에 도착 시점엔 이벤트 소멸 → 사실상 도달 불가. 뿌리 = P3-3의 `dailyEvent(day)`가 **하루짜리 + 당일 공지**라, 뉴스 듣고 이동(거리만큼 날 경과)하면 다른 날이 됨.
- **수정**: `dailyEvent`를 **4일 윈도우** 단위로. `window=floor((day-1)/EVENT_DURATION)`, seed=window. 같은 윈도우 4일은 동일 이벤트. `EVENT_DURATION=4 ≥ 최대 이동거리 3` → 뉴스 듣고 이동해도 이벤트 살아있음. 거리·EVENT_CHANCE(0.45)·CRASH(0.5)는 유지.
- **트레이드오프**: 윈도우 경계날(3~4일차)에 들으면 이동 중 다음 윈도우로 넘어가 놓칠 수 있음(슬라이딩 아닌 고정 윈도우라). 대부분 날은 도달 가능이라 허용. 이벤트 밀도는 ~45%(날 기준) 유지되며 4일씩 뭉침.
- 검증: 윈도우 12개 중 이벤트 5(~42%)·윈도우내 4일 일관성 OK, 무쇠고개 이벤트 윈도우 특산 폭락(×0.4) 9건 0실패, tsc 그린.

### 이벤트 슬라이딩 윈도우로 리팩터 (2026-07-20, 위 고정윈도우 대체)
- 고정 4일 격자(1~4,5~8…)는 경계날 아티팩트가 있어 **슬라이딩**으로 교체. `eventStartingOn(s)`(그 날 대풍작 시작 여부·마을을 seed로 결정, `EVENT_START_CHANCE=0.14`) + `dailyEvent(day)`=최근 DURATION(4)일 내 시작 중 **가장 최근 것 채택**(남은 지속일 최대화). 이벤트가 아무 날에나 시작해 4일 지속, 겹치면 최신 승(예 무쇠11-12→베틀13-16).
- `EVENT_START_CHANCE 0.14` 근거: 커버리지 = 1-(1-0.14)^4 ≈ 45%. 실측 100일 36%(표본변동).
- 검증: news↔price 231건 0실패. 슬라이딩 100일 — 콜드스타트(평온→이벤트)마다 연속 이벤트 ≥4일(도달성 위반 0), 콜드스타트 day%4 분산({0,3})으로 격자 비정렬 확인. tsc/eslint 그린.
- **잔여 한계**: 이벤트 4일차(마지막날)에 처음 들으면 3일 이동으론 여전히 못 감(유한 이벤트+당일 공지의 본질적 한계). 완전 해결은 '며칠 전 예고' 필요 — 추후 옵션.

### P4-2 잉여 자재 판매 (2026-07-20)
- **설계**: 아무 상인 판매(시장 건물 불필요). `sellPrice(day,townId,id) = round(base × townMult × eventMult × SELL_RATE)`, SELL_RATE=0.5. **품귀·markup 제외**. SELL_RATE 0.5 < 구매 하한 비율(floor≈0.6) → 같은 마을 즉시 되팔기 손해 = 무한차익 차단. 마을·이벤트배수는 반영 → 대풍작 마을에서 싸게 사서 다른 마을에 팔면 차익(시세가 마을마다 다름).
- **배선**: economy `sellPrice`+`allSellPrices(day,townId)`. /api/town 응답에 `sellPrices`(13종 전부). GameState `sellPrices`(마을 진입 시 서버가 채움, home·이동 시 {}로 클리어). Game.tsx `sell(id,qty)`=gold+=price×n, inventory-=n(buy의 역, 클라 상태). TownView 우측에 "🪙 잉여 자재 팔기" 패널(보유 자재별 개당가 + 1개/전부 버튼).
- **검증**: 서버 판매가 정확도 416건 0실패(=round(base×tMult×eMult×0.5)), 판매가<구매하한 136건 0위반(무한차익 차단), wood 마을별 편차(nw 4 vs 타 5, 차익 성립). 브라우저: 삼목골서 목재 구매(골드 400→391) → 판매패널 목재 개당4 표시(9구매>4판매) → 판매(391→395·인벤 −1·행 사라짐), 콘솔 0에러. tsc/eslint 그린.
- **다음**: P4-3 고호감도 특수 아이템(흥정 호감도 임계 돌파 → 특수템 획득 → 상위 건물 요구).

### P4-3 고호감도 특수 아이템 "상인의 신표" (2026-07-20) — P4 완료
- **사용자 결정**: 획득 조건 = 흥정 호감도 ≥90 도달 시 선물, 요구 건물 = 영주관 + 대성당(최상위 2개).
- **구현**: 새 MaterialId `token`(상인의 신표, tier3). 기존 건설·투입·인벤토리 UI를 그대로 재사용하되 경제에선 격리:
  - types MaterialId += token, game-data MATERIALS += token, 영주관·대성당 requires에 token:1.
  - economy PRICES에 token 더미(base 0, 값 미사용) — Record 타입 충족용. `allSellPrices`에서 token skip(판매 불가). `TOKEN_DISPOSITION=90` export.
  - world `pickWants`에서 token 제외(상인이 원하지 않음 → 물물교환/소문 대상 아님).
  - /api/haggle: body에 `tokenAwarded`, `gotToken = !tokenAwarded && newDisposition>=90` 계산해 응답. HaggleState에 tokenAwarded(1회 제한).
  - Game.tsx: startHaggle/startBarter가 tokenAwarded:false 초기화, sendUtterance가 tokenAwarded 전송 + gotToken이면 inventory.token+=1 & 시스템 로그("상인이 크게 감복해…").
  - TownView 판매 패널은 sellPrice 있는 자재만(신표는 sellPrices에 없어 자동 제외).
- **검증**: 서버 — 판매가에 token 없음, disp100·미수령→gotToken=true, 이미수령→false, disp50→false. 건물 requires에 token:1(영주관·대성당) 확인. 브라우저 — 흥정 정상(대량구매 판정·값↓·호감도 25→37%), 신표 필드 통합 후 콘솔 0에러, 저호감도라 미지급(정상). tsc/eslint 그린. ※ 호감도 90 도달→인벤토리 신표 풀 e2e는 90 도달이 의도적으로 어려워 자동화 미강제(서버 gotToken + 클라 += 각각 검증).
- **P4 완료**: 건설(P2)·생산(P4-1)·잉여판매(P4-2)·특수아이템(P4-3). 다음 = P5(배포·시연영상·소개서, 마감 2026-08-10) 또는 밸런스/폴리시.

### UI 반영 시작 — 아이소맵 건물 스프라이트 (2026-07-20)
- **방향**: 다음은 배포 아님, **UI 전면 반영**(아트→슬롯). 아이소맵부터.
- **에셋**: 사용자가 itch에서 *Isometric Realm — Medieval* (JP Cummins) 구매 → `Downloads/Isometric_Realm_Medieval.zip`. 의미별 폴더가 14건물과 1:1(Huts Tents·Mills(windmill)·Blacksmiths·Shops Markets·Churches(cathedral/chapel)·Towers(guardtower)·Walls·Castles(castlekeep)·Halls Manors(hall)·Houses·Misc(well)). 하이레졸(287~1510px), 그림자 baked(noshadow는 1개뿐이라 shadow 통일). **라이선스=크레딧 표기**(README 추가함).
- **반영**: 선택 14개+바닥타일을 max512로 다운스케일해 `public/buildings/{id}.png`·`public/tiles/ground.png`(3.3MB). IsoCityMap: 이모지 `BUILDING_ICON`→`<img>` 스프라이트 4곳(맵·팔레트·드래그고스트·투입패널). 맵 스프라이트는 **바닥중앙 앵커**(left+tileW/2, top+tileH/2 지점에 translate(-50%,-100%)) → 타일 위로 솟음. `BUILDING_SPRITE_SCALE=2.3`, TW/TH 64/32→72/36. 미완공=grayscale+0%뱃지.
- **바닥 격자**: CSS clip-path 다이아몬드 유지(ground.png 테셀레이션 리스크 회피). **인라인 backgroundColor 체커보드**(흙색 rgba, even/odd) + `hover:brightness-150`. ※ Tailwind 임의 hex+투명도(`bg-[#hex]/35`)는 컴파일 안 됨(computed 투명) → 인라인 style로 해결.
- 검증: tsc 그린, lint img 경고 4(기존 관행). 브라우저 — 팔레트 14썸네일 로드, 오두막 배치 시 실제 아이소 건물이 흙색 격자 위 렌더, 콘솔 0에러. img 경고는 <img> 사용(next/image 대신, 게임 스프라이트 다수라 의도적).
- **백로그 아이디어(사용자)**: 특수 타일(잔디 등) 파는 전용 마을 추가 — 지금 말고 나중.
- **남은 UI**: 월드맵 모달·마을(상인목록/초상화)·흥정창·모달들 톤 통일. 바닥 실타일(ground.png)·건물 앵커 미세조정은 폴리시 단계.

### 배치 건물 편집 — 이동·회전·삭제 (2026-07-20, 사용자 지시)
- **사용자 결정**: 건물패널→모달, 회전=좌우반전, 삭제=자재반환.
- **데이터**: `Placement.flipped?` 추가(좌우반전). Game 핸들러 — `moveBuilding(id,x,y)`(빈 타일만), `rotateBuilding(id)`(flipped 토글), `reclaim` 완공 제한 제거해 삭제=완공 무관 자재 전량 반환.
- **PlacementPanel→모달**(fixed z-40): 헤더 스프라이트 프리뷰(flipped 반영), 미완공 자재 슬롯, 하단 이동/회전/삭제 버튼 + "삭제 시 자재 전량 반환" 안내.
- **이동 모드**(`movingId` 상태): 이동 클릭→모달 닫고 모드 진입. 타일색 = 빈 터 초록(rgba(34,197,94,.45))·다른 건물 빨강(rgba(220,38,38,.6))·옮기는 자기 타일 하늘색. 옮기는 건물 스프라이트 opacity-40. 빈 타일 탭→이동+종료, 제자리 탭→취소, 빨강 무시. 상단 안내 배너+취소.
- **회전**: 맵 스프라이트·모달 프리뷰 img에 `transform: scaleX(-1)`.
- 검증(브라우저): 모달 3버튼, 회전 시 해당 건물만 matrix(-1,0,0,1,0,0), 이동 모드 초록498/하늘1(1채)→2채 시 빨강1, 이동 완료(모드종료), 삭제 2→1채. 콘솔 0에러, tsc/eslint 그린(img 경고).

### [버그픽스] 타일 클릭이 앞 타일로 밀림 (2026-07-20)
- **증상**(사용자): 이동 시 누른 타일보다 더 앞으로 감. 재현 — 타일 다이아 중앙 elementFromPoint가 항상 **tx+1 타일**(0,0→1,0, 2,2→3,2).
- **원인**: 타일 `<button>`이 사각형 bounding box(TW×TH)라 이웃과 겹치는데, clip-path가 시각용 `<span>`에만 있어 클릭은 사각형 전체에서 잡힘 → 겹친 영역을 z-index 높은(tx+ty 큰=더 앞) 타일이 가로챔. drag 배치는 toTile 수학 역변환이라 무관했고, **자동 테스트가 DOM 직접 click이라 이 좌표 문제를 못 잡았음**(실사용=좌표 클릭만 발생).
- **수정**: clip-path를 **버튼 자체 style**에도 적용 → 클릭 히트영역이 다이아몬드로 제한, 다이아는 완전 테셀레이트되므로 각 점이 정확히 한 타일에 귀속. tap 배치·이동 모두 정확해짐.
- 검증: 수정 후 다이아 중앙 클릭이 정확히 그 타일(0,0·2,2·-1,1·3,-2 전부 일치), 실제 이동 "빈 터 4,4" 시각중앙 클릭→4,4 착지. 콘솔 0에러.

### 「대건축가의 설계도」 + 바닥·성벽 장식 (2026-07-20, 사용자 지시)
- **사용자 결정**: 최고 희귀 아이템(이름 = 내가 지음, 「대건축가의 설계도」), 획득 = 상인이 극히 드물게 최고가 판매, 효과 = 영구 해금(바닥·성벽 장식 배치).
- **B1 아이템**: MaterialId `blueprint`(tier3, base 700/floor 520=프리미엄). economy `BLUEPRINT_CHANCE=0.06` → deriveMerchant rng 스트림 맨 끝에 조건부 append(스펙 자재 결정론 불변). 책 Lv3 잠금(relic과 동일 relicUnlocked). allSellPrices·pickWants 제외(되팔기·물물교환 불가). 검증: 40일×4마을 중 book3서 14회 등장(드물게)·전부 unlocked, book1 전부 잠금.
- **B2 장식 = deco 건물 통합**(최대 재사용): BuildingDef `deco?`(설계도 게이팅·즉시완공·수입0·자재불필요)+`flat?`(바닥=지면 렌더). BUILDINGS에 7종(잔디/돌/흙/자갈길 바닥 + 성벽조각/성문/울타리). checkPlace가 deco면 hasBlueprint로 게이팅. placeBuilding deco→built:true. IsoCityMap: flat이면 타일 지면으로 img 렌더(clip 다이아, pointerEvents none, 클릭은 타일 버튼)+`continue`, 아니면 기존 앵커 건물. 팔레트 일반/🎨장식 2섹션(hasBlueprint 시만), PaletteCard 추출.
- **재사용**: 배치/이동/회전/삭제/모달 그대로 동작(장식도 편집 가능). 
- **검증**(브라우저, 임시 initialState blueprint:1 지급 후 되돌림): 장식 섹션 해금, 잔디바닥=평평 지면·성벽=앵커 구조물 렌더, 되돌리면 장식 숨김. tsc/eslint 그린(img 경고), 콘솔 0에러. 스프라이트 7종 public/buildings 추가(총 21파일 3.9MB).
- **기획서 6.8 갱신** + 에셋 크레딧(Kenney→JP Cummins 팩).
- **다음**: 마을 7×7 아이소 미리보기(팬줌·업종테마바닥·상단배너, 결정 잠금됨).

### 마을 7×7 아이소 미리보기 (2026-07-20)
- **결정**(사용자): 팬/줌 허용·아무 장식 자유·업종별 테마 바닥·상단 배너·스타터 후 조정.
- **새 컴포넌트** `TownIsoPreview`(IsoCityMap 재사용 안 함 — 무한/편집 없이 가벼운 읽기전용). 자체 iso 수학(TW72/TH36). ResizeObserver auto-fit(7×7 전체 보이게)+중앙정렬, 마우스 드래그 팬 + ±줌(0.4~2.5). 클릭·편집 없음.
- **데이터** `town-scenes.ts`: `TOWN_FLOOR`(nw 잔디/ne 돌/sw 잔디/se 흙) + `TOWN_SCENES`(마을별 ScenePlacement[]={sprite,x,y,flipped}). 스타터 4마을(임업=방앗간·나무·통나무 / 광업=대장간·망루·성벽 / 직물=여관·시장·건초 / 유리=예배당·영주관·우물).
- **렌더**: 49 바닥타일(테마 floor img를 다이아 clip)+씬 스프라이트(바닥중앙 앵커, flipped). 스프라이트는 public/buildings/{sprite}.png 재사용, 분위기용 tree/tree2/haybales/logs/barrel/silo/winepress 7종 추가 복사(총 28파일 4.4MB).
- **통합**: TownView 상단에 배너(제목 "🏘️ {마을} {업종} · 드래그로 둘러보기" + 미리보기). 기존 상인목록 헤더는 "{마을} 상인"으로. townId prop 추가(Game에서 전달).
- **검증**: 삼목골(잔디·임업 풍경 8스프라이트)·무쇠고개(돌바닥·요새 광산 5스프라이트) 브라우저 확인, 49타일 각각 테마 바닥, 콘솔 0에러. tsc/eslint 그린(img 경고). ⚠️ 레이아웃은 스타터 — 스크린샷 보며 계속 다듬기(사용자와).
- **남은 마을 2개**(베틀마을·유리섬) 동일 코드로 자동 렌더(레이아웃 데이터만 있음).

### [수정] warehouse 축소 + barrel 제거 + 마을 미리보기 모달 z-index (2026-07-20, 사용자)
- **warehouse 축소**: game-data `BUILDING_RENDER_SCALE`(warehouse 0.6) 신설, IsoCityMap·TownIsoPreview 스프라이트 폭에 곱(홈·마을 공통).
- **barrel 제거**: TOWN_SCENES에서 barrel 삭제(logs 대체), public/buildings/barrel.png 삭제.
- **모달 덮임 버그**: TownIsoPreview 컨테이너에 `isolate` 없어 씬 스프라이트(z 10000)가 마을 모달(z-40)을 덮음. `isolate` 추가로 격리(홈 보드는 이미 isolate라 정상이었음). 검증: 노트 모달 위 스프라이트 0.

### [추가] 새 재료 rope(밧줄) — 재료 연동 6곳 패턴 (2026-07-22, 사용자)
- **rope 스펙**: T1, 기준가 8/하한 5. 직물잡화상·만물상 취급, 직물 마을(베틀마을) 특산(×0.8 할인). cloth 이름 "천·밧줄"→"천"으로 겹침 해소.
- **건물 수요**: 우물(2)·노점(1)·시장(2)·성벽(3)·망루(2) — 초반~중반 분산.
- **아이콘**: ChatGPT 생성 → PowerShell 채도 크로마키(max-min<26 → alpha0)로 회색배경·중앙구멍·그림자 제거 → 256px. 한글 파일명은 PS 스크립트 인코딩에서 깨지니 **ASCII 경로로 복사 후 처리**.
- **재료 추가 시 배선 6곳(재사용)**: ①types MaterialId ②game-data MATERIALS(+MATERIAL_NAME 자동) ③economy PRICES ④economy SPECIALIZATIONS(상인 풀) ⑤game-data TOWNS specialMaterials(특산) ⑥game-data BUILDINGS requires. tsc가 `Record<MaterialId>` 누락을 잡아줌. MaterialIcon은 `/materials/{id}.png` 자동.

### AI 폴백 데이터 다양화 (2026-07-25, 사용자 지시 "최대한 많이")
- **문제**: AI 크레딧 소진/키 없음 시 폴백이 상황당 1개 고정 → 반복 노출 때 단조로움.
- **해결**: `prompt.ts`에 `variant<T>(arr, n)` 헬퍼(= `arr[((n%len)+len)%len]`, 음수·NaN 보정) 추가. 각 폴백을 "변형 배열 + 결정론 선택"으로 확장. 총 **104개** 문장.
  - **페르소나**: `FALLBACK_PERSONAS`를 `Record<string, Persona[]>`로 — 6전문화×4변형=24. `fallbackPersona(spec, seed=0)`.
  - **흥정 대사**: `FALLBACK_LINES` 7카테고리×6=42. `fallbackLine(cat, persona, seed=0, turnsLeft=0)` → 인덱스 `seed+turnsLeft`라 같은 카테고리 연속 발언도 턴마다 대사가 밀려 바뀜.
  - **소문**: `FALLBACK_RUMOR_{LOCATION6/WANTS6/LEAVING3/STAYING3}` 함수배열. `fallbackRumor(frag)`가 내부에서 `frag.merchantSeed`로 선택(시그니처 불변).
  - **헤드라인**: `FALLBACK_HEADLINES_{EVENT7/CALM5}`. `fallbackHeadline(event, day=0)`.
  - **책 조언**: `BOOK_ADVICE_{WEAKNESS4/PROFILE4}` 도입부 함수배열. `fallbackBookAdvice(profile, weakness?, seed=0)`.
- **결정론 유지**: 같은 `(seed, turnsLeft, day)` = 항상 같은 결과. "같은 seed=같은 결과" 원칙 불변.
- **2레이어 격리 불변**: 판정·호감도·가격·하한가 로직은 무수정, **대사 텍스트만** 확장. 추가 인자는 전부 옵셔널이라 하위호환.
- **호출부 배선**: `merchant.ts`(seed), `haggle/route.ts`(seed·turnsLeft), `news.ts`(day), `book-advice/route.ts`(seed). `rumor.ts`는 frag 그대로 전달.
- **확인 방법**: 폴백은 `ANTHROPIC_API_KEY` 없거나 크레딧 소진 시만 노출됨. 육안 검증 시 키를 비우고 `pnpm dev`. tsc/eslint 그린.
- **다음에 폴백 늘릴 때**: 배열에 문장만 추가하면 됨(개수 무관, `variant`가 자동 분산). 새 폴백 종류 추가 시 seed/day 같은 결정론 인덱스를 호출부에서 옵셔널로 넘길 것.
