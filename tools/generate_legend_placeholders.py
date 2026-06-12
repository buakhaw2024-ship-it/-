#!/usr/bin/env python3
"""Generate tone-matched cinematic placeholder images for the 22 legend characters.

Palettes mirror the .legend-scene-fallback CSS gradients in v5.13 so the
placeholder posters keep per-character visual identity until AI art lands.
Scene: 1200x520 diagonal gradient + right-side glow + vignette + grain.
Portrait: 400x400 radial gradient + rim light + grain.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(REPO_ROOT, 'assets', 'legend')

# (id, c0, c1, c2) — from .legend-scene-fallback[data-mentor=...] gradients
PALETTES = [
    ('mentor_sunzi',       '#0d1e21', '#16322f', '#1a3a30'),
    ('mentor_zhangyi',     '#1a1024', '#2d1a36', '#3a2a18'),
    ('mentor_lihongzhang', '#0f1a26', '#1a2538', '#212a36'),
    ('mentor_inamori',     '#0c1a2a', '#152641', '#1e3550'),
    ('mentor_munger',      '#1c1a14', '#2a2418', '#2e2616'),
    ('mentor_trump',       '#1a0d0d', '#2a1410', '#3a1d10'),
    ('mentor_cleopatra',   '#0e1f2a', '#163346', '#3a2810'),
    ('mentor_wuzetian',    '#220e0e', '#3a1518', '#3a2510'),
    ('mentor_elizabeth_i', '#0d1a13', '#15301f', '#2a2812'),
    ('mentor_catherine',   '#0d1a26', '#16263a', '#2a2616'),
    ('mentor_thatcher',    '#0c1422', '#181f2d', '#2a1818'),
    ('mentor_merkel',      '#11182a', '#1c2438', '#252e40'),
    ('mentor_cixi',        '#1f0e0e', '#2e1514', '#3a2410'),
    ('master_dawson',      '#0c1828', '#16263a', '#1a3a4a'),
    ('master_fisher_ury',  '#1c1810', '#2a2018', '#1a283a'),
    ('master_voss',        '#0a1018', '#162538', '#2a2a18'),
    ('master_cohen',       '#1c1810', '#28201a', '#162538'),
    ('master_diamond',     '#1c1410', '#2a1d18', '#3a2a14'),
    ('master_shell',       '#181028', '#251a3a', '#1a2a4a'),
    ('mentor_churchill',   '#161814', '#252820', '#3a2818'),
    ('mentor_roosevelt',   '#1a140c', '#2a1f18', '#162538'),
    ('mentor_stalin',      '#14181c', '#1f2528', '#2a1414'),
]

GOLD = (244, 210, 138)


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def tri_lerp(c0, c1, c2, t):
    # match CSS: c0 -> c1 at 60% -> c2 at 100%
    if t < 0.6:
        return lerp(c0, c1, t / 0.6)
    return lerp(c1, c2, (t - 0.6) / 0.4)


def add_grain(img, strength=7, seed=42):
    rng = random.Random(seed)
    px = img.load()
    w, h = img.size
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            n = rng.randint(-strength, strength)
            r, g, b = px[x, y]
            px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return img


def make_scene(c0, c1, c2, seed):
    w, h = 1200, 520
    img = Image.new('RGB', (w, h))
    px = img.load()
    diag = w + h
    for y in range(h):
        for x in range(w):
            t = (x + y) / diag
            px[x, y] = tri_lerp(c0, c1, c2, t)

    # right-side warm glow at the "character" focal point (78%, 42%)
    glow = Image.new('L', (w, h), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy, rad = int(w * 0.78), int(h * 0.42), int(h * 0.85)
    gd.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=46)
    glow = glow.filter(ImageFilter.GaussianBlur(110))
    warm = Image.new('RGB', (w, h), lerp(c2, GOLD, 0.45))
    img = Image.composite(warm, img, glow)

    # left safe-area darkening (38%)
    dark = Image.new('L', (w, h), 0)
    dpx = dark.load()
    for x in range(w):
        t = x / w
        v = int(150 * max(0.0, 1.0 - t / 0.55))
        for y in range(h):
            dpx[x, y] = v
    img = Image.composite(Image.new('RGB', (w, h), (5, 8, 15)), img, dark)

    # bottom vignette
    vig = Image.new('L', (w, h), 0)
    vpx = vig.load()
    for y in range(h):
        v = int(110 * max(0.0, (y / h - 0.55) / 0.45))
        for x in range(w):
            vpx[x, y] = v
    img = Image.composite(Image.new('RGB', (w, h), (0, 0, 0)), img, vig)

    return add_grain(img, 6, seed)


def make_portrait(c0, c1, c2, seed):
    s = 400
    img = Image.new('RGB', (s, s))
    px = img.load()
    cx, cy = s // 2, int(s * 0.40)
    maxd = math.hypot(cx, s - cy)
    for y in range(s):
        for x in range(s):
            t = min(1.0, math.hypot(x - cx, y - cy) / maxd)
            px[x, y] = tri_lerp(c2, c1, c0, t)

    # rim light arc behind head position
    rim = Image.new('L', (s, s), 0)
    rd = ImageDraw.Draw(rim)
    rd.ellipse([cx - 120, cy - 120, cx + 120, cy + 120], outline=70, width=26)
    rim = rim.filter(ImageFilter.GaussianBlur(36))
    img = Image.composite(Image.new('RGB', (s, s), lerp(c2, GOLD, 0.5)), img, rim)

    return add_grain(img, 6, seed)


def main():
    scenes_dir = os.path.join(BASE, 'scenes')
    portraits_dir = os.path.join(BASE, 'portraits')
    os.makedirs(scenes_dir, exist_ok=True)
    os.makedirs(portraits_dir, exist_ok=True)

    for i, (cid, h0, h1, h2) in enumerate(PALETTES):
        c0, c1, c2 = hex_rgb(h0), hex_rgb(h1), hex_rgb(h2)
        scene = make_scene(c0, c1, c2, seed=i)
        scene.save(os.path.join(scenes_dir, f'{cid}_scene.webp'), 'WEBP', quality=82)
        portrait = make_portrait(c0, c1, c2, seed=i + 100)
        portrait.save(os.path.join(portraits_dir, f'{cid}_portrait.webp'), 'WEBP', quality=85)
        print(f'  {cid}: scene + portrait')

    print(f'\nDone: {len(PALETTES)} x 2 = {len(PALETTES) * 2} images')


if __name__ == '__main__':
    main()
