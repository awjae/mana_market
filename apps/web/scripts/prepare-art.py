"""
캐릭터 일러스트 → 게임용 투명 WebP 변환.
  입력  apps/web/art-source/   (흰 배경 원본)
          portrait-normal.png      상반신 초상화 (기본 표정)
          expressions-sheet.png    2×2 표정 시트 (좌상 기쁨, 우상 걱정, 좌하 놀람, 우하 미소)
          sprite-idle.png          치비 전신 스프라이트
  출력  apps/web/public/art/   portrait-{normal,happy,worried,wow,smile}.webp, sprite-idle.webp, avatar.webp
실행  (rembg 필요)  python3 -m venv .venv && .venv/bin/pip install "rembg[cpu]" pillow
                    .venv/bin/python apps/web/scripts/prepare-art.py
배경 제거는 애니메이션 전용 모델(isnet-anime)을 쓴다. 머리카락 올과 흰 옷이 살아남는다.
"""
from pathlib import Path
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "art-source", ROOT / "public" / "art"
OUT.mkdir(parents=True, exist_ok=True)
session = new_session("isnet-anime")


def cut(im: Image.Image) -> Image.Image:
    return remove(im.convert("RGB"), session=session)  # → RGBA


def trim(im: Image.Image, pad: float = 0.02) -> Image.Image:
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        return im
    p = int(max(im.size) * pad)
    l, t, r, b = box
    return im.crop((max(0, l - p), max(0, t - p), min(im.width, r + p), min(im.height, b + p)))


def save(im: Image.Image, name: str, longest: int) -> None:
    im = trim(im)
    k = longest / max(im.size)
    if k < 1:
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", "WEBP", quality=92, method=6)
    print(f"{name}.webp  {im.size}  {(OUT / f'{name}.webp').stat().st_size // 1024}KB")


# 1) 기본 초상화 + 아바타(얼굴만)
normal = cut(Image.open(SRC / "portrait-normal.png"))
save(normal, "portrait-normal", 720)
trimmed = trim(normal)
w, h = trimmed.size
side, x0 = int(w * 0.62), int(w * 0.19)   # 얼굴+머리+리본이 모두 들어가는 정사각형
trimmed.crop((x0, 0, x0 + side, side)).resize((256, 256), Image.LANCZOS).save(OUT / "avatar.webp", "WEBP", quality=92, method=6)
print("avatar.webp  (256, 256)")

# 2) 표정 시트 2×2 분할
sheet = Image.open(SRC / "expressions-sheet.png").convert("RGB")
hw, hh = sheet.width // 2, sheet.height // 2
for name, (cx, cy) in {"happy": (0, 0), "worried": (1, 0), "wow": (0, 1), "smile": (1, 1)}.items():
    tile = sheet.crop((cx * hw, cy * hh, (cx + 1) * hw, (cy + 1) * hh))
    save(cut(tile), f"portrait-{name}", 720)

# 3) 월드 스프라이트
save(cut(Image.open(SRC / "sprite-idle.png")), "sprite-idle", 640)
