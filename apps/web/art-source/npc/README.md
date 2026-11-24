# 히로인 일러스트 제작 가이드

게임 속 히로인 5명의 초상화입니다. 이 폴더에 `{id}.png`(흰 배경)를 넣고 `scripts/prepare-npc.py`를 돌리면
`public/art/npc/{id}.webp`가 만들어지고, 대화 화면에서 자동으로 쓰입니다(없으면 도트 얼굴).

공통 화풍: 일본 애니메이션 풍, 굵은 윗속눈썹과 큰 눈, 셀 셰이딩, 짙은 자주색(#3a2748) 윤곽선, 흰 배경, 상반신~무릎 위, 정면 약간 기울임.
주인공 "아리아"(주황 머리 트윈테일, 초록 망토)와 같은 그림체로 맞춥니다. 중세 판타지 세계관, 현대 소품 금지.

| id | 이름 | 직함 | 외형 (도트 캐릭터 `look`과 맞춤) |
|---|---|---|---|
| lisel | 리젤 | 왕립 금고 은행의 금고지기 | 은백색 긴 머리, 푸른 눈, 단정한 푸른 로브, 남색 베레모, 차분하고 지적인 표정, 손에 두꺼운 장부 |
| kaira | 카이라 | 붉은 방패 용병단 단장 | 주황빛 짧은 머리, 붉은 눈, 갈색 피부, 붉은 경갑, 당당하고 장난스러운 미소, 어깨에 붉은 방패 문장 |
| mira | 미라 | 서풍 해운 상단 항해사 | 하늘색 트윈테일, 푸른 눈, 파란 선원복, 파란 베레모, 밝고 활발한 표정, 손에 나침반 |
| sera | 세라 | 황금이삭 곡물 상단 일꾼 | 금발 트윈테일과 분홍 리본, 초록 눈, 웃는 눈, 크림색 작업복, 밀 이삭 다발을 안은 모습 |
| noa | 노아 | 별빛 마법사 탑 견습 마법사 | 보라색 긴 머리, 보랏빛 눈, 창백한 피부, 보라색 마법사 로브와 큰 마법사 모자, 졸린 듯 조용한 표정, 작은 수정 |

## 프롬프트 템플릿 (이미지 생성 도구용)
```
Japanese anime style character illustration, medieval fantasy, upper body to knees, facing slightly sideways, white background,
bold upper eyelashes, large expressive eyes, cel shading, thick dark purple outline (#3a2748), clean line art, high detail hair strands,
same art style as the heroine "Aria" (orange twin tails, green cape). Character: {외형 설명}. No text, no watermark, no modern items.
```

## 한 장짜리 시트로 한 번에 뽑기
다섯 명을 **가로 한 줄**에 그린 시트 한 장을 `art-source/npc/sheet.png`로 저장하고 `prepare-npc.py`를 돌리면 배경을 한 번에 지운 뒤 캐릭터 사이의 빈 틈으로 자동으로 나눠 `lisel, kaira, mira, sera, noa` 순서(왼쪽부터)로 `public/art/npc/{id}.webp` 5장을 만듭니다. 틈을 못 찾으면 가로 5등분합니다. 그래서 **캐릭터끼리 겹치지 않고 서로 떨어져 있어야** 합니다. (개별 `{id}.png`도 그대로 지원합니다.)

시트 프롬프트(이미지 생성 도구용):
```
Character design sheet of FIVE different anime heroines standing side by side in ONE horizontal row, evenly spaced with wide empty white gaps between them so no limbs, hair or props overlap, plain pure white background, same size, same camera, each shown from upper body down to the knees, facing slightly sideways toward the viewer.
Japanese anime style, medieval fantasy, bold upper eyelashes, large expressive eyes, cel shading, thick dark purple outline (#3a2748), clean line art, detailed hair strands, same art style as the heroine "Aria" (orange twin tails, green cape). No text, no labels, no watermark, no modern items, no background scenery.
From LEFT to RIGHT:
1) Lisel, bank vault keeper: long silver-white hair, blue eyes, neat blue robe, navy beret, calm intelligent expression, holding a thick ledger.
2) Kaira, mercenary captain: short orange-ish hair, red eyes, tanned brown skin, red light armor, confident playful smile, small red shield emblem on the shoulder.
3) Mira, ship navigator: sky-blue twin tails, blue eyes, blue sailor outfit, blue beret, bright cheerful expression, holding a brass compass.
4) Sera, grain farm worker: blonde twin tails with pink ribbons, green eyes, happy closed-eye smile, cream work clothes, hugging a bundle of wheat ears.
5) Noa, apprentice wizard: long purple hair, violet eyes, pale skin, purple wizard robe and a large wizard hat, sleepy quiet expression, holding a small glowing crystal.
Wide landscape image, 5:1 aspect ratio.
```
팁: 한 번에 다섯 명이 잘 안 나오면 같은 프롬프트로 2~3번 뽑아 가장 잘 나온 것을 쓰거나, 인물이 겹치면 "wider gaps between characters"를 더하세요. 얼굴 품질이 부족하면 인물별로 따로 뽑는 위 템플릿을 쓰세요.

## 기쁜 표정 시트 (선택)
같은 방식으로 `sheet-happy.png`를 두고 `prepare-npc.py`를 돌리면 `public/art/npc/{id}-happy.webp` 5장이 만들어집니다. 게임은 **선물을 받는 날(4번째 이야기), 마지막(8번째) 이야기, 완주 컷**에서만 이 표정을 쓰고, 파일이 없으면 기본 표정을 씁니다. 같은 캐릭터로 나오게 하려면 이미지 생성 도구에 **기본 시트(`sheet.png`)를 참조 이미지로 첨부**하세요.

```
Using the attached character sheet as the exact reference, redraw the SAME FIVE heroines in the SAME order, SAME outfits, SAME hair, SAME props, SAME size and framing, evenly spaced in ONE horizontal row on a plain pure white background with wide white gaps between them.
Change ONLY their facial expression and make the pose slightly more joyful: each one is happy and a little shy, soft blush on the cheeks, gentle warm smile with sparkling eyes (Sera keeps her closed-eye laugh but bigger; Noa shows a rare small smile; Lisel smiles softly with eyes open; Kaira grins proudly; Mira laughs brightly).
Japanese anime style, cel shading, thick dark purple outline (#3a2748), clean line art. No text, no labels, no watermark, no scenery. Wide landscape image, 5:1 aspect ratio.
```
