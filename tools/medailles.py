# Médailles (badges) : images générées par l'utilisateur -> public/medals/<id>-<niveau>.webp (niveau 1 Bronze … 4 Légendaire)
# usage : python3 tools/medailles.py assets-src/medailles public/medals [planche-de-controle.png]
# fond noir rendu transparent (seulement le noir relié au bord : l'intérieur sombre des médailles reste opaque, les lueurs
# deviennent translucides), recadrage sur la médaille (étincelles isolées ignorées), carré 320 px
import sys, glob, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

T = 48      # en dessous : noir de fond s'il est relié au bord de l'image
OUT = 320

def process(path):
    im = Image.open(path).convert('RGB')
    im.thumbnail((800, 800), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    m = a.max(axis=2)
    dark = Image.fromarray(((m < T) * 255).astype(np.uint8)).copy()
    w, h = dark.size
    for x in range(0, w, 40):
        for y in (0, h - 1):
            if dark.getpixel((x, y)) == 255: ImageDraw.floodfill(dark, (x, y), 128)
    for y in range(0, h, 40):
        for x in (0, w - 1):
            if dark.getpixel((x, y)) == 255: ImageDraw.floodfill(dark, (x, y), 128)
    bg = np.asarray(dark) == 128
    alpha = np.where(bg, np.clip((m - 12) / (T - 12), 0, 1), 1.0)  # le bruit du JPEG (noir ≤ 12) devient transparent
    rgb = np.clip(a / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    core = Image.fromarray((alpha > 0.9).astype(np.uint8) * 255).filter(ImageFilter.MinFilter(7))
    x0, y0, x1, y1 = core.getbbox()
    pad = int(0.03 * max(x1 - x0, y1 - y0))
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
    out = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA').crop((x0, y0, x1, y1))
    s = max(out.size)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(out, ((s - out.width) // 2, (s - out.height) // 2))
    return sq.resize((OUT, OUT), Image.LANCZOS)

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
files = sorted(glob.glob(os.path.join(src, '*.jpg')))
sheet = Image.new('RGB', (4 * 160, 8 * 160), (24, 18, 32)) if len(sys.argv) > 3 else None
for i, f in enumerate(files):
    name = os.path.splitext(os.path.basename(f))[0]
    img = process(f)
    img.save(os.path.join(dst, name + '.webp'), 'WEBP', quality=88, method=6)
    if sheet:
        t = img.resize((156, 156)); sheet.paste(t, ((int(name[-1]) - 1) * 160 + 2, (i // 4) * 160 + 2), t)
    print(name, os.path.getsize(os.path.join(dst, name + '.webp')) // 1024, 'Ko')
if sheet: sheet.save(sys.argv[3])
