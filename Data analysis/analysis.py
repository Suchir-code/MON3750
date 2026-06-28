"""
Reactor Academy learner survey analysis.

Outputs:
- branded executive PNG charts in outputs/images
- analysis CSV tables in outputs/tables
- a concise markdown insight report

The charts use Reactor-inspired black, yellow-orange, white, and accent colours.
They are drawn with Pillow so the script works in this workspace without extra installs.
"""

from __future__ import annotations

from pathlib import Path
import math
import re
import textwrap

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFont


BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "Reactor Academy Learner Needs Survey (Responses) - Form responses 1.csv"
OUT_DIR = BASE_DIR / "outputs"
IMG_DIR = OUT_DIR / "images"
TABLE_DIR = OUT_DIR / "tables"
ASSET_DIR = BASE_DIR / "assets"
R_MARK = ASSET_DIR / "reactor_r_mark.png"
WORDMARK = ASSET_DIR / "reactor_school_wordmark.png"

for folder in (IMG_DIR, TABLE_DIR):
    folder.mkdir(parents=True, exist_ok=True)


COL = {
    "black": "#111111",
    "coal": "#1E2220",
    "panel": "#151515",
    "gold": "#fcb33b",
    "amber": "#fcb33b",
    "orange": "#F97316",
    "cream": "#FFF7E6",
    "white": "#FFFFFF",
    "muted": "#A3A3A3",
    "ink": "#222222",
    "line": "#E7D9B7",
    "teal": "#1597A5",
    "coral": "#B91C4C",
    "green": "#22C55E",
    "blue": "#2563EB",
}


def rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


F = {
    "title": font(46, True),
    "subtitle": font(23, False),
    "h2": font(30, True),
    "h3": font(23, True),
    "body": font(20, False),
    "body_bold": font(20, True),
    "small": font(16, False),
    "small_bold": font(16, True),
    "metric": font(54, True),
}


def clean_text(value: object) -> str:
    if pd.isna(value):
        return ""
    text = str(value).strip()
    replacements = {
        "â€“": "-",
        "â€”": "-",
        "â€˜": "'",
        "â€™": "'",
        "â€œ": '"',
        "â€": '"',
        "Â": "",
        "\u2013": "-",
        "\u2014": "-",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return re.sub(r"\s+", " ", text)


def wrap(value: object, width: int) -> list[str]:
    return textwrap.wrap(clean_text(value), width=width, break_long_words=False) or [""]


def text_size(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=text_font)
    return box[2] - box[0], box[3] - box[1]


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    text_font: ImageFont.FreeTypeFont,
    fill: str,
    width: int,
    line_gap: int = 6,
    align: str = "left",
) -> int:
    x, y = xy
    lines = wrap(text, width)
    line_h = text_size(draw, "Ag", text_font)[1] + line_gap
    for line in lines:
        tx = x
        if align == "center":
            tx = x - text_size(draw, line, text_font)[0] // 2
        draw.text((tx, y), line, font=text_font, fill=fill)
        y += line_h
    return y


def draw_right(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, text_font: ImageFont.FreeTypeFont, fill: str) -> None:
    x, y = xy
    tw, _ = text_size(draw, text, text_font)
    draw.text((x - tw, y), text, font=text_font, fill=fill)


