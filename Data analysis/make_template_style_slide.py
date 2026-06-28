from pathlib import Path
import textwrap

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


BASE = Path(__file__).resolve().parent
TABLES = BASE / "outputs" / "tables"
OUT = BASE / "outputs" / "template_style"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900
COL = {
    "navy": "#111437",
    "purple": "#6B3BEA",
    "purple_light": "#F3EEFF",
    "pink": "#EE3D77",
    "pink_light": "#FFEAF2",
    "yellow": "#F5A623",
    "yellow_light": "#FFF5D8",
    "blue": "#3478F6",
    "blue_light": "#EAF3FF",
    "green": "#2EAD4D",
    "green_light": "#ECF9EE",
    "line": "#DDD5F5",
    "text": "#232445",
    "muted": "#5F6075",
    "white": "#FFFFFF",
}


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


F = {
    "title": font(38, True),
    "stage": font(17, True),
    "label": font(15, True),
    "small": font(13),
    "small_bold": font(13, True),
    "number": font(22, True),
    "insight": font(18, True),
}


def wrap(s, width):
    return textwrap.wrap(str(s), width=width, break_long_words=False) or [""]


def text_size(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0], b[3] - b[1]


def draw_center(draw, x, y, text, fnt, fill):
    tw, _ = text_size(draw, text, fnt)
    draw.text((x - tw // 2, y), text, font=fnt, fill=fill)


def draw_wrapped(draw, x, y, text, fnt, fill, width, gap=3):
    lh = text_size(draw, "Ag", fnt)[1] + gap
    for line in wrap(text, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += lh
    return y


def read(name):
    return pd.read_csv(TABLES / name)


def draw_badge(draw, box, title, number, colour):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=20, fill="#FFFFFF", outline="#E7DFFB", width=2)
    draw_center(draw, (x1 + x2) // 2, y1 + 20, number, font(32, True), colour)
    draw_wrapped(draw, x1 + 18, y1 + 66, title, F["small_bold"], COL["text"], 22)


def value_fill(value, max_value):
    t = value / max_value
    base = np.array((255, 250, 239))
    high = np.array((245, 166, 35))
    return tuple(np.round(base * (1 - t) + high * t).astype(int))


def make_gap_template_slide():
    heat = read("gap_heatmap_by_field.csv")
    fields = heat["field"].tolist()
    cols = [c for c in heat.columns if c != "field"]
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    tx, ty = 26, 18
    d.text((tx, ty), "Where ", font=F["title"], fill=COL["navy"])
    tx += text_size(d, "Where ", F["title"])[0]
    d.text((tx, ty), "Learning Gaps", font=F["title"], fill=COL["pink"])
    tx += text_size(d, "Learning Gaps", F["title"])[0] + 10
    d.text((tx, ty), " Are Strongest by Field", font=F["title"], fill=COL["navy"])

    left_x, top_y = 18, 92
    left_w, main_w = 200, 840
    table_h = 665

    d.rounded_rectangle((left_x, top_y, left_x + left_w, top_y + table_h), radius=12, fill="#FFFFFF", outline=COL["line"], width=2)
    d.rounded_rectangle((left_x, top_y, left_x + left_w, top_y + 44), radius=12, fill=COL["purple"])
    d.rectangle((left_x, top_y + 24, left_x + left_w, top_y + 44), fill=COL["purple"])
    draw_center(d, left_x + left_w // 2, top_y + 13, "The Fields", F["stage"], COL["white"])

    stage_x = left_x + left_w + 10
    stage_w = main_w // 3
    stages = [
        ("1. INDUSTRY EXPOSURE", COL["purple"], COL["purple_light"]),
        ("2. HANDS-ON APPLICATION", COL["pink"], COL["pink_light"]),
        ("3. PATHWAYS & ACCESS", COL["yellow"], COL["yellow_light"]),
    ]
    for i, (label, colour, fill) in enumerate(stages):
        x = stage_x + i * stage_w
        d.rounded_rectangle((x, top_y, x + stage_w + 8, top_y + table_h), radius=12, fill=fill, outline=COL["line"], width=2)
        d.polygon([(x + stage_w - 20, top_y), (x + stage_w + 8, top_y + 38), (x + stage_w - 20, top_y + 76)], fill=fill, outline=COL["line"])
        draw_center(d, x + stage_w // 2, top_y + 24, label, F["stage"], colour)

    # right outcome panels
    right_x = 1372
    d.rounded_rectangle((right_x, 230, right_x + 190, 400), radius=14, fill=COL["green_light"], outline="#A8DFAE", width=2)
    draw_center(d, right_x + 95, 252, "1. INDUSTRY", F["stage"], COL["green"])
    draw_center(d, right_x + 95, 278, "OPPORTUNITY", F["stage"], COL["green"])
    draw_wrapped(d, right_x + 18, 315, "Company challenges, practitioner access, and internships.", F["small_bold"], COL["text"], 21)

    d.rounded_rectangle((right_x, 505, right_x + 190, 675), radius=14, fill=COL["blue_light"], outline="#A9CCFF", width=2)
    draw_center(d, right_x + 95, 527, "2. LAUNCHPAD", F["stage"], COL["blue"])
    draw_center(d, right_x + 95, 553, "DESIGN", F["stage"], COL["blue"])
    draw_wrapped(d, right_x + 18, 590, "Hybrid sprint with portfolio proof and pathway conversion.", F["small_bold"], COL["text"], 21)

    # field rows and heatmap cells
    row_y = top_y + 95
    row_h = 82
    cell_w = 125
    cell_h = 56
    cell_x = stage_x + 20
    maxv = max(75, heat[cols].to_numpy().max())
    col_groups = [cols[:2], cols[2:4], cols[4:]]
    flattened_cols = [c for group in col_groups for c in group]

    for j, col in enumerate(flattened_cols):
        x = cell_x + j * cell_w
        draw_wrapped(d, x + 4, top_y + 62, col, F["small_bold"], COL["text"], 15, 1)

    for i, field in enumerate(fields):
        y = row_y + i * row_h
        d.line((left_x + 14, y - 18, left_x + left_w - 14, y - 18), fill="#EEE9FA", width=1)
        draw_wrapped(d, left_x + 18, y + 1, field, F["label"], COL["text"], 20, 2)
        for j, col in enumerate(flattened_cols):
            val = float(heat.loc[i, col])
            x = cell_x + j * cell_w
            fill = value_fill(val, maxv)
            d.rounded_rectangle((x, y, x + cell_w - 12, y + cell_h), radius=10, fill=fill, outline="#F0D39A", width=1)
            txt = f"{val:.0f}%"
            draw_center(d, x + (cell_w - 12) // 2, y + 15, txt, F["number"], COL["navy"])

    # stuck / interpretation bubble
    bubble_x, bubble_y = 1120, 342
    bubble_size = 228
    d.ellipse((bubble_x, bubble_y, bubble_x + bubble_size, bubble_y + bubble_size), fill="#F7F1FF", outline=COL["purple"], width=3)
    draw_center(d, bubble_x + bubble_size // 2, bubble_y + 38, "INSIGHT", font(25, True), COL["purple"])
    draw_wrapped(d, bubble_x + 44, bubble_y + 78, "The strongest pattern is not lack of curiosity. It is lack of exposure, application, and access.", F["small_bold"], COL["text"], 24)
    d.rounded_rectangle((bubble_x + 26, bubble_y + 164, bubble_x + 202, bubble_y + 218), radius=10, fill=COL["purple"])
    draw_center(d, bubble_x + 114, bubble_y + 173, "Launchpad must", F["small_bold"], COL["white"])
    draw_center(d, bubble_x + 114, bubble_y + 191, "fill this gap", F["small_bold"], COL["white"])

    # bottom key insight
    d.rounded_rectangle((95, 780, 1515, 858), radius=12, fill="#FFFDF6", outline="#F0CF86", width=2)
    d.text((155, 805), "KEY INSIGHT", font=F["insight"], fill=COL["yellow"])
    draw_wrapped(d, 340, 798, "Learners are interested and willing to learn, but face major barriers: fragmented information, lack of real-world exposure, and limited access to opportunities. Reactor Academy can bridge potential to real-world impact.", F["small_bold"], COL["text"], 118, 4)

    out = OUT / "gap_heatmap_template_style.png"
    img.save(out, quality=95)
    print(out)


def make_clean_slide_background_version():
    heat = read("gap_heatmap_by_field.csv")
    fields = heat["field"].tolist()
    cols = [c for c in heat.columns if c != "field"]
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    tx, ty = 32, 24
    d.text((tx, ty), "Where ", font=F["title"], fill=COL["navy"])
    tx += text_size(d, "Where ", F["title"])[0]
    d.text((tx, ty), "Learning Gaps", font=F["title"], fill=COL["pink"])
    tx += text_size(d, "Learning Gaps", F["title"])[0] + 10
    d.text((tx, ty), "Are Strongest by Field", font=F["title"], fill=COL["navy"])

    left_x, top_y = 28, 112
    left_w, table_w, table_h = 255, 1265, 700
    d.rounded_rectangle((left_x, top_y, left_x + left_w, top_y + table_h), radius=14, fill="#FFFFFF", outline=COL["line"], width=2)
    d.rounded_rectangle((left_x, top_y, left_x + left_w, top_y + 48), radius=14, fill=COL["purple"])
    d.rectangle((left_x, top_y + 25, left_x + left_w, top_y + 48), fill=COL["purple"])
    draw_center(d, left_x + left_w // 2, top_y + 15, "The Fields", F["stage"], COL["white"])

    table_x = left_x + left_w + 14
    group_w = table_w // 3
    groups = [
        ("1. INDUSTRY EXPOSURE", COL["purple"], COL["purple_light"]),
        ("2. HANDS-ON APPLICATION", COL["pink"], COL["pink_light"]),
        ("3. PATHWAYS & ACCESS", COL["yellow"], COL["yellow_light"]),
    ]
    for i, (label, colour, fill) in enumerate(groups):
        x = table_x + i * group_w
        d.rounded_rectangle((x, top_y, x + group_w, top_y + table_h), radius=14, fill=fill, outline=COL["line"], width=2)
        draw_center(d, x + group_w // 2, top_y + 24, label, F["stage"], colour)

    row_y = top_y + 104
    row_h = 86
    cell_h = 58
    cell_w = 187
    cell_x = table_x + 28
    maxv = max(75, heat[cols].to_numpy().max())
    for j, col in enumerate(cols):
        x = cell_x + j * cell_w
        draw_wrapped(d, x + 4, top_y + 62, col, F["small_bold"], COL["text"], 18, 1)

    for i, field in enumerate(fields):
        y = row_y + i * row_h
        d.line((left_x + 16, y - 19, left_x + left_w - 16, y - 19), fill="#EEE9FA", width=1)
        draw_wrapped(d, left_x + 22, y + 2, field, F["label"], COL["text"], 24, 2)
        for j, col in enumerate(cols):
            val = float(heat.loc[i, col])
            x = cell_x + j * cell_w
            fill = value_fill(val, maxv)
            d.rounded_rectangle((x, y, x + cell_w - 16, y + cell_h), radius=10, fill=fill, outline="#F0D39A", width=1)
            draw_center(d, x + (cell_w - 16) // 2, y + 16, f"{val:.0f}%", F["number"], COL["navy"])

    out = OUT / "gap_heatmap_clean_slide_background.png"
    img.save(out, quality=95)
    print(out)


if __name__ == "__main__":
    make_clean_slide_background_version()
