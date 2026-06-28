from pathlib import Path
import re
import textwrap

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


BASE = Path(__file__).resolve().parent
TABLES = BASE / "outputs" / "tables"
OUT = BASE / "outputs" / "canva_dashboard_pack"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
COL = {
    "bg": "#1E2220",
    "panel": "#151515",
    "panel2": "#202020",
    "line": "#3A3A3A",
    "orange": "#fcb33b",
    "white": "#FFFFFF",
    "muted": "#B7B7B7",
    "darkbar": "#343434",
    "ink": "#111111",
}


def rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


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
    "title": font(46, True),
    "section": font(28, True),
    "metric": font(56, True),
    "body": font(22),
    "body_bold": font(22, True),
    "small": font(17),
    "small_bold": font(17, True),
    "field_bold": font(21, True),
    "tiny": font(14),
}


def clean(s):
    return re.sub(r"\s+", " ", str(s)).strip()


def wrap_text(s, width):
    return textwrap.wrap(clean(s), width=width, break_long_words=False) or [""]


def size(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0], b[3] - b[1]


def draw_right(draw, x, y, text, fnt, fill):
    tw, _ = size(draw, text, fnt)
    draw.text((x - tw, y), text, font=fnt, fill=fill)


def draw_center(draw, x, y, text, fnt, fill):
    tw, _ = size(draw, text, fnt)
    draw.text((x - tw // 2, y), text, font=fnt, fill=fill)


def draw_wrapped(draw, x, y, text, fnt, fill, width, gap=5):
    lh = size(draw, "Ag", fnt)[1] + gap
    for line in wrap_text(text, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += lh
    return y


def star_field(draw):
    rng = np.random.default_rng(3750)
    for _ in range(90):
        x = int(rng.integers(15, W - 15))
        y = int(rng.integers(12, H - 12))
        r = int(rng.choice([1, 1, 1, 2]))
        shade = int(rng.integers(165, 245))
        draw.ellipse((x, y, x + r, y + r), fill=(shade, shade, shade, 170))


def base_slide(title, subtitle):
    img = Image.new("RGBA", (W, H), rgb(COL["bg"]) + (255,))
    d = ImageDraw.Draw(img)
    star_field(d)
    d.text((78, 66), title, font=F["title"], fill=COL["white"])
    draw_wrapped(d, 80, 130, subtitle, F["body"], COL["muted"], 112)
    d.line((80, 188, 760, 188), fill=COL["orange"], width=3)
    d.text((80, H - 50), "Source: Reactor Academy learner needs survey, n = 107", font=F["small"], fill=COL["muted"])
    return img, d


def read(name):
    return pd.read_csv(TABLES / name)


def panel(draw, box, title):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=24, fill=COL["panel"], outline=COL["line"], width=2)
    draw.text((x1 + 34, y1 + 30), title, font=F["section"], fill=COL["white"])


def metric_card(draw, box, big, label):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=22, fill=COL["panel"], outline=COL["line"], width=2)
    draw.text((x1 + 30, y1 + 26), big, font=F["metric"], fill=COL["orange"])
    draw_wrapped(draw, x1 + 32, y1 + 94, label, F["small_bold"], COL["white"], 24)


def bars(draw, table, x, y, w, row_h, max_rows, value_x=None):
    data = table.head(max_rows).copy()
    maxp = max(float(data["percent"].max()), 1)
    if value_x is None:
        value_x = x + w + 70
    for i, row in data.iterrows():
        yy = y + i * row_h
        draw_wrapped(draw, x, yy - 2, row["option"], F["small_bold"], COL["white"], 34)
        by = yy + 42
        draw.rounded_rectangle((x, by, x + w, by + 18), radius=9, fill=COL["darkbar"])
        bw = int(w * row["percent"] / maxp)
        draw.rounded_rectangle((x, by, x + bw, by + 18), radius=9, fill=COL["orange"])
        draw_right(draw, value_x, by - 5, f"{row['percent']:.0f}%", F["small_bold"], COL["white"])


def slide_gap_heatmap():
    heat = read("gap_heatmap_by_field.csv")
    img, d = base_slide(
        "Where learning gaps are strongest by field",
        "Use this as the first evidence slide: it shows which learner groups most need industry exposure, projects, and access.",
    )
    metric_card(d, (80, 240, 390, 395), "48%", "overall lack real industry exposure")
    metric_card(d, (420, 240, 730, 395), "75%", "Science / Research lack industry exposure")
    metric_card(d, (760, 240, 1070, 395), "57%", "Finance / FinTech want projects and exposure")
    metric_card(d, (1100, 240, 1410, 395), "60%", "Engineering / Robotics lack exposure")

    fields = heat["field"].tolist()
    cols = [c for c in heat.columns if c != "field"]
    x0, y0 = 520, 485
    label_x = 80
    cell_w, cell_h = 195, 70
    for j, col in enumerate(cols):
        draw_wrapped(d, x0 + j * cell_w + 8, y0 - 78, col, F["small_bold"], COL["white"], 18, 2)
    maxv = max(70, heat[cols].to_numpy().max())
    for i, field in enumerate(fields):
        y = y0 + i * cell_h
        draw_wrapped(d, label_x, y + 12, field, F["field_bold"], COL["white"], 32)
        for j, col in enumerate(cols):
            val = float(heat.loc[i, col])
            t = val / maxv
            base = np.array(rgb("#353535"))
            high = np.array(rgb(COL["orange"]))
            color = tuple(np.round(base * (1 - t) + high * t).astype(int))
            x = x0 + j * cell_w
            d.rounded_rectangle((x, y, x + cell_w - 12, y + cell_h - 12), radius=12, fill=color, outline="#4A4A4A")
            fill = COL["ink"] if t > 0.45 else COL["white"]
            draw_center(d, x + (cell_w - 12) // 2, y + 20, f"{val:.0f}%", F["body_bold"], fill)
    img.convert("RGB").save(OUT / "01_canva_gap_heatmap_dashboard.png", quality=95)


def slide_learning_activity():
    sources = read("learning_source.csv")
    activities = read("learning_activities.csv")
    content = read("want_to_learn.csv")
    img, d = base_slide(
        "How learners want to learn",
        "Learners already self-learn online, but they want Reactor to add structure, hands-on action, and real people.",
    )
    metric_card(d, (80, 240, 370, 395), "94%", "start with YouTube, Google, or AI")
    metric_card(d, (400, 240, 690, 395), "42%", "want hands-on prototyping")
    metric_card(d, (720, 240, 1010, 395), "72%", "prefer hybrid or in-person-heavy")
    metric_card(d, (1040, 240, 1330, 395), "72%", "rate Launchpad 4 or 5")

    panel(d, (80, 455, 610, 925), "Where they start")
    bars(d, sources, 115, 525, 315, 76, 5, 535)
    panel(d, (695, 455, 1225, 925), "What they want to do")
    bars(d, activities, 730, 525, 315, 76, 5, 1150)
    panel(d, (1310, 455, 1840, 925), "What they want to learn")
    bars(d, content, 1345, 525, 315, 76, 5, 1765)
    img.convert("RGB").save(OUT / "02_canva_learning_activity_dashboard.png", quality=95)


def slide_business_model():
    access = read("access_model.csv")
    pay = read("willingness_to_pay.csv")
    risks = read("joining_hesitation.csv")
    img, d = base_slide(
        "Business model evidence",
        "The data points away from a student-paid course and toward an ecosystem-funded launchpad.",
    )
    metric_card(d, (80, 240, 390, 395), "58%", "say cost could stop them joining")
    metric_card(d, (420, 240, 730, 395), "25%", "prefer free, sponsor-funded access")
    metric_card(d, (760, 240, 1070, 395), "22%", "prefer university or school-paid access")
    metric_card(d, (1100, 240, 1410, 395), "35%", "only willing to pay a small amount")

    panel(d, (80, 455, 610, 925), "Preferred funding route")
    bars(d, access, 115, 525, 315, 76, 5, 535)
    panel(d, (695, 455, 1225, 925), "Willingness to pay")
    bars(d, pay, 730, 525, 315, 76, 5, 1150)
    panel(d, (1310, 455, 1840, 925), "Adoption risks")
    bars(d, risks, 1345, 525, 315, 76, 5, 1765)
    img.convert("RGB").save(OUT / "03_canva_business_model_dashboard.png", quality=95)


if __name__ == "__main__":
    slide_gap_heatmap()
    slide_learning_activity()
    slide_business_model()
    print(f"Saved Canva dashboard pack to: {OUT}")
