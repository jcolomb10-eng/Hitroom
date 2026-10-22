"""Avatars : fond noir rendu transparent, recadrage carré centré sur l'objet, format 256 px.

Usage : python3 tools/avatars.py public/av <dossier-contrôle>
Sources : assets-src/avatars/A01.jpg … L06.jpg (images générées dans Google Flow, objet sur fond noir).
L'objet tient dans le cercle inscrit du carré (l'appli affiche les avatars dans un rond).
Le dossier de contrôle reçoit planche.jpg : chaque avatar posé sur le fond des avatars de l'appli, en grand et en petit.
"""
import glob, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets-src', 'avatars')
OUT, DEBUG = sys.argv[1], sys.argv[2]
SIZE = 256        # côté de l'image finale
T = 70.0          # luminosité à partir de laquelle un pixel est totalement opaque
SOLID = 90        # pixels « objet » pour le recadrage (la lueur faible et le fond n'en font pas partie)
ROOM = 1.12       # marge : l'objet occupe environ 89 % du diamètre du rond


def white_bars(a):
    """Bandes blanches sur les côtés (image carrée collée dans un cadre large) : remises en noir."""
    col = (a.min(axis=2) > 230).mean(axis=0) > 0.9
    if col.any():
        xs = np.where(col)[0]
        for x in xs:
            a[:, max(0, x - 3):x + 4] = 0
    return a


def components(mask):
    """Zones d'un seul tenant (voisins en 8 directions) : liste de tableaux de coordonnées (y, x)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    out = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        stack, pts = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
        out.append(np.array(pts))
    return out


def enclosing_circle(pts):
    """Petit cercle qui contient tous les points (approximation de Badoiu-Clarkson)."""
    c = pts.mean(axis=0)
    for i in range(1, 400):
        far = pts[np.argmax(((pts - c) ** 2).sum(axis=1))]
        c = c + (far - c) / (i + 1)
    return c, math.sqrt(((pts - c) ** 2).sum(axis=1).max())


def process(path):
    a = white_bars(np.asarray(Image.open(path).convert('RGB')).astype(np.float32).copy())
    m = a.max(axis=2)
    h, w = m.shape
    # alpha d'après la luminosité, couleur « dépremultipliée » : identique au rendu sur fond noir
    alpha = np.clip(m / T, 0, 1)
    alpha[m < 10] = 0
    rgb = np.clip(a / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    # objet : pixels bien visibles, à 1/4 de la taille ; les étincelles isolées sont ignorées
    k = 4
    small = m[:h - h % k, :w - w % k].reshape(h // k, k, w // k, k).max(axis=(1, 3)) > SOLID
    comps = sorted(components(small), key=len, reverse=True)
    keep = [c for c in comps if len(c) >= max(25, 0.03 * len(comps[0]))]
    pts = np.concatenate(keep)[:, ::-1].astype(np.float32) * k + k / 2   # (x, y) en pixels
    (cx, cy), r = enclosing_circle(pts)
    half = (r + k) * ROOM
    rgba = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    sq = Image.new('RGBA', (round(2 * half), round(2 * half)), (0, 0, 0, 0))
    sq.paste(rgba, (round(half - cx), round(half - cy)))
    return sq.resize((SIZE, SIZE), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
os.makedirs(DEBUG, exist_ok=True)
codes = sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(SRC_DIR, '*.jpg')))
tiles, total = [], 0
for code in codes:
    img = process(os.path.join(SRC_DIR, code + '.jpg'))
    dst = os.path.join(OUT, code + '.webp')
    img.save(dst, quality=82, method=6)
    total += os.path.getsize(dst)
    tiles.append((code, img))
    print(code, os.path.getsize(dst) // 1024, 'Ko')
print(len(codes), 'avatars,', total // 1024, 'Ko au total')

# planche de contrôle : rond des avatars de l'appli (dégradé violet sombre), en 112 px et en 40 px
def disc(img, d):
    yy, xx = np.mgrid[0:d, 0:d]
    t = np.clip(np.hypot(xx - 0.35 * d, yy - 0.30 * d) / (0.85 * d), 0, 1)[..., None]
    bg = (np.array([59, 43, 75]) * (1 - t) + np.array([21, 15, 28]) * t).astype(np.uint8)
    base = Image.fromarray(np.dstack([bg, np.full((d, d), 255, np.uint8)]), 'RGBA')
    base.alpha_composite(img.resize((d, d), Image.LANCZOS))
    mask = Image.new('L', (d, d), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, d - 1, d - 1), fill=255)
    out = Image.new('RGBA', (d, d), (6, 4, 8, 255))
    out.paste(base, (0, 0), mask)
    return out

cols, cell = 7, 170
sheet = Image.new('RGB', (cols * cell, math.ceil(len(tiles) / cols) * cell), (6, 4, 8))
dr = ImageDraw.Draw(sheet)
for i, (code, img) in enumerate(tiles):
    x, y = (i % cols) * cell, (i // cols) * cell
    sheet.paste(disc(img, 112), (x + 8, y + 8))
    sheet.paste(disc(img, 40), (x + 124, y + 80))
    dr.text((x + 10, y + 128), code, fill=(255, 216, 92))
sheet.save(os.path.join(DEBUG, 'planche.jpg'), quality=85)
