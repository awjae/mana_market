"""
건물 일러스트 시트 → 건물별 투명 WebP + manifest.json.
  입력  apps/web/art-source/buildings/sheet-town.png
          5열 × 3행: 1~2행 = 길드 10종(IRON MERC GRAN RNCH TOWR / ALCH SHIP SPCE BANK INSR), 3행 = 목조 주택 5종
  출력  apps/web/public/art/buildings/{guild-IRON,…,house-1..5}.webp + manifest.json
        manifest: 건물별 {w, h, cx, base} — cx = 받침 중심 x(너비 대비 비율), base = 받침(바닥 마름모)의 너비(px)
실행  (rembg 필요)  .venv/bin/python apps/web/scripts/prepare-buildings.py
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "art-source" / "buildings" / "sheet-town.png", ROOT / "public" / "art" / "buildings"
OUT.mkdir(parents=True, exist_ok=True)
NAMES = ["guild-IRON", "guild-MERC", "guild-GRAN", "guild-RNCH", "guild-TOWR",
         "guild-ALCH", "guild-SHIP", "guild-SPCE", "guild-BANK", "guild-INSR",
         "house-1", "house-2", "house-3", "house-4", "house-5"]
WIDTH = 360  # 저장 너비(px). 화면에서 약 90px로 쓰이므로 4배 해상도

sheet = Image.open(SRC).convert("RGB")
session = new_session("isnet-anime")
cw, ch = sheet.width / 5, sheet.height / 3
PAD = 0.05  # 칸 경계를 살짝 넘는 깃발·연기를 살리려고 여유를 둔다


def biggest(rgba: Image.Image) -> Image.Image:
    """가장 큰 덩어리(+가까운 조각: 연기·깃발)만 남긴다. 칸 가장자리에 닿은 작은 조각은 옆 건물의 일부이므로 지운다"""
    a = np.array(rgba.getchannel("A")) > 24
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=7))
    if n == 0:
        return rgba
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    main = 1 + int(np.argmax(sizes))
    keep = lab == main
    for i in range(1, n + 1):
        if i == main or sizes[i - 1] < sizes[main - 1] * 0.01:
            continue
        ys, xs = np.where(lab == i)
        touches = ys.min() <= 1 or xs.min() <= 1 or ys.max() >= a.shape[0] - 2 or xs.max() >= a.shape[1] - 2
        if not touches:  # 가장자리에 닿지 않은 조각만(연기·깃발 등) 살린다
            keep |= lab == i
    alpha = np.array(rgba.getchannel("A")) * keep
    out = rgba.copy()
    out.putalpha(Image.fromarray(alpha.astype("uint8")))
    return out


manifest = {}
for i, name in enumerate(NAMES):
    col, row = i % 5, i // 5
    box = (max(0, round((col - PAD) * cw)), max(0, round((row - PAD) * ch)), min(sheet.width, round((col + 1 + PAD) * cw)), min(sheet.height, round((row + 1 + PAD) * ch)))
    tile = biggest(remove(sheet.crop(box), session=session))
    a = tile.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    box = a.getbbox()
    tile = tile.crop(box)
    a = a.crop(box)
    w, h = tile.size
    # 받침 마름모: 아래쪽에서 받침 너비의 1/4 높이 지점의 알파 폭으로 추정
    guess = w * 0.9
    y = max(0, min(h - 1, int(h - guess * 0.25)))
    row_px = [x for x in range(w) if a.getpixel((x, y)) > 0]
    bot_px = [x for x in range(w) if any(a.getpixel((x, yy)) > 0 for yy in range(max(0, h - 6), h))]
    base = (max(row_px) - min(row_px)) if row_px else w * 0.9
    cx = ((min(row_px) + max(row_px)) / 2 / w) if row_px else 0.5   # 받침이 가장 넓은 줄의 중심
    k = WIDTH / w
    tile = tile.resize((WIDTH, round(h * k)), Image.LANCZOS)
    tile.save(OUT / f"{name}.webp", "WEBP", quality=90, method=6)
    manifest[name] = {"w": WIDTH, "h": tile.height, "cx": round(cx, 3), "base": round(base * k, 1)}
    print(f"{name:11s} {WIDTH}x{tile.height}  받침 {manifest[name]['base']}  cx {manifest[name]['cx']}  {(OUT / f'{name}.webp').stat().st_size // 1024}KB")
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
