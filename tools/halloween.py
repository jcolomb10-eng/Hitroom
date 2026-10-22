# Dessine les deux avatars d'Halloween (version 1.19) : H01 Chauve-souris, H02 Citrouille
# python3 tools/halloween.py public/av
import sys, math
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1] if len(sys.argv) > 1 else 'public/av'
S = 1024  # dessin en grand puis réduit à 256 px

def base(c1, c2):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    px = im.load()
    cx = cy = S / 2
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - cx * 0.9, y - cy * 0.8) / (S * 0.55)
            if math.hypot(x - cx, y - cy) <= S * 0.47:
                t = min(1, d)
                px[x, y] = tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3)) + (255,)
    return im

def glow(im, color, box_fn, radius=40):
    g = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    box_fn(ImageDraw.Draw(g), color)
    g = g.filter(ImageFilter.GaussianBlur(radius))
    return Image.alpha_composite(im, g)

def save(im, name):
    im.resize((256, 256), Image.LANCZOS).save(f'{out}/{name}.webp', quality=90)

# --- H01 chauve-souris sur lune orange ---
im = base((70, 30, 110), (14, 6, 26))
im = glow(im, (255, 150, 40, 230), lambda d, c: d.ellipse([S*0.30, S*0.18, S*0.70, S*0.58], fill=c), 60)
d = ImageDraw.Draw(im)
d.ellipse([S*0.32, S*0.20, S*0.68, S*0.56], fill=(255, 196, 110, 255))
d.ellipse([S*0.36, S*0.24, S*0.64, S*0.52], fill=(255, 220, 150, 255))
bat = Image.new('RGBA', (S, S), (0, 0, 0, 0)); b = ImageDraw.Draw(bat)
cx, cy = S/2, S*0.50
wing_l = [(cx-S*0.04, cy-S*0.06), (cx-S*0.18, cy-S*0.16), (cx-S*0.36, cy-S*0.14), (cx-S*0.44, cy-S*0.04), (cx-S*0.36, cy-S*0.02),
          (cx-S*0.32, cy+S*0.08), (cx-S*0.24, cy+S*0.02), (cx-S*0.18, cy+S*0.12), (cx-S*0.12, cy+S*0.04), (cx-S*0.04, cy+S*0.10)]
wing_r = [(2*cx - x, y) for x, y in wing_l]
b.polygon(wing_l, fill=(18, 8, 30, 255)); b.polygon(wing_r, fill=(18, 8, 30, 255))
b.ellipse([cx-S*0.07, cy-S*0.12, cx+S*0.07, cy+S*0.12], fill=(18, 8, 30, 255))
b.polygon([(cx-S*0.06, cy-S*0.10), (cx-S*0.09, cy-S*0.20), (cx-S*0.02, cy-S*0.13)], fill=(18, 8, 30, 255))
b.polygon([(cx+S*0.06, cy-S*0.10), (cx+S*0.09, cy-S*0.20), (cx+S*0.02, cy-S*0.13)], fill=(18, 8, 30, 255))
b.ellipse([cx-S*0.035, cy-S*0.07, cx-S*0.012, cy-S*0.045], fill=(255, 90, 60, 255))
b.ellipse([cx+S*0.012, cy-S*0.07, cx+S*0.035, cy-S*0.045], fill=(255, 90, 60, 255))
im = Image.alpha_composite(im, bat)
d = ImageDraw.Draw(im)
for (x, y, r) in [(0.18, 0.70, 7), (0.80, 0.74, 9), (0.28, 0.82, 5), (0.70, 0.84, 6), (0.84, 0.30, 6), (0.16, 0.30, 5)]:
    d.ellipse([S*x-r, S*y-r, S*x+r, S*y+r], fill=(255, 240, 200, 255))
save(im, 'H01')

# --- H02 citrouille ---
im = base((60, 24, 90), (12, 6, 22))
im = glow(im, (255, 120, 20, 200), lambda d, c: d.ellipse([S*0.22, S*0.30, S*0.78, S*0.78], fill=c), 70)
d = ImageDraw.Draw(im)
for dx, w, col in [(-0.20, 0.26, (214, 86, 10)), (0.20, 0.26, (214, 86, 10)), (-0.10, 0.30, (240, 110, 20)), (0.10, 0.30, (240, 110, 20)), (0.0, 0.32, (255, 135, 30))]:
    d.ellipse([S*(0.5+dx-w/2), S*0.32, S*(0.5+dx+w/2), S*0.76], fill=col)
d.polygon([(S*0.47, S*0.34), (S*0.53, S*0.34), (S*0.55, S*0.22), (S*0.49, S*0.20)], fill=(70, 110, 40, 255))
d.polygon([(S*0.30, S*0.46), (S*0.42, S*0.46), (S*0.36, S*0.34)], fill=(40, 12, 8, 255))
d.polygon([(S*0.58, S*0.46), (S*0.70, S*0.46), (S*0.64, S*0.34)], fill=(40, 12, 8, 255))
mouth = [(S*0.30, S*0.58), (S*0.38, S*0.56), (S*0.44, S*0.62), (S*0.50, S*0.57), (S*0.56, S*0.62), (S*0.62, S*0.56), (S*0.70, S*0.58),
         (S*0.64, S*0.70), (S*0.56, S*0.66), (S*0.50, S*0.71), (S*0.44, S*0.66), (S*0.36, S*0.70)]
d.polygon(mouth, fill=(40, 12, 8, 255))
d.polygon([(S*0.30, S*0.46), (S*0.42, S*0.46), (S*0.36, S*0.34)], fill=(255, 210, 90, 255))
d.polygon([(S*0.58, S*0.46), (S*0.70, S*0.46), (S*0.64, S*0.34)], fill=(255, 210, 90, 255))
d.polygon(mouth, fill=(255, 210, 90, 255))
save(im, 'H02')
print('ok')
