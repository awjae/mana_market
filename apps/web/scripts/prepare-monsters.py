#!/usr/bin/env python3
"""던전 몬스터 시트 한 장(art-source/dungeon/sheet.png, 4열×3행 격자)을 몬스터별 WebP로 나눈다.
 1) 배경의 흰색을 지운다: 테두리에서 이어진 흰색 + 몬스터 팔 사이 같은 큰 닫힌 흰 구멍(작은 흰 부분 = 눈·뼈·하이라이트는 보존)
 2) 남은 그림을 덩어리로 묶어(조금 떨어진 포자·불꽃·날개 끝도 한 마리로) 큰 12개를 위→아래, 왼→오른 순서로 id에 붙인다
    (칸 경계를 넘나드는 보스의 뿔 같은 것도 그 몬스터에 붙는다)
결과: public/art/dungeon/{id}.webp (없으면 게임은 코드 도트 몬스터를 쓴다). 순서는 art-source/dungeon/README.md 와 같다.
사용: python3 scripts/prepare-monsters.py   (Pillow, numpy, scipy 필요)"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'art-source' / 'dungeon' / 'sheet.png', ROOT / 'public' / 'art' / 'dungeon'
ROWS, COUNT = 3, 12
IDS = ['slime', 'bat', 'goblin', 'skeleton', 'wolf', 'golem', 'mushroom', 'ghost', 'spider', 'lizard', 'cavelord', 'abyss']

def background(a: np.ndarray) -> np.ndarray:
    """테두리에서 이어진 흰색만 배경으로 지운다(몬스터 안쪽 흰색은 건드리지 않는다)"""
    white = (a[..., :3] >= 244).all(axis=-1)
    lab, _ = ndimage.label(white)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(border))

# 몸 자체가 흰색에 가까운 몬스터(슬라임 하이라이트·해골 뼈·늑대 흰 털·유령 몸·불도마뱀 불꽃 중심)는 안쪽 흰색을 보존한다.
# 나머지는 팔·다리 사이로 배경이 비치는 닫힌 흰 구멍(골렘·보스 등)을 지운다
KEEP_WHITE = {'slime', 'skeleton', 'wolf', 'ghost', 'lizard'}

def punch_holes(rgba: np.ndarray, m: np.ndarray) -> np.ndarray:
    whiteish = (rgba[..., :3] >= 236).all(axis=-1) & m
    lab, n = ndimage.label(whiteish)
    sizes = ndimage.sum(whiteish, lab, range(1, n + 1))
    holes = [i + 1 for i, s in enumerate(sizes) if s > 120]
    return m & ~np.isin(lab, holes)

def main():
    if not SRC.exists():
        print('시트가 없어요:', SRC); return 1
    a = np.array(Image.open(SRC).convert('RGBA'))
    bg = background(a)
    fg = ~bg
    fg = ndimage.binary_opening(fg, iterations=1)  # 가는 먼지 제거
    h, w = fg.shape
    grown = ndimage.binary_dilation(fg, structure=np.ones((3, 3)), iterations=4)
    lab, n = ndimage.label(grown)
    areas = ndimage.sum(fg, lab, range(1, n + 1))
    keep = [i + 1 for i in np.argsort(areas)[::-1][:COUNT]]
    if len(keep) < COUNT:
        print(f'몬스터 {len(keep)}마리만 찾았어요(12마리 필요). 마리 사이 여백을 더 주고 다시 뽑아 보세요'); return 1
    core = fg & np.isin(lab, keep)
    # 큰 덩어리 12개에 못 들어간 작은 조각(포자·불꽃·날개 끝)은 가장 가까운 몬스터에 붙이고, 멀리 떨어진 먼지는 버린다
    dist, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    near = np.where(fg & (dist < w * 0.05), lab[iy, ix], 0)
    lab = np.where(core, lab, near)
    cents = {k: ndimage.center_of_mass(fg & (lab == k), lab, k) for k in keep}
    keep.sort(key=lambda k: (min(ROWS - 1, int(cents[k][0] / (h / ROWS))), cents[k][1]))
    OUT.mkdir(parents=True, exist_ok=True)
    for pid, k in zip(IDS, keep):
        m = fg & (lab == k)
        if pid not in KEEP_WHITE: m = punch_holes(a, m)
        rgba = a.copy(); rgba[..., 3] = np.where(m, 255, 0)
        ys, xs = np.where(m)
        part = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        part.thumbnail((640, 640))
        part.save(OUT / f'{pid}.webp', 'WEBP', quality=88, method=6)
        print('저장:', pid, part.size)
    print(f'{len(IDS)}장 완료')
    return 0

if __name__ == '__main__':
    sys.exit(main())
