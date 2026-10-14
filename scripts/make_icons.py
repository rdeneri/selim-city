"""Uygulama simgelerini üretir (public/ klasörüne). Çalıştırma: python3 scripts/make_icons.py
Gereken: Pillow. Font: Lilita One (OFL lisanslı) — yoksa kalın varsayılan font kullanılır."""
from PIL import Image, ImageDraw, ImageFont
import os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
FONT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/Lilita.ttf'
NAVY = (27, 31, 59)

def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except Exception:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size)

def draw_icon(S, safe=1.0):
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    # gökyüzü degradesi
    for y in range(S):
        t = y / S
        c = (int(95 + (190 - 95) * t), int(184 + (232 - 184) * t), 255)
        d.line([(0, y), (S, y)], fill=c)
    k = S / 1024 * safe
    ox = S / 2 - 512 * k
    oy = S / 2 - 512 * k
    def R(x0, y0, x1, y1):
        return [ox + x0 * k, oy + y0 * k, ox + x1 * k, oy + y1 * k]
    # zemin plakası ve çıkıntılar
    d.rounded_rectangle(R(-200, 760, 1224, 1400), radius=int(40 * k), fill=(93, 187, 99))
    for i in range(-2, 13):
        x = i * 96 + 30
        d.ellipse(R(x - 26, 744, x + 26, 776), fill=(108, 203, 114))
    # binalar (arka planda)
    blocks = [(70, 470, 250, 770, (255, 138, 122)), (780, 420, 960, 770, (111, 184, 255)), (250, 560, 370, 770, (255, 194, 61)), (660, 560, 790, 770, (138, 108, 255))]
    for x0, y0, x1, y1, c in blocks:
        d.rounded_rectangle(R(x0, y0, x1, y1), radius=int(10 * k), fill=c, outline=NAVY, width=max(2, int(10 * k)))
        for sx in (x0 + 40, x1 - 40):
            d.rounded_rectangle(R(sx - 24, y0 - 26, sx + 24, y0 + 4), radius=int(6 * k), fill=c, outline=NAVY, width=max(2, int(8 * k)))
        for wy in range(y0 + 50, y1 - 60, 90):
            d.rectangle(R(x0 + 30, wy, x0 + 70, wy + 40), fill=(220, 240, 255))
            if x1 - x0 > 150:
                d.rectangle(R(x1 - 70, wy, x1 - 30, wy + 40), fill=(220, 240, 255))
    # blok karakter kafası
    d.rounded_rectangle(R(420, 180, 604, 250), radius=int(18 * k), fill=(255, 212, 59), outline=NAVY, width=max(3, int(14 * k)))
    d.rounded_rectangle(R(300, 230, 724, 640), radius=int(90 * k), fill=(255, 212, 59), outline=NAVY, width=max(3, int(16 * k)))
    d.ellipse(R(398, 360, 452, 432), fill=NAVY)
    d.ellipse(R(572, 360, 626, 432), fill=NAVY)
    d.ellipse(R(410, 370, 428, 388), fill=(255, 255, 255))
    d.ellipse(R(584, 370, 602, 388), fill=(255, 255, 255))
    d.arc(R(392, 400, 632, 570), start=20, end=160, fill=NAVY, width=max(3, int(22 * k)))
    # gövde (tişört)
    d.polygon([tuple(R(330, 640, 330, 640)[:2]), tuple(R(694, 640, 694, 640)[:2]), tuple(R(760, 900, 760, 900)[:2]), tuple(R(264, 900, 264, 900)[:2])], fill=(74, 168, 255), outline=NAVY, width=max(3, int(14 * k)))
    # tuğla rozet: "Aa"
    d.rounded_rectangle(R(600, 690, 940, 900), radius=int(22 * k), fill=(232, 71, 59), outline=NAVY, width=max(3, int(14 * k)))
    for sx in (680, 860):
        d.rounded_rectangle(R(sx - 42, 650, sx + 42, 700), radius=int(12 * k), fill=(232, 71, 59), outline=NAVY, width=max(3, int(12 * k)))
    f = font(int(170 * k))
    tx, ty = ox + 770 * k, oy + 800 * k
    d.text((tx, ty), 'Aa', font=f, anchor='mm', fill=(255, 255, 255), stroke_width=max(2, int(12 * k)), stroke_fill=NAVY)
    return im

os.makedirs(OUT, exist_ok=True)
master = draw_icon(1024)
for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png'), (64, 'favicon.png')]:
    master.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
draw_icon(1024, safe=0.78).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
print('ok')
