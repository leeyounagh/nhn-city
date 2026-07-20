# 작업일지 — 2026-07-21 (화) | master

## chore(assets): 상업·타워 건물 + UI·재료 아이콘 추가
- Shops Markets/Towers 팩 스프라이트, ChatGPT/팩 UI 아이콘(이동·하루넘기기·마법의책), 재료 15종 아이콘 추가.
- 흰/회색 배경 flood-fill 투명 처리. `public/buildings`, `public/ui`, `public/materials`.

## feat(game): 상업·타워 건물 + 고향 하루 넘기기 + 완성도 진화 아이콘
- 지을 수 있는 건물에 상업(노점·상점·선술집·시장군)·방어 타워 추가.
- 고향 「하루 넘기기」로 이동 없이 하루 수입·생산 정산.
- 고향 아이콘이 완공 최고난도 건물로 진화(0개=폐허 타일), 마을은 대표 건물 썸네일.
- 파일: `game-data.ts`, `game-state.ts`, `Game.tsx`.

## feat(ui): 재료 아이콘·마을 썸네일·이모지 교체 + 팔레트 드래그 스크롤
- 재료 15종을 인벤토리·상인·건물 슬롯·판매에 아이콘 표시(`MaterialIcon`).
- 헤더·모달 이모지 → 이미지(이동=마차, 하루넘기기=모래시계, 마법의책·단서노트=책, 창고, 건설=크레인).
- 건물 팔레트 마우스 좌우 드래그(가로=스크롤/세로=배치)·터치 스크롤.
- 파일: `MaterialIcon.tsx`, `WorldMap`, `IsoCityMap`, `TownView`, `MerchantPanel`, `ClueNotebook`, `InventoryPanel`.

## docs: 경제모델·기획서 구현 반영 + 핸드오프
- `경제모델.md` 구현본 개정(자재 15·호감도Δ 구현값·신표/설계도·건물 30여 종·특산할인/품귀/대풍작/판매/생산/이동거리).
- `기획서.md` 희귀템 거래·건물 수·마을 미리보기 서술 정정.
- `handoff.md` 신규.

## 검증
- `npx tsc --noEmit` 그린. 팔레트 드래그 스크롤 scrollLeft 0→200 확인. 재료 15종·헤더 아이콘·마을 썸네일 스크린샷 확인.
