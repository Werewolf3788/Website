import sys, os
from PIL import Image, ImageDraw

BG    = (11, 20, 48, 255)
GRASS = (95, 158, 47, 255)
GRASS2= (78, 140, 38, 255)
WHITE = (229, 231, 235, 255)
STONE = (176, 184, 196, 255)
BLUE  = (37, 99, 235, 255)
BLUE2 = (29, 78, 216, 255)
GOLD  = (251, 191, 36, 255)
DGOLD = (180, 83, 9, 255)


def tri(d, p, fill):
    d.polygon(p, fill=fill)


def draw_art(img, scale, ox, oy):
    """Draw the castle picture with its own 512 coordinate space, scaled and offset."""
    d = ImageDraw.Draw(img)

    def s(v):
        return v * scale

    def bx(x0, y0, x1, y1, fill):
        d.rectangle([ox + s(x0), oy + s(y0), ox + s(x1), oy + s(y1)], fill=fill)

    def poly(pts, fill):
        d.polygon([(ox + s(x), oy + s(y)) for x, y in pts], fill=fill)

    def ell(x0, y0, x1, y1, fill):
        d.ellipse([ox + s(x0), oy + s(y0), ox + s(x1), oy + s(y1)], fill=fill)

    # grass platform
    ell(46, 318, 466, 470, GRASS2)
    ell(56, 300, 456, 452, GRASS)

    # side walls
    bx(150, 300, 362, 404, STONE)
    bx(158, 292, 354, 404, WHITE)

    # four turrets with blue roofs
    for x0 in (140, 186, 290, 336):
        bx(x0, 236, x0 + 36, 404, WHITE)
        bx(x0 + 6, 236, x0 + 30, 404, (248, 250, 252, 255))
        poly([(x0 - 8, 238), (x0 + 18, 176), (x0 + 44, 238)], BLUE)
        poly([(x0 - 8, 238), (x0 + 18, 176), (x0 + 18, 238)], BLUE2)

    # gate
    bx(232, 330, 280, 404, (61, 41, 20, 255))
    ell(232, 312, 280, 352, (61, 41, 20, 255))

    # central keep
    bx(206, 250, 306, 340, WHITE)
    bx(214, 250, 298, 340, (248, 250, 252, 255))
    poly([(190, 252), (256, 158), (322, 252)], BLUE)
    poly([(190, 252), (256, 158), (256, 252)], BLUE2)

    # gold flag on the keep
    bx(252, 108, 260, 166, STONE)
    poly([(260, 112), (330, 132), (260, 152)], GOLD)

    # coin
    ell(322, 330, 430, 438, DGOLD)
    ell(330, 338, 422, 430, GOLD)
    ell(352, 358, 400, 406, (253, 224, 71, 255))
    bx(368, 366, 384, 398, DGOLD)


def rounded_background(img, radius_ratio=0.19):
    mask = Image.new('L', img.size, 0)
    d = ImageDraw.Draw(mask)
    r = int(img.size[0] * radius_ratio)
    d.rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=r, fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def make(size, maskable=False):
    img = Image.new('RGBA', (size, size), BG)
    if maskable:
        # art squeezed into the 80% safe zone, full-bleed background
        scale = (size * 0.72) / 512.0
        draw_art(img, scale, size * 0.14, size * 0.16)
        return img
    scale = (size * 0.9) / 512.0
    draw_art(img, scale, size * 0.05, size * 0.05)
    return rounded_background(img)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(out, exist_ok=True)
    make(192).save(os.path.join(out, 'bastion-192.png'))
    make(512).save(os.path.join(out, 'bastion-512.png'))
    make(512, maskable=True).save(os.path.join(out, 'bastion-maskable-512.png'))
    print('icons written to', out)