def draw_center(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, text_font: ImageFont.FreeTypeFont, fill: str) -> None:
    x, y = xy
    tw, _ = text_size(draw, text, text_font)
    draw.text((x - tw // 2, y), text, font=text_font, fill=fill)


def add_title_rule(draw: ImageDraw.ImageDraw, w: int, y: int = 78) -> None:
    cx = w // 2
    draw.line((cx - 360, y, cx + 360, y), fill=COL["gold"], width=2)
    draw.line((cx - 310, y + 8, cx + 310, y + 8), fill=COL["gold"], width=1)


def add_star_field(draw: ImageDraw.ImageDraw, w: int, h: int) -> None:
    rng = np.random.default_rng(3750)
    for _ in range(70):
        x = int(rng.integers(20, w - 20))
        y = int(rng.integers(15, h - 15))
        r = int(rng.choice([1, 1, 1, 2]))
        shade = int(rng.integers(165, 245))
        draw.ellipse((x, y, x + r, y + r), fill=(shade, shade, shade, 180))


def add_logo(img: Image.Image, x: int, y: int, size: int = 82) -> None:
    if not R_MARK.exists():
        return
    logo = Image.open(R_MARK).convert("RGBA").resize((size, size))
    img.alpha_composite(logo, (x, y))


def save(img: Image.Image, name: str) -> Path:
    path = IMG_DIR / name
    img.convert("RGB").save(path, quality=95)
    print(f"Saved image: {path}")
    return path


def source_note(draw: ImageDraw.ImageDraw, w: int, h: int, dark: bool = False) -> None:
    colour = COL["muted"] if dark else "#6B5F45"
    draw.text((52, h - 42), "Source: Reactor Academy learner needs survey, n = 107", font=F["small"], fill=colour)


def load_data() -> pd.DataFrame:
    df = pd.read_csv(CSV_PATH).dropna(how="all").copy()
    df.columns = [clean_text(c) for c in df.columns]
    cols = list(df.columns)
    rename = {
        cols[0]: "timestamp",
        cols[1]: "age_group",
        cols[2]: "current_stage",
        cols[3]: "field",
        cols[4]: "tech_interest",
        cols[5]: "learning_source",
        cols[6]: "biggest_barrier",
        cols[7]: "education_gap",
        cols[8]: "want_to_learn",
        cols[9]: "learning_level",
        cols[10]: "transferable_skills",
        cols[11]: "desired_outcome",
        cols[12]: "preferred_format",
        cols[13]: "programme_length",
        cols[14]: "learning_activities",
        cols[15]: "engagement_drivers",
        cols[16]: "boring_factors",
        cols[17]: "launchpad_appeal",
        cols[18]: "access_model",
        cols[19]: "joining_hesitation",
        cols[20]: "willingness_to_pay",
    }
    df = df.rename(columns=rename)
    for col in df.columns:
        if col != "timestamp":
            df[col] = df[col].map(clean_text)
    return df


df = load_data()
n = len(df)


TECH = [
    "Artificial intelligence / AI agents",
    "Robotics",
    "Semiconductors / chips",
    "Biotech / health tech",
    "Climate tech",
    "Quantum technology",
    "Cybersecurity",
    "Aerospace / space technology",
    "Advanced materials",
    "FinTech",
    "I am not sure yet",
]
SOURCES = [
    "YouTube",
    "Google search",
    "ChatGPT / AI tools",
    "Online courses",
    "University or school resources",
    "Social media",
    "Friends or peers",
    "Teachers or lecturers",
    "Industry professionals or mentors",
    "I usually do not know where to start",
]
GAPS = [
    "Updated knowledge about new technologies",
    "Real industry exposure",
    "Hands-on projects",
    "Career guidance",
    "Mentorship",
    "Networking opportunities",
    "Startup or research guidance",
    "Confidence to take action",
    "Access to companies or labs",
    "Supportive peer community",
]
CONTENT = [
    "Beginner-friendly introductions to frontier technologies",
    "Career pathways in deep tech industries",
    "Real case studies from startups and companies",
    "How deep tech is used in the real world",
    "Hands-on prototyping",
    "Research opportunities",
    "Startup idea development",
    "How to build a portfolio",
    "How to get internships or industry exposure",
    "How to pitch and communicate ideas",
    "How to use AI tools effectively",
]
SKILLS = [
    "Problem-solving",
    "Networking and follow-up",
    "Pitching ideas",
    "Public speaking",
    "Working in teams",
    "Building prototypes",
    "Using AI tools",
    "Applying for internships",
    "Applying for research grants",
    "Understanding business models",
    "Turning ideas into action",
]
ACTIVITIES = [
    "Company visits",
    "Lab visits",
    "Hands-on workshops",
    "Networking with peers",
    "Meeting industry practitioners",
    "Mentorship sessions",
    "Team project work",
    "Demo day or final presentation",
    "Hackathon-style challenge",
    "Short videos explaining concepts",
    "AI tutor or chatbot support",
    "Personalised learning roadmap",
    "Online project feedback",
    "Community chat or peer group",
    "Recorded sessions I can watch later",
]
ENGAGEMENT = [
    "Learning from real industry practitioners",
    "Working on real company challenges",
    "Building something practical",
    "Getting mentor feedback",
    "Meeting ambitious peers",
    "Clear career or research pathways",
    "Internship, job, or research opportunities",
    "Fun and interactive sessions",
    "Access to companies, labs, or founders",
    "Recognition, certificate, or portfolio evidence",
]
BORING = [
    "Too many lectures",
    "Too much theory",
    "Too technical too quickly",
    "No clear career benefit",
    "No real-world projects",
    "No industry access",
    "Too expensive",
    "Too much time commitment",
    "Not beginner-friendly",
    "No certificate, portfolio, or visible outcome",
]
HESITATION = [
    "The programme is too expensive",
    "The time commitment is too high",
    "The location is inconvenient",
    "I am worried the content will be too basic",
    "I am worried the content will be too difficult",
    "I do not know if it will help my career",
    "I do not have enough background",
    "I prefer fully online learning",
    "I would only join if there are clear internship, job, research, or startup opportunities",
    "I am not confident enough to join",
]
MULTI = {
    "tech_interest": TECH,
    "learning_source": SOURCES,
    "education_gap": GAPS,
    "want_to_learn": CONTENT,
    "transferable_skills": SKILLS,
    "learning_activities": ACTIVITIES,
    "engagement_drivers": ENGAGEMENT,
    "boring_factors": BORING,
    "joining_hesitation": HESITATION,
}


def pct(count: float, base: int = n) -> float:
    return round((count / base) * 100, 1) if base else 0.0


def contains(series: pd.Series, option: str) -> pd.Series:
    return series.fillna("").astype(str).str.contains(re.escape(option), case=False, na=False)


def count_option(column: str, option: str) -> int:
    if column in MULTI:
        return int(contains(df[column], option).sum())
    return int((df[column] == option).sum())


def percent_option(column: str, option: str) -> float:
    return pct(count_option(column, option))


def single_counts(column: str) -> pd.DataFrame:
    vc = df[column].replace("", "No response").value_counts()
    return pd.DataFrame({"option": vc.index, "count": vc.values, "percent": [pct(x) for x in vc.values]})


def multi_counts(column: str, options: list[str]) -> pd.DataFrame:
    rows = []
    for opt in options:
        c = count_option(column, opt)
        rows.append({"option": opt, "count": c, "percent": pct(c)})
    return pd.DataFrame(rows).sort_values(["count", "option"], ascending=[False, True]).reset_index(drop=True)


def all_tables() -> dict[str, pd.DataFrame]:
    tables = {
        "age_groups": single_counts("age_group"),
        "current_stage": single_counts("current_stage"),
        "field": single_counts("field"),
        "biggest_barrier": single_counts("biggest_barrier"),
        "learning_level": single_counts("learning_level"),
        "desired_outcome": single_counts("desired_outcome"),
        "preferred_format": single_counts("preferred_format"),
        "programme_length": single_counts("programme_length"),
        "launchpad_appeal": single_counts("launchpad_appeal"),
        "access_model": single_counts("access_model"),
        "willingness_to_pay": single_counts("willingness_to_pay"),
    }
    for col, opts in MULTI.items():
        tables[col] = multi_counts(col, opts)
    return tables


def metrics() -> dict[str, float]:
    appeal = pd.to_numeric(df["launchpad_appeal"].str.extract(r"(\d+)")[0], errors="coerce")
    self_learn = (
        contains(df["learning_source"], "YouTube")
        | contains(df["learning_source"], "Google search")
        | contains(df["learning_source"], "ChatGPT / AI tools")
    ).sum()
    hybrid = df["preferred_format"].isin(
        ["Hybrid: online learning plus in-person sessions", "Fully in-person", "Mostly in-person with some online support"]
    ).sum()
    partner_funded = df["access_model"].isin(
        [
            "Free for learners, funded by companies or sponsors",
            "Paid by universities or schools",
            "Low-cost for learners, partly funded by partners",
            "Paid by companies looking for young talent",
            "A mix of learners, companies, universities, and sponsors",
            "Paid by government or foundations",
        ]
    ).sum()
    return {
        "age_18_24": pct(df["age_group"].isin(["18-20", "21-24"]).sum()),
        "university": percent_option("current_stage", "University student"),
        "self_learning": pct(self_learn),
        "mentor_start": percent_option("learning_source", "Industry professionals or mentors"),
        "industry_gap": percent_option("education_gap", "Real industry exposure"),
        "hands_on_content": percent_option("want_to_learn", "Hands-on prototyping"),
        "hybrid": pct(hybrid),
        "appeal_high": pct((appeal >= 4).sum()),
        "appeal_avg": round(float(appeal.mean()), 2),
        "cost_hesitation": percent_option("joining_hesitation", "The programme is too expensive"),
        "partner_funded": pct(partner_funded),
    }


def opportunity_scores(m: dict[str, float]) -> pd.DataFrame:
    rows = [
        (
            "Industry challenge sprint",
            np.mean(
                [
                    percent_option("education_gap", "Real industry exposure"),
                    percent_option("engagement_drivers", "Working on real company challenges"),
                    percent_option("engagement_drivers", "Learning from real industry practitioners"),
                    percent_option("learning_activities", "Meeting industry practitioners"),
                ]
            ),
            "Anchor each cohort around one real partner challenge.",
        ),
        (
            "Build-to-portfolio prototype",
            np.mean(
                [
                    percent_option("want_to_learn", "Hands-on prototyping"),
                    percent_option("education_gap", "Hands-on projects"),
                    percent_option("desired_outcome", "A portfolio project") + percent_option("desired_outcome", "A completed prototype"),
                    percent_option("engagement_drivers", "Building something practical"),
                ]
            ),
            "End with a visible artifact, demo, or prototype.",
        ),
        (
            "Career and opportunity bridge",
            np.mean(
                [
                    percent_option("desired_outcome", "Internship or job opportunity"),
                    percent_option("education_gap", "Career guidance"),
                    percent_option("education_gap", "Networking opportunities"),
                    percent_option("want_to_learn", "How to get internships or industry exposure"),
                ]
            ),
            "Include pathways, warm intros, and partner-facing demo day.",
        ),
        (
            "Beginner-friendly frontier on-ramp",
            np.mean(
                [
                    percent_option("learning_level", "Beginner: explain the basics clearly"),
                    percent_option("want_to_learn", "Beginner-friendly introductions to frontier technologies"),
                    percent_option("boring_factors", "Too technical too quickly"),
                    percent_option("joining_hesitation", "I do not have enough background"),
                ]
            ),
            "Start with clear foundations before specialization.",
        ),
        (
            "Ecosystem-funded access model",
            np.mean(
                [
                    m["partner_funded"],
                    percent_option("joining_hesitation", "The programme is too expensive"),
                    percent_option("boring_factors", "Too expensive"),
                    100 - percent_option("willingness_to_pay", "A higher amount if there is clear internship, research, or startup access"),
                ]
            ),
            "Make partners the main paying customer, not students.",
        ),
    ]
    out = pd.DataFrame(rows, columns=["module", "score", "design_move"])
    out["score"] = out["score"].round(1)
    return out.sort_values("score", ascending=False).reset_index(drop=True)


def draw_cards(m: dict[str, float], opp: pd.DataFrame) -> Path:
    w, h = 1800, 1120
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    add_logo(img, w - 145, 58, 92)
    d.text((70, 70), "Reactor Academy survey: decision dashboard", font=F["title"], fill=COL["white"])
    draw_wrapped(
        d,
        (72, 132),
        "The data supports a short, hybrid, industry-connected launchpad rather than another passive online course.",
        F["subtitle"],
        COL["muted"],
        92,
    )
    d.line((70, 198, 1390, 198), fill=COL["gold"], width=3)

    card_data = [
        (str(n), "valid learner responses", "Enough signal to shape an early pilot.", "gold"),
        (f"{m['age_18_24']:.1f}%", "aged 18-24", "University-aged learners are the clearest first market.", "gold"),
        (f"{m['university']:.1f}%", "university students", "Campus partnerships should be a core distribution channel.", "gold"),
        (f"{m['self_learning']:.1f}%", "start with YouTube, Google, or AI", "Information is accessible, but guidance is fragmented.", "gold"),
        (f"{m['industry_gap']:.1f}%", "lack real industry exposure", "Industry access is the sharpest unmet need.", "gold"),
        (f"{m['appeal_high']:.1f}%", "rate Launchpad 4 or 5", "Strong validation for the challenge-sprint concept.", "gold"),
    ]
    coords = [(70, 255), (640, 255), (1210, 255), (70, 510), (640, 510), (1210, 510)]
    cw, ch = 500, 190
    for (x, y), (big, label, note, c) in zip(coords, card_data):
        d.rounded_rectangle((x, y, x + cw, y + ch), radius=22, fill=COL["panel"], outline="#393939", width=2)
        d.text((x + 36, y + 28), big, font=F["metric"], fill=COL[c])
        d.text((x + 38, y + 98), label, font=F["body_bold"], fill=COL["white"])
        draw_wrapped(d, (x + 38, y + 130), note, F["small"], COL["muted"], 38)

    d.text((72, 760), "What Reactor Frontier Launchpad should prioritize first", font=F["h2"], fill=COL["white"])
    top = opp.head(5).sort_values("score", ascending=True).reset_index(drop=True)
    max_score = 100
    chart_x, chart_y, chart_w = 520, 815, 1050
    value_x = chart_x + chart_w + 52
    for i, row in top.iterrows():
        y = chart_y + i * 42
        d.text((74, y - 5), row["module"], font=F["small_bold"], fill=COL["white"])
        d.rounded_rectangle((chart_x, y, chart_x + chart_w, y + 22), radius=10, fill="#343434")
        bw = int(chart_w * row["score"] / max_score)
        d.rounded_rectangle((chart_x, y, chart_x + bw, y + 22), radius=10, fill=COL["gold"])
        draw_right(d, (value_x, y - 3), f"{row['score']:.0f}", F["small_bold"], COL["white"])

    source_note(d, w, h, True)
    return save(img, "00_executive_dashboard.png")


def draw_bar(table: pd.DataFrame, title: str, subtitle: str, filename: str, top_n: int, colour: str = "gold") -> Path:
    data = table[table["count"] > 0].head(top_n).sort_values("percent", ascending=True).reset_index(drop=True)
    w, h = 1600, max(720, 230 + len(data) * 74)
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    d.text((70, 54), title, font=F["h2"], fill=COL["white"])
    draw_wrapped(d, (72, 96), subtitle, F["body"], COL["muted"], 100)
    d.line((70, 145, 620, 145), fill=COL["gold"], width=2)
    x0, y0, bar_w, row_h = 620, 180, 760, 58
    value_x = x0 + bar_w + 96
    maxp = max(float(data["percent"].max()), 1)
    for i, row in data.iterrows():
        y = y0 + i * row_h
        draw_wrapped(d, (70, y - 3), row["option"], F["small_bold"], COL["white"], 48)
        d.rounded_rectangle((x0, y, x0 + bar_w, y + 24), radius=12, fill="#343434")
        bw = int(bar_w * row["percent"] / maxp)
        d.rounded_rectangle((x0, y, x0 + bw, y + 24), radius=12, fill=COL["gold"])
        draw_right(d, (value_x, y - 2), f"{row['percent']:.1f}% ({int(row['count'])})", F["small_bold"], COL["white"])
    source_note(d, w, h, True)
    return save(img, filename)


def draw_opportunity(opp: pd.DataFrame) -> Path:
    w, h = 1600, 850
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    add_logo(img, w - 140, 54, 88)
    d.text((70, 64), "Strategic opportunity scores", font=F["title"], fill=COL["white"])
    draw_wrapped(
        d,
        (72, 128),
        "A high-level view of what Reactor Frontier Launchpad should build first, based on learner need, demand, and adoption risk.",
        F["body"],
        COL["muted"],
        110,
    )
    data = opp.sort_values("score", ascending=True).reset_index(drop=True)
    d.line((72, 185, 760, 185), fill=COL["gold"], width=2)
    x0, y0, bw, rh = 600, 245, 780, 92
    value_x = x0 + bw + 76
    for i, row in data.iterrows():
        y = y0 + i * rh
        d.text((74, y - 4), row["module"], font=F["h3"], fill=COL["white"])
        draw_wrapped(d, (76, y + 32), row["design_move"], F["small"], COL["muted"], 48)
        d.rounded_rectangle((x0, y + 8, x0 + bw, y + 38), radius=15, fill="#363636")
        fill_w = int(bw * row["score"] / 100)
        d.rounded_rectangle((x0, y + 8, x0 + fill_w, y + 38), radius=15, fill=COL["gold"])
        draw_right(d, (value_x, y + 6), f"{row['score']:.1f}", F["body_bold"], COL["white"])
    source_note(d, w, h, True)
    return save(img, "01_opportunity_scores.png")


def draw_heatmap() -> tuple[Path, pd.DataFrame]:
    fields = single_counts("field").head(6)["option"].tolist()
    cols = ["Real industry exposure", "Hands-on projects", "Career guidance", "Mentorship", "Networking opportunities", "Access to companies or labs"]
    matrix = []
    for field in fields:
        subset = df[df["field"] == field]
        matrix.append([pct(contains(subset["education_gap"], c).sum(), len(subset)) for c in cols])
    heat = pd.DataFrame(matrix, index=fields, columns=cols)

    w, h = 1650, 860
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    d.text((70, 58), "Where learning gaps are strongest by field", font=F["h2"], fill=COL["white"])
    draw_wrapped(d, (72, 102), "Cell values show the share of respondents in each field selecting that gap.", F["body"], COL["muted"], 95)
    d.line((70, 145, 650, 145), fill=COL["gold"], width=2)
    x0, y0, cell_w, cell_h = 430, 205, 178, 82
    for j, c in enumerate(cols):
        draw_wrapped(d, (x0 + j * cell_w + 8, 155), c, F["small_bold"], COL["white"], 18, 4, "left")
    maxv = max(70, float(heat.values.max()))
    for i, field in enumerate(fields):
        y = y0 + i * cell_h
        draw_wrapped(d, (70, y + 19), field, F["small_bold"], COL["white"], 31)
        for j, c in enumerate(cols):
            val = heat.iloc[i, j]
            t = val / maxv
            base = np.array(rgb("#343434"))
            high = np.array(rgb(COL["gold"]))
            color = tuple(np.round(base * (1 - t) + high * t).astype(int))
            x = x0 + j * cell_w
            d.rounded_rectangle((x, y, x + cell_w - 10, y + cell_h - 12), radius=14, fill=color, outline="#4A4A4A", width=1)
            label = f"{val:.0f}%"
            tw, th = text_size(d, label, F["body_bold"])
            label_fill = COL["black"] if t > 0.45 else COL["white"]
            d.text((x + (cell_w - 10 - tw) // 2, y + (cell_h - 12 - th) // 2), label, font=F["body_bold"], fill=label_fill)
    source_note(d, w, h, True)
    return save(img, "02_gap_heatmap_by_field.png"), heat.reset_index().rename(columns={"index": "field"})


def draw_validation() -> Path:
    appeal = pd.to_numeric(df["launchpad_appeal"].str.extract(r"(\d+)")[0], errors="coerce")
    counts = appeal.value_counts().reindex([1, 2, 3, 4, 5], fill_value=0)
    perc = counts / counts.sum() * 100
    w, h = 1500, 650
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    d.text((70, 64), "Launchpad concept validation", font=F["title"], fill=COL["white"])
    d.text((72, 130), f"Average appeal score: {appeal.mean():.2f} / 5. High appeal ratings 4-5: {pct((appeal >= 4).sum()):.1f}%.", font=F["body"], fill=COL["muted"])
    d.line((72, 185, 620, 185), fill=COL["gold"], width=2)
    x, y, total_w, bh = 120, 270, 1240, 86
    colours = ["#353535", "#4A4A4A", "#76551E", COL["gold"], COL["gold"]]
    left = x
    for rating, value, colour in zip([1, 2, 3, 4, 5], perc.values, colours):
        seg_w = int(total_w * value / 100)
        d.rounded_rectangle((left, y, left + seg_w, y + bh), radius=24, fill=colour)
        if value >= 4:
            label = f"{rating}: {value:.0f}%"
            tw, th = text_size(d, label, F["body_bold"])
            d.text((left + max(8, (seg_w - tw) // 2), y + (bh - th) // 2), label, font=F["body_bold"], fill=COL["black"] if rating >= 3 else COL["white"])
        left += seg_w
    draw_wrapped(d, (122, 420), "Interpretation: the sprint is validated, but execution matters. Keep it outcome-led, affordable, and visibly connected to real opportunities.", F["h3"], COL["white"], 95)
    source_note(d, w, h, True)
    return save(img, "03_launchpad_validation.png")


def draw_business(tables: dict[str, pd.DataFrame]) -> Path:
    w, h = 1750, 900
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    d.text((70, 56), "Business model evidence", font=F["h2"], fill=COL["white"])
    draw_wrapped(d, (72, 98), "Subsidise learners and sell ecosystem value to companies, universities, sponsors, and partners.", F["body"], COL["muted"], 100)
    d.line((70, 145, 620, 145), fill=COL["gold"], width=2)
    panels = [
        ("Preferred funding route", tables["access_model"].head(5), "gold"),
        ("Personal willingness to pay", tables["willingness_to_pay"].head(5), "orange"),
        ("Main adoption risks", tables["joining_hesitation"].head(5), "coral"),
    ]
    pxs = [70, 610, 1150]
    for px, (title, table, colour) in zip(pxs, panels):
        d.rounded_rectangle((px, 170, px + 500, 785), radius=22, fill=COL["panel"], outline="#333333", width=2)
        d.text((px + 30, 205), title, font=F["h3"], fill=COL["white"])
        y = 270
        maxp = max(float(table["percent"].max()), 1)
        value_x = px + 435
        for _, row in table.iterrows():
            draw_wrapped(d, (px + 30, y), row["option"], F["small_bold"], COL["white"], 38)
            by = y + 46
            d.rounded_rectangle((px + 30, by, px + 355, by + 18), radius=9, fill="#343434")
            d.rounded_rectangle((px + 30, by, px + 30 + int(325 * row["percent"] / maxp), by + 18), radius=9, fill=COL["gold"])
            draw_right(d, (value_x, by - 5), f"{row['percent']:.0f}%", F["small_bold"], COL["white"])
            y += 92
    source_note(d, w, h, True)
    return save(img, "04_business_model_evidence.png")


def draw_blueprint(m: dict[str, float]) -> Path:
    w, h = 1780, 900
    img = Image.new("RGBA", (w, h), rgb(COL["coal"]) + (255,))
    d = ImageDraw.Draw(img)
    add_star_field(d, w, h)
    add_logo(img, w - 145, 58, 92)
    d.text((70, 70), "Recommended Launchpad experience blueprint", font=F["title"], fill=COL["white"])
    d.text((72, 133), "Move learners from curiosity to clarity to action through an applied, partner-backed sprint.", font=F["body"], fill=COL["muted"])
    stages = [
        ("1. Orient", "Frontier tech map and pathway choice", "gold"),
        ("2. Expose", "Practitioners, company visits, case studies", "teal"),
        ("3. Build", "Team challenge sprint and prototype", "green"),
        ("4. Validate", "Mentor feedback, pitch practice, demo day", "orange"),
        ("5. Convert", "Portfolio, internship, research, venture path", "coral"),
    ]
    x0, y0, gap, bw, bh = 70, 285, 26, 310, 185
    for i, (title, body, colour) in enumerate(stages):
        x = x0 + i * (bw + gap)
        d.rounded_rectangle((x, y0, x + bw, y0 + bh), radius=24, fill=COL["panel"], outline=COL["gold"], width=2)
        step_no, step_label = title.split(". ", 1)
        d.ellipse((x + 30, y0 + 28, x + 70, y0 + 68), fill=COL["gold"])
        draw_center(d, (x + 50, y0 + 36), step_no, F["small_bold"], COL["black"])
        d.text((x + 84, y0 + 34), step_label, font=F["h3"], fill=COL["gold"])
        draw_wrapped(d, (x + 30, y0 + 83), body, F["body"], COL["white"], 25)
        if i < len(stages) - 1:
            d.line((x + bw + 4, y0 + bh // 2, x + bw + gap - 6, y0 + bh // 2), fill=COL["gold"], width=4)
    evidence = [
        (f"{m['self_learning']:.0f}%", "already self-learn online", "gold"),
        (f"{m['industry_gap']:.0f}%", "lack industry exposure", "gold"),
        (f"{m['hands_on_content']:.0f}%", "want prototyping", "gold"),
        (f"{m['hybrid']:.0f}%", "prefer hybrid/in-person-heavy", "gold"),
        (f"{m['appeal_high']:.0f}%", "rate Launchpad 4 or 5", "gold"),
    ]
    metric_centres = [180, 510, 840, 1170, 1500]
    for x, (big, label, colour) in zip(metric_centres, evidence):
        draw_center(d, (x, 590), big, F["metric"], COL[colour])
        lines = wrap(label, 23)
        line_h = text_size(d, "Ag", F["body"])[1] + 6
        for idx, line in enumerate(lines):
            draw_center(d, (x, 660 + idx * line_h), line, F["body"], COL["white"])
    d.text((70, 790), "Design rule:", font=F["h3"], fill=COL["gold"])
    d.text((235, 792), "Every week should produce evidence of action: a decision, artifact, mentor feedback, or pathway connection.", font=F["body"], fill=COL["white"])
    source_note(d, w, h, True)
    return save(img, "05_launchpad_blueprint.png")


def export_tables(tables: dict[str, pd.DataFrame], opp: pd.DataFrame, heat: pd.DataFrame) -> None:
    for name, table in tables.items():
        table.to_csv(TABLE_DIR / f"{name}.csv", index=False)
    opp.to_csv(TABLE_DIR / "opportunity_scores.csv", index=False)
    heat.to_csv(TABLE_DIR / "gap_heatmap_by_field.csv", index=False)
    df.to_csv(TABLE_DIR / "cleaned_survey_data.csv", index=False)
    print(f"Saved tables: {TABLE_DIR}")


def md_table(table: pd.DataFrame) -> str:
    rows = ["| Option | Count | Percent |", "|---|---:|---:|"]
    for _, row in table.iterrows():
        rows.append(f"| {row['option']} | {int(row['count'])} | {row['percent']:.1f}% |")
    return "\n".join(rows)


def write_report(m: dict[str, float], opp: pd.DataFrame, tables: dict[str, pd.DataFrame]) -> Path:
    lines = [
        "# Reactor Academy Survey Analysis",
        "",
        f"Total usable responses: **{n}**.",
        "",
        "## Core Finding",
        "The survey supports Reactor Frontier Launchpad as a short, hybrid, practitioner-led sprint. Learners already know how to find information online, but they lack structured guidance, real industry access, hands-on work, and visible next steps.",
        "",
        "## Key Numbers",
        f"- {m['age_18_24']:.1f}% are aged 18-24.",
        f"- {m['university']:.1f}% are university students.",
        f"- {m['self_learning']:.1f}% start with YouTube, Google, or AI tools.",
        f"- Only {m['mentor_start']:.1f}% start with industry professionals or mentors.",
        f"- {m['industry_gap']:.1f}% say their current environment lacks real industry exposure.",
        f"- {m['hybrid']:.1f}% prefer hybrid or in-person-heavy learning.",
        f"- {m['appeal_high']:.1f}% rate Reactor Frontier Launchpad 4 or 5 out of 5.",
        f"- Average Launchpad appeal score: {m['appeal_avg']:.2f} / 5.",
        f"- {m['cost_hesitation']:.1f}% say cost could stop them from joining.",
        "",
        "## Strongest Design Priorities",
    ]
    for _, row in opp.iterrows():
        lines.append(f"- **{row['module']}** ({row['score']:.1f}/100): {row['design_move']}")
    lines += [
        "",
        "## Learning Sources",
        md_table(tables["learning_source"].head(5)),
        "",
        "## Current Learning Gaps",
        md_table(tables["education_gap"].head(5)),
        "",
        "## Recommendation",
        "Position Reactor Academy as an action bridge between learners and frontier industries. The launchpad should be partner-funded or heavily subsidised, built around real challenges, and designed to end with a portfolio artifact plus pathways into internships, research, startup ideas, or Reactor Ventures.",
    ]
    path = OUT_DIR / "reactor_academy_survey_insights.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Saved report: {path}")
    return path


def main() -> None:
    print(f"Loaded {n} responses from {CSV_PATH}")
    tables = all_tables()
    m = metrics()
    opp = opportunity_scores(m)
    draw_cards(m, opp)
    draw_opportunity(opp)
    _, heat = draw_heatmap()
    draw_validation()
    draw_business(tables)
    draw_blueprint(m)
    draw_bar(tables["learning_source"], "Learners already self-learn online", "The opportunity is not more content; it is structure, context, and access.", "06_learning_sources.png", 8, "gold")
    draw_bar(tables["education_gap"], "Current learning gaps", "The clearest evidence for a company-connected, project-based model.", "07_learning_gaps.png", 8, "orange")
    draw_bar(tables["want_to_learn"], "Content learners want", "Practical, accessible content should shape the curriculum.", "08_content_demand.png", 9, "green")
    draw_bar(tables["learning_activities"], "Activity preferences", "Workshops, practitioners, team work, visits, and mentorship beat passive formats.", "09_activity_preferences.png", 10, "teal")
    draw_bar(tables["boring_factors"], "Programme risks to avoid", "Too much theory, lectures, unclear career value, and price friction are the big risks.", "10_programme_risks.png", 9, "amber")
    export_tables(tables, opp, heat)
    write_report(m, opp, tables)
    print("\nHeadline metrics")
    print(f"Launchpad 4-5 appeal: {m['appeal_high']:.1f}%")
    print(f"Hybrid/in-person-heavy preference: {m['hybrid']:.1f}%")
    print(f"Self-learning via YouTube, Google, or AI: {m['self_learning']:.1f}%")
    print(f"Real industry exposure gap: {m['industry_gap']:.1f}%")
    print(f"Images saved in: {IMG_DIR}")


if __name__ == "__main__":
    main()
