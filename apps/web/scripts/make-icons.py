# -*- coding: utf-8 -*-
"""앱 아이콘(도트): 보랏빛 바탕에 금화와 별빛 탑. 사용: python3 scripts/make-icons.py  → public/icon-192.png, icon-512.png, apple-touch-icon.png, favicon.png"""
from PIL import Image, ImageDraw
import math, os
S = 48  # 도트 캔버스
im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
INK = (53, 36, 74, 255); BG1 = (74, 54, 112, 255); BG2 = (46, 32, 80, 255)
GOLD = (255, 193, 59, 255); GOLD2 = (232, 160, 30, 255); GOLD3 = (255, 232, 140, 255); PURP = (122, 90, 200, 255); CYAN = (154, 230, 255, 255)
# 배경: 위아래 두 톤
for y in range(S): d.line([(0, y), (S, y)], fill=BG1 if y < S * 0.55 else BG2)
for x, y in [(6, 6), (40, 9), (12, 16), (36, 4), (30, 14), (4, 22)]: d.point((x, y), fill=(255, 247, 224, 255))
# 탑
d.rectangle([20, 20, 27, 38], fill=(154, 149, 182, 255), outline=INK); d.rectangle([24, 20, 27, 38], fill=(122, 117, 149, 255))
d.polygon([(19, 21), (28, 21), (23.5, 10)], fill=PURP, outline=INK)
d.polygon([(23.5, 3), (26, 7), (23.5, 11), (21, 7)], fill=CYAN, outline=INK)
d.rectangle([22, 25, 25, 28], fill=CYAN); d.rectangle([22, 32, 25, 35], fill=CYAN)
# 금화
cx, cy, r = 24, 36, 9
for y in range(S):
    for x in range(S):
        dd = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.0)
        if dd <= r: d.point((x, y), fill=GOLD if dd < r - 1.5 else GOLD2)
        if r < dd <= r + 1.2: d.point((x, y), fill=INK)
d.ellipse([cx - 6, cy - 6, cx + 5, cy + 5], outline=GOLD2)
d.rectangle([cx - 2, cy - 4, cx, cy + 3], fill=GOLD2); d.rectangle([cx + 1, cy - 4, cx + 3, cy + 3], fill=GOLD2); d.point((cx - 5, cy - 5), fill=GOLD3); d.point((cx - 4, cy - 6), fill=GOLD3)
os.makedirs('public', exist_ok=True)
for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180), ('favicon.png', 64)]:
    im.resize((size, size), Image.NEAREST).save(f'public/{name}')
print('ok')
