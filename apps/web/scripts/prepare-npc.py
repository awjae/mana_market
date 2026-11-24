"""
히로인 일러스트 → 게임용 투명 WebP 변환.
  입력  apps/web/art-source/npc/{id}.png   흰 배경의 상반신~전신 원본 (id: lisel, kaira, mira, sera, noa)
        또는 apps/web/art-source/npc/sheet.png  가로 한 줄에 다섯 명이 왼쪽부터 lisel, kaira, mira, sera, noa 순서로 서 있는 시트
        (시트는 배경이 순백이면 테두리에서 이어진 흰색을 지우고(아니면 rembg), 5등분 경계 근처에서 캐릭터가 가장 적게 걸리는 세로선으로 자동으로 나눈다)
  출력  apps/web/public/art/npc/{id}.webp   배경 제거 + 여백 자르기 + 높이 900px 이하로 축소
게임은 이 파일이 있으면 대화(Conversation)에서 일러스트를, 없으면 도트 얼굴을 보여 준다.
실행  (rembg 필요)  python3 -m venv .venv && .venv/bin/pip install "rembg[cpu]" pillow
                    .venv/bin/python apps/web/scripts/prepare-npc.py            # 전부
                    .venv/bin/python apps/web/scripts/prepare-npc.py lisel mira  # 일부만
"""
import sys
from pathlib import Path
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "art-source" / "npc", ROOT / "public" / "art" / "npc"
OUT.mkdir(parents=True, exist_ok=True)
session = new_session("isnet-anime")
want = set(sys.argv[1:])
IDS = ["lisel", "kaira", "mira", "sera", "noa"]


def white_to_alpha(im):
    """흰 배경을 지운다: 테두리에서 이어진 흰색만 배경으로 보고(옷·피부의 흰 부분은 살린다), 경계의 반투명은 흰색 기준으로 알파를 계산한다"""
    import numpy as np
    from scipy import ndimage
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    near_white = rgb.min(axis=2) >= 246
    lab, _ = ndimage.label(near_white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # 정수리 머리카락 틈(아호)에 둘러싸여 남은 배경 조각: 캐릭터 윗부분 20%에 있고 배경과 거의 같은 흰색이면 배경으로 본다.
    # (아래쪽의 흰 머리카락·눈의 흰자·흰 옷은 그대로 둔다)
    rows = np.where((~bg).any(axis=1))[0]
    if len(rows):
        top0, topy = rows[0], rows[0] + (rows[-1] - rows[0]) * 0.20
        ids = np.arange(1, lab.max() + 1)
        g = rgb.mean(axis=2)
        cnt = ndimage.sum(np.ones_like(g), lab, ids)
        mean = ndimage.mean(g, lab, ids)
        cy = ndimage.mean(np.broadcast_to(np.arange(g.shape[0])[:, None], g.shape), lab, ids)
        cx = ndimage.mean(np.broadcast_to(np.arange(g.shape[1])[None, :], g.shape), lab, ids)
        # 첫 번째 인물(리젤)은 머리카락이 은백색이라 이 규칙에서 뺀다(흰 머리 결이 구멍으로 오인된다)
        hole = [i for i, c, m, y, x in zip(ids, cnt, mean, cy, cx) if c >= 20 and 251 <= m <= 254.4 and y <= topy and x >= g.shape[1] * 0.2 and i not in edge]
        bg = bg | np.isin(lab, hole)
    # 배경에 붙은 경계 1~2px 띠: 흰색과의 거리로 알파를 정한다(색 번짐 제거)
    band = ndimage.binary_dilation(bg, iterations=2) & ~bg
    alpha = np.where(bg, 0.0, 255.0)
    whiteness = (255.0 - rgb.min(axis=2)) / 40.0
    alpha[band] = np.clip(whiteness[band], 0, 1) * 255
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def split_sheet(im):
    """배경이 지워진 RGBA 시트를 5명으로 나눈다: 5등분 경계 근처에서 캐릭터가 가장 적게 걸리는 세로선(틈)을 찾아 자른다"""
    import numpy as np
    w, h = im.size
    cols = (np.asarray(im.getchannel("A")) > 8).sum(axis=0)
    cuts = [0]
    for k in range(1, 5):
        mid, win = round(k * w / 5), round(w * 0.09)
        lo, hi = max(cuts[-1] + 1, mid - win), min(w - 1, mid + win)
        seg = cols[lo:hi]
        best = [x for x in range(lo, hi) if cols[x] == seg.min()]
        cuts.append(min(best, key=lambda x: abs(x - mid)))
    cuts.append(w)
    return [im.crop((cuts[i], 0, cuts[i + 1], h)) for i in range(5)]


def finish(im, name):
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if box:
        p = int(max(im.size) * 0.02)
        im = im.crop((max(0, box[0] - p), max(0, box[1] - p), min(im.width, box[2] + p), min(im.height, box[3] + p)))
    if im.height > 900:
        im = im.resize((round(im.width * 900 / im.height), 900), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=92, method=6)
    print("ok", name, im.size)


for sheet, suffix in [(SRC / "sheet.png", ""), (SRC / "sheet-happy.png", "-happy")]:  # 기본 표정 시트, 기쁜 표정 시트(선택)
  if sheet.exists():
    raw = Image.open(sheet).convert("RGB")
    top = [raw.getpixel((x, 2)) for x in range(0, raw.width, 7)]
    white_bg = sum(min(c) >= 246 for c in top) >= len(top) * 0.7  # 윗줄이 대부분 흰색이면 흰색 제거(더 정확), 아니면 rembg
    parts = split_sheet(white_to_alpha(raw) if white_bg else remove(raw, session=session))
    for name, part in zip(IDS, parts):
        if not want or name in want:
            finish(part, name + suffix)
for f in sorted(SRC.glob("*.png")):
    if f.stem in ("sheet", "sheet-happy") or (want and f.stem.replace("-happy", "") not in want):
        continue
    im = remove(Image.open(f).convert("RGB"), session=session)
    finish(im, f.stem)
