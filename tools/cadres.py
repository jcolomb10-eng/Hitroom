"""Cadres de rang : fond noir retiré, centre vidé pour l'avatar, recadrage et mesures de l'ouverture.

Usage : python3 tools/cadres.py public/frames /tmp/controle
Sources : assets-src/cadres/r0.jpg … r8.jpg (images générées, cadre sur fond noir).
Les mesures affichées (w, h, cx, cy, d) sont à recopier dans FRAME_META (public/index.html).
"""
import json, math, sys
import numpy as np
from PIL import Image

import os
SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets-src', 'cadres')
OUT = sys.argv[1]
DEBUG = sys.argv[2]
OPEN_PX = 176          # diamètre de l'ouverture dans l'image finale
T = 100.0              # luminosité à partir de laquelle un pixel est totalement opaque


def boundary(m, cx, cy, thr=60, step=4):
    """Distance au premier pixel lumineux, dans 90 directions depuis (cx, cy)."""
    h, w = m.shape
    pts = []
    for k in range(90):
        a = 2 * math.pi * k / 90
        dx, dy = math.cos(a), math.sin(a)
        r = 20
        while r < min(w, h):
            x, y = int(cx + r * dx), int(cy + r * dy)
            if not (0 <= x < w and 0 <= y < h):
                break
            if m[y, x] > thr:
                pts.append((x, y, r))
                break
            r += 1
    return pts


def fit_circle(pts):
    x = np.array([p[0] for p in pts], float)
    y = np.array([p[1] for p in pts], float)
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]
    b = x * x + y * y
    (cx, cy, c), *_ = np.linalg.lstsq(A, b, rcond=None)
    return cx, cy, math.sqrt(c + cx * cx + cy * cy)


meta = {}
for t in range(9):
    im = Image.open(os.path.join(SRC_DIR, f'r{t}.jpg')).convert('RGB')
    a = np.asarray(im).astype(np.float32)
    m = a.max(axis=2)
    h, w = m.shape
    cx, cy = w / 2, h / 2
    for _ in range(3):
        pts = boundary(m, cx, cy)
        rs = np.array([p[2] for p in pts])
        med = np.median(rs)
        good = [p for p in pts if abs(p[2] - med) < med * 0.12]   # ignore les rayons qui passent dans une fente
        cx, cy, r = fit_circle(good)
    # alpha d'après la luminosité, couleur « dépremultipliée » : identique au rendu sur fond noir
    alpha = np.clip(m / T, 0, 1)
    alpha[alpha < 0.06] = 0
    rgb = np.clip(a / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    # centre vidé (fondu sur le bord intérieur, la lueur du rebord reste)
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - cx, yy - cy) / r
    alpha *= np.clip((d - 0.93) / 0.07, 0, 1)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    # recadrage sur les parties bien visibles (les étincelles isolées très loin sont coupées)
    x0, y0, x1, y1 = img.getchannel('A').point(lambda v: 255 if v > 80 else 0).getbbox()
    pad = 14
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
    img = img.crop((x0, y0, x1, y1))
    s = OPEN_PX / (2 * r)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    img.save(f'{OUT}/r{t}.webp', quality=80, method=6)
    meta[f'r{t}'] = {
        'w': img.width, 'h': img.height,
        'cx': round(float((cx - x0) * s / img.width), 4), 'cy': round(float((cy - y0) * s / img.height), 4),
        'd': round(OPEN_PX / img.width, 4),
    }
    # contrôle : cadre posé sur le fond de l'appli avec un disque « avatar » à l'endroit calculé
    bg = Image.new('RGBA', (img.width + 40, img.height + 40), (16, 11, 21, 255))
    from PIL import ImageDraw
    dr = ImageDraw.Draw(bg)
    ox, oy = 20 + meta[f'r{t}']['cx'] * img.width, 20 + meta[f'r{t}']['cy'] * img.height
    ra = OPEN_PX / 2 * 1.04
    dr.ellipse((ox - ra, oy - ra, ox + ra, oy + ra), fill=(70, 50, 110, 255))
    bg.alpha_composite(img, (20, 20))
    bg.convert('RGB').save(f'{DEBUG}/check_r{t}.jpg', quality=80)
    print(f'r{t}', f'centre=({cx:.0f},{cy:.0f}) rayon={r:.0f}', meta[f'r{t}'])

json.dump(meta, open(f'{DEBUG}/frames_meta.json', 'w'))
