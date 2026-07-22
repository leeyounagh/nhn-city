# 작업일지 — 2026-07-22 (화) | master

UI를 "웹앱"에서 "다크 판타지 게임"으로 대개편. ChatGPT 화면별 비평을 순차 반영, 매 단계 `tsc` + playwright 검증.

## feat(game): 새 재료 rope(밧줄) 추가 + 4곳 연동
- rope T1(기준8/하한5). types·MATERIALS·economy PRICES·상인풀(직물잡화상·만물상)·직물 마을 특산·건물 레시피(우물/노점/시장/성벽/망루) 연동.
- cloth "천·밧줄"→"천". 아이콘 `public/materials/rope.png`(채도 크로마키 투명화). `경제모델.md` 갱신, `context-notes.md`에 "재료 추가 6곳 패턴" 기록.

## feat(book): 마법의 책 열람 모달 + AI 조언 라우트
- `BookCodex.tsx` — 푸터 책 칩 클릭 → 레벨 해금·흥정 카테고리·성향 4종. 책 펼침 애니(perspective+rotateX).
- `/api/book-advice` — 책 Lv2+에서 LLM이 상인 성향(+Lv3 약점)을 인게임 조언으로 읊음(키 없으면 템플릿 폴백). MerchantPanel 표시. 2레이어 원칙(정답 매핑·수치 유출 없음).
- economy `getProfileHint`/`getWeaknessHint` export, prompt `bookAdvice*` 추가.

## refactor(ui): 다크 판타지 톤 재설계 (레이아웃·HUD·월드맵·폰트)
- 단일화면: 루트 `h-screen overflow-hidden flex-col`, 맵/콘텐츠 `flex-1`, 세로 스크롤 제거. 푸터 fixed→flex 자식(전체폭).
- HUD 버튼 위계 색으로(하루넘기기=금색), indigo 제거, tabular-nums.
- 고향 초록 패널 제거→stone. 월드맵 카드→원형 지역 노드(허브 펄스·빛나는 길·지역색·안개그리드).
- 폰트 역할 정리: 명조는 세계관 문구만, 게임정보 UI는 Sans.

## feat(ui): 이모지·png UI아이콘 → game-icons SVG 통일
- `GameIcon.tsx`(game-icons.net CC BY 3.0, 12종, 인라인 SVG currentColor). HUD·월드맵·마을뷰·책·건설.
- README에 CC BY 3.0 크레딧 추가.

## style(ui): 도움말 모달 고서 톤 재설계
- 파란 패널→stone+금박, 번호목록→game-icon 카드 5장(세계관 프레이밍), 색 규칙 3개.

## refactor(ui): 마을뷰 단일화면 + 아이소맵 초록제거·모바일 잘림 수정
- 미리보기 상단 고정·축소(반응형 34vh), 상인/소문/판매만 내부 스크롤.
- TownIsoPreview 초록 배경(TOWN_BG) 제거→안개 비네트. auto-fit 1회→리사이즈·마을변경마다 재정렬(모바일 우측 잘림 수정).

## style(ui): 상인 패널 위계·명도 재설계
- 딤 완화(black/60+blur), 모달 밝게(amber보더+ring). 분홍 이모지→실제 초상화, 이름 확대.
- 거래행 버튼화, 닫기 헤더 내장, 대사 양피지, 마법의 책 축소.

## style(ui): 흥정창 '협상 플레이' 화면 재설계
- 현재가에 기준가·할인폭(▼N), 호감도 게이지+기분 한마디.
- 왼쪽 마법의 책 분석 카드(성향·약점 Lv2/3 단계 공개 = 협상이 정보수집).
- 입력+제안 통합, 수량 스테퍼([- N +])+총액+우측 구매.

## docs
- `handoff.md`·`경제모델.md`·`context-notes.md` 갱신.

## 검증
- 매 커밋 `npx tsc --noEmit` 그린. playwright로 화면별 확인(데스크톱+모바일 390px). 흥정 발언→가격/호감도 변화, book-advice 라우트 3레벨 응답, 마을뷰 모바일 잘림 해소 확인.
