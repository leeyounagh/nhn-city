# 지인 초상화 프롬프트 (Ashen Kingdom)

상인 초상화(미드저니 소프트애니 `--niji 6`)와 톤 통일. 정사각 1장씩 → `public/allies/{id}.png`.
UI에서 원형(rounded-full)으로 크롭되니 얼굴·상반신 중앙 배치.

## 공통 스타일 블록 (모든 프롬프트 뒤에 붙임)

```
soft anime portrait, dark medieval fantasy, muted ashen color palette with warm amber rim light,
painterly semi-realistic, bust shot facing viewer, detailed expressive face, plain dark stone background,
consistent lighting, single character --niji 6 --ar 1:1 --s 250
```

---

## 1. 이르빈 · 옛 전우 → `public/allies/comrade.png` (청년)

```
A young adult warrior in his twenties, spirited and determined, short dark hair, a faint scar on one cheek,
wearing worn and battered plate armor with a faded tabard, resting a hand on a sheathed sword,
loyal steadfast expression, soft anime portrait, dark medieval fantasy, muted ashen color palette with warm amber rim light,
painterly semi-realistic, bust shot facing viewer, detailed expressive face, plain dark stone background,
consistent lighting, single character --niji 6 --ar 1:1 --s 250
```

## 2. 돌마루 한 · 대목수 → `public/allies/builder.png`

```
An old master carpenter, kind weathered face with laugh lines, rolled-up sleeves and a dusty leather apron,
a wooden hand plane slung over one shoulder, faint sawdust in the air, sturdy calm expression,
soft anime portrait, dark medieval fantasy, muted ashen color palette with warm amber rim light,
painterly semi-realistic, bust shot facing viewer, detailed expressive face, plain dark stone background,
consistent lighting, single character --niji 6 --ar 1:1 --s 250
```

## 3. 저울눈 노아 · 노(老)상인 → `public/allies/merchant.png`

```
An elderly traveling merchant with white hair and a relaxed knowing smile, holding an old brass balance scale,
fine but worn traveling coat with small trinkets, shrewd friendly eyes,
soft anime portrait, dark medieval fantasy, muted ashen color palette with warm amber rim light,
painterly semi-realistic, bust shot facing viewer, detailed expressive face, plain dark stone background,
consistent lighting, single character --niji 6 --ar 1:1 --s 250
```

## 4. 등불 세라 · 현자 → `public/allies/scholar.png` (청년)

```
A young adult woman scholar in her early twenties, bright and clever, round glasses,
holding a rolled parchment scroll to her chest, dark scholarly robe, thoughtful lively expression,
faint candlelight glow on her face,
soft anime portrait, dark medieval fantasy, muted ashen color palette with warm amber rim light,
painterly semi-realistic, bust shot facing viewer, detailed expressive face, plain dark stone background,
consistent lighting, single character --niji 6 --ar 1:1 --s 250
```

---

## 반영 방법 (이미지 준비 후)

1. 4장을 `public/allies/comrade.png`·`builder.png`·`merchant.png`·`scholar.png`로 저장(정사각).
2. `AllyArrivalModal`·`AlliesModal`의 아이콘 폴백을 `<img src={`/allies/${ally.id}.png`}>`로 교체(없으면 아이콘 폴백 유지 — onError 처리). 요청 시 코드 연결해 드립니다.
