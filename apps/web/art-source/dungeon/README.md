# 던전 몬스터 일러스트 제작 가이드 (시트 한 장)

던전 전투 화면에 쓰이는 몬스터 12마리(일반 10 + 보스 2)를 **이미지 한 장**에 격자(가로 4칸 × 세로 3칸)로 그린 시트 `art-source/dungeon/sheet.png`로 받습니다.
이 파일을 넣고 `python3 scripts/prepare-monsters.py`를 돌리면 `public/art/dungeon/{id}.webp` 12장이 만들어지고 전투 화면에서 자동으로 쓰입니다(없거나 실패하면 코드 도트 몬스터가 대신 나옵니다).

권장 크기 가로 2048 × 세로 1536 (4:3). 칸 순서(왼쪽 위부터 가로로):

| | 1열 | 2열 | 3열 | 4열 |
|---|---|---|---|---|
| 1행 | slime 슬라임 | bat 동굴 박쥐 | goblin 고블린 | skeleton 해골 병사 |
| 2행 | wolf 굶주린 늑대 | golem 돌 골렘 | mushroom 독버섯 몬스터 | ghost 유령 |
| 3행 | spider 거대 거미 | lizard 불도마뱀 | cavelord 동굴의 왕(보스) | abyss 심연의 군주(보스) |

## 프롬프트 (이미지 생성 도구용, 이 한 개만 쓰면 됩니다)
```
A monster sprite sheet for a fantasy RPG: TWELVE different monsters arranged in a strict grid of 4 columns and 3 rows on a plain pure white background (no panel lines, no frames, no labels). Each monster stays fully inside its own invisible equal-sized grid cell, centered, with wide empty white margins around it so nothing touches or overlaps a neighbor or the edges. Every monster stands on the same ground line inside its cell, front view.
Art style: chibi 2-3 head-tall proportions, Japanese manga/anime style, bold dark purple outline (#35244a), flat colors with soft cel shading and subtle halftone dots, expressive eyes, clean line art, cute but menacing. No text, no letters, no numbers, no watermark, no scenery, no shadows on the ground.
Grid contents, left to right, top row to bottom row:
Row 1: (1) Slime: a round glossy green jelly blob with a shine highlight, two big eyes, tiny smile. (2) Cave bat: a small purple bat with big translucent wings spread, red eyes, tiny fangs. (3) Goblin: a green goblin with long pointy ears, red eyes, ragged brown tunic, holding a wooden club. (4) Skeleton soldier: a white skeleton in a battered little helmet with a short rusty sword and a round shield, faint blue glow in the eye sockets.
Row 2: (5) Hungry wolf: a gray shaggy wolf with yellow eyes, bared teeth, low stance. (6) Stone golem: a hulking gray golem made of cracked boulders and moss, glowing orange eyes, huge fists. (7) Poison mushroom monster: a walking purple mushroom with yellow spots on the cap, drifting green spores, sleepy angry eyes. (8) Ghost: a pale blue-white ghost with a wavy tail, hollow glowing eyes, mischievous grin.
Row 3: (9) Giant spider: a dark-purple spider with eight legs, many small red eyes, a skull-like pattern on its back. (10) Ember lizard: a small red-orange fire lizard with a flame on its tail tip, cream belly, glowing yellow eyes. (11) BOSS "Cave King": a huge purple rock beast with two ivory horns, a small golden crown, glowing yellow eyes, fanged mouth, boulder-like arms (drawn larger and more imposing, but still inside its cell). (12) BOSS "Abyss Lord": a gigantic dark violet shadow demon with three pale lavender horns, burning red-orange eyes, a glowing orange core in its chest, long clawed hands, wisps of dark mist (drawn larger and more imposing, but still inside its cell).
Image aspect ratio 4:3.
```

팁
- 한 번에 12마리가 잘 안 나오면 같은 프롬프트로 여러 번 뽑아 가장 잘 나온 것을 쓰세요. 칸이 어긋나거나 몬스터가 칸 경계에 닿으면 "much wider margins between monsters, each monster small inside its cell"을 더하세요.
- 몬스터 순서가 틀려도 좋으면 알려 주세요(변환 순서만 바꾸면 됩니다). 일부만 마음에 들면 그 칸만 다시 뽑아 시트에 붙여도 됩니다.
- 스크립트는 흰 배경(테두리에서 이어진 흰색)만 지우고 몬스터 안의 흰 부분은 남깁니다.
