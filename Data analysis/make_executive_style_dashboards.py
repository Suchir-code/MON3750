from pathlib import Path
import textwrap

import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import numpy as np


BASE = Path(__file__).resolve().parent
TABLES = BASE / "outputs" / "tables"
OUT = BASE / "outputs" / "executive_style_canva"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1800, 1120
COL = {
    "bg": "#1E2220",
    "panel": "#151515",
    "line": "#3A3A3A",
    "bar_bg": "#343434",
    "orange": "#fcb33b",
    "white": "#FFFFFF",
    "muted": "#B7B7B7",
}


def rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def font(size, bold=False):
    paths = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F = {
    "title": font(46, True),
    "subtitle": font(23),
    "h2": font(30, True),
    "metric": font(54, True),
    "body": font(20),
    "body_bold": font(20, True),
    "small": font(16),
    "small_bold": font(16, True),
}


def text_size(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0], b[3] - b[1]


def wrap(text, width):
    return textwrap.wrap(str(text), width=width, break_long_words=False) or [""]


def draw_wrapped(draw, x, y, text, fnt, fill, width, gap=5):
    lh = text_size(draw, "Ag", fnt)[1] + gap
    for line in wrap(text, width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += lh


def draw_right(draw, x, y, text, fnt, fill):
    tw, _ = text_size(draw, text, fnt)
    draw.text((x - tw, y), text, font=fnt, fill=fill)


def star_field(draw):
    rng = np.random.default_rng(3750)
    for _ in range(65):
        x = int(rng.integers(20, W - 20))
        y = int(rng.integers(15, H - 15))
        r = int(rng.choice([1, 1, 1, 2]))
        shade = int(rng.integers(165, 245))
        draw.ellipse((x, y, x + r, y + r), fill=(shade, shade, shade, 175))


def base(title, subtitle):
    img = Image.new("RGBA", (W, H), rgb(COL["bg"]) + (255,))
    d = ImageDraw.Draw(img)
    star_field(d)
    d.text((70, 70), title, font=F["title"], fill=COL["white"])
    draw_wrapped(d, 72, 132, subtitle, F["subtitle"], COL["muted"], 90)
    d.line((70, 198, 1390, 198), fill=COL["orange"], width=3)
    d.text((52, H - 42), "Source: Reactor Academy learner needs survey, n = 107", font=F["small"], fill=COL["muted"])
    return img, d


def card(draw, x, y, big, label, note=""):
    cw, ch = 500, 190
    draw.rounded_rectangle((x, y, x + cw, y + ch), radius=22, fill=COL["panel"], outline=COL["line"], width=2)
    draw.text((x + 36, y + 28), big, font=F["metric"], fill=COL["orange"])
    draw_wrapped(draw, x + 38, y + 98, label, F["body_bold"], COL["white"], 28, 4)
    if note:
        draw_wrapped(draw, x + 38, y + 135, note, F["small"], COL["muted"], 34, 4)


def cards(draw, items):
    coords = [(70, 255), (640, 255), (1210, 255), (70, 510), (640, 510), (1210, 510)]
    for (x, y), item in zip(coords, items):
        card(draw, x, y, *item)


def bottom_bars(draw, title, rows):
    draw.text((72, 760), title, font=F["h2"], fill=COL["white"])
    x_label, x_bar, y0, bar_w = 74, 520, 815, 1050
    value_x = x_bar + bar_w + 52
    maxv = max(v for _, v in rows)
    for i, (label, val) in enumerate(rows):
        y = y0 + i * 42
        draw.text((x_label, y - 5), label, font=F["small_bold"], fill=COL["white"])
        draw.rounded_rectangle((x_bar, y, x_bar + bar_w, y + 22), radius=10, fill=COL["bar_bg"])
        bw = int(bar_w * val / maxv)
        draw.rounded_rectangle((x_bar, y, x_bar + bw, y + 22), radius=10, fill=COL["orange"])
        draw_right(draw, value_x, y - 3, f"{val:.0f}%", F["small_bold"], COL["white"])


def read(name):
    return pd.read_csv(TABLES / name)


def save(img, name):
    path = OUT / name
    img.convert("RGB").save(path, quality=95)
    print(path)


def gap_dashboard():
    heat = read("gap_heatmap_by_field.csv")
    signals = [
        ("Science / Research", "Real industry exposure", 75),
        ("Engineering / Robotics", "Real industry exposure", 60),
        ("Finance / FinTech", "Real industry exposure", 57),
        ("Finance / FinTech", "Hands-on projects", 57),
        ("Biotech / Health", "Hands-on projects", 56),
        ("AI / CS / Data", "Real industry exposure", 56),
    ]
    img, d = base(
        "Where learning gaps are strongest by field",
        "The sharpest need is not more content. Learners need industry exposure, hands-on projects, and clearer access pathways.",
    )
    cards(
        d,
        [
            ("75%", "Science / Research", "lack industry exposure"),
            ("60%", "Engineering / Robotics", "lack industry exposure"),
            ("57%", "Finance / FinTech", "lack industry exposure"),
            ("57%", "Finance / FinTech", "lack hands-on projects"),
            ("56%", "Biotech / Health", "lack hands-on projects"),
            ("56%", "AI / CS / Data", "lack industry exposure"),
        ],
    )
    bottom_bars(d, "Top field-gap signals", [(f"{a}: {b}", c) for a, b, c in signals])
    save(img, "01_gap_by_field_executive_dashboard.png")


def learning_dashboard():
    src = read("learning_source.csv")
    act = read("learning_activities.csv")
    content = read("want_to_learn.csv")
    img, d = base(
        "How learners want to learn",
        "They already self-learn online. Reactor should add structure, hands-on action, practitioner access, and clear outcomes.",
    )
    cards(
        d,
        [
            ("94%", "start with YouTube, Google, or AI", "self-learning is already normal"),
            ("70%", "start with YouTube", "largest discovery channel"),
            ("64%", "want hands-on workshops", "active learning beats lectures"),
            ("42%", "want hands-on prototyping", "learn by building"),
            ("35%", "want practitioner access", "industry connection matters"),
            ("34%", "want team project work", "collaborative sprint fit"),
        ],
    )
    rows = [
        ("YouTube as starting point", float(src[src["option"] == "YouTube"]["percent"].iloc[0])),
        ("Hands-on workshops", float(act[act["option"] == "Hands-on workshops"]["percent"].iloc[0])),
        ("ChatGPT / AI tools", float(src[src["option"] == "ChatGPT / AI tools"]["percent"].iloc[0])),
        ("Google search", float(src[src["option"] == "Google search"]["percent"].iloc[0])),
        ("Hands-on prototyping", float(content[content["option"] == "Hands-on prototyping"]["percent"].iloc[0])),
    ]
    bottom_bars(d, "Learning model evidence", rows)
    save(img, "02_learning_activity_executive_dashboard.png")


def business_dashboard():
    access = read("access_model.csv")
    pay = read("willingness_to_pay.csv")
    risks = read("joining_hesitation.csv")
    img, d = base(
        "Business model evidence",
        "The data points away from a student-paid course and toward an ecosystem-funded launchpad.",
    )
    cards(
        d,
        [
            ("58%", "cost could stop learners joining", "main adoption risk"),
            ("35%", "would pay only a small amount", "price sensitivity is high"),
            ("30%", "location is inconvenient", "hybrid access matters"),
            ("25%", "prefer sponsor-funded access", "companies/sponsors can fund"),
            ("22%", "prefer school-paid access", "universities are possible buyers"),
            ("15%", "prefer company-paid model", "talent access has value"),
        ],
    )
    rows = [
        ("Programme too expensive", float(risks[risks["option"] == "The programme is too expensive"]["percent"].iloc[0])),
        ("Small amount if useful", float(pay[pay["option"] == "A small amount if the programme is useful"]["percent"].iloc[0])),
        ("Location inconvenient", float(risks[risks["option"] == "The location is inconvenient"]["percent"].iloc[0])),
        ("Sponsor-funded access", float(access[access["option"] == "Free for learners, funded by companies or sponsors"]["percent"].iloc[0])),
        ("Paid by universities/schools", float(access[access["option"] == "Paid by universities or schools"]["percent"].iloc[0])),
    ]
    bottom_bars(d, "Why ecosystem-funded makes sense", rows)
    save(img, "03_business_model_executive_dashboard.png")


if __name__ == "__main__":
    gap_dashboard()
    learning_dashboard()
    business_dashboard()
