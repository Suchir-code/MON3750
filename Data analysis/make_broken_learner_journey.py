from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


BASE = Path(__file__).resolve().parent
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
    "danger": "#EF4444",
}


def font(size, bold=False, italic=False):
    candidates = [
        r"C:\Windows\Fonts\arialbi.ttf" if bold and italic else None,
        r"C:\Windows\Fonts\arialbd.ttf" if bold else None,
        r"C:\Windows\Fonts\ariali.ttf" if italic else None,
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for c in candidates:
        if c and Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


F = {
    "title": font(38, True),
    "stage": font(15, True),
    "h": font(20, True),
    "body": font(16),
    "body_bold": font(16, True),
    "small": font(13),
    "small_bold": font(13, True),
    "tiny": font(11),
    "italic": font(13, italic=True),
}


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_center(draw, x, y, text, fnt, fill):
    tw, _ = text_size(draw, text, fnt)
    draw.text((x - tw // 2, y), text, font=fnt, fill=fill)


def wrap(text, width):
    return textwrap.wrap(str(text), width=width, break_long_words=False) or [""]


def draw_wrapped(draw, x, y, text, fnt, fill, width, gap=3, center=False):
    lh = text_size(draw, "Ag", fnt)[1] + gap
    for line in wrap(text, width):
        if center:
            draw_center(draw, x, y, line, fnt, fill)
        else:
            draw.text((x, y), line, font=fnt, fill=fill)
        y += lh
    return y


def round_box(draw, box, fill, outline=COL["line"], radius=14, width=2):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def youtube_icon(draw, x, y):
    draw.rounded_rectangle((x, y, x + 54, y + 38), radius=10, fill="#FF0000")
    draw.polygon([(x + 22, y + 10), (x + 22, y + 28), (x + 38, y + 19)], fill="white")


def ai_icon(draw, x, y):
    draw.rounded_rectangle((x, y, x + 42, y + 42), radius=10, fill="#10B981")
    draw_center(draw, x + 21, y + 10, "AI", F["body_bold"], "white")


def laptop_icon(draw, x, y):
    draw.rounded_rectangle((x, y, x + 82, y + 48), radius=5, fill="#E9EEF8", outline="#32364F", width=3)
    draw.line((x + 14, y + 25, x + 48, y + 25), fill="#9BA3B7", width=3)
    draw.ellipse((x + 58, y + 16, x + 75, y + 33), outline="#32364F", width=3)
    draw.line((x + 71, y + 29, x + 82, y + 40), fill="#32364F", width=3)
    draw.polygon([(x - 10, y + 56), (x + 92, y + 56), (x + 75, y + 48), (x + 8, y + 48)], fill="#32364F")


def books_icon(draw, x, y):
    draw.polygon([(x + 40, y), (x + 82, y + 20), (x + 40, y + 40), (x - 2, y + 20)], fill="#28304E")
    draw.rectangle((x + 12, y + 46, x + 72, y + 58), fill="#FFCF66")
    draw.rectangle((x + 8, y + 58, x + 76, y + 70), fill="#5BB7E5")
    draw.rectangle((x + 16, y + 70, x + 68, y + 82), fill="#EF4444")


def briefcase_icon(draw, x, y):
    draw.rounded_rectangle((x, y + 15, x + 72, y + 68), radius=8, fill="#2D3350")
    draw.rectangle((x + 24, y, x + 48, y + 18), outline="#2D3350", width=5)
    draw.rectangle((x + 32, y + 37, x + 42, y + 46), fill="#FFFFFF")


def blocked_mark(draw, x, y):
    draw.ellipse((x, y, x + 42, y + 42), outline=COL["danger"], width=4)
    draw.line((x + 9, y + 9, x + 33, y + 33), fill=COL["danger"], width=4)


def face_icon(draw, cx, cy, mood="happy", size=42):
    r = size // 2
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill="#FFD24D", outline="#F5A623", width=2)
    draw.ellipse((cx - 9, cy - 5, cx - 5, cy - 1), fill=COL["navy"])
    draw.ellipse((cx + 5, cy - 5, cx + 9, cy - 1), fill=COL["navy"])
    if mood == "happy":
        draw.arc((cx - 12, cy - 2, cx + 12, cy + 16), 0, 180, fill=COL["navy"], width=2)
    elif mood == "sad":
        draw.arc((cx - 12, cy + 7, cx + 12, cy + 25), 180, 360, fill=COL["navy"], width=2)
    else:
        draw.line((cx - 10, cy + 10, cx + 10, cy + 10), fill=COL["navy"], width=2)


def chart_icon(draw, x, y):
    draw.line((x, y + 54, x + 58, y + 54), fill=COL["green"], width=4)
    for i, h in enumerate([20, 34, 48]):
        draw.rectangle((x + 8 + i * 17, y + 54 - h, x + 18 + i * 17, y + 54), fill=COL["green"])
    draw.line((x + 5, y + 40, x + 24, y + 28, x + 37, y + 20, x + 54, y + 4), fill=COL["green"], width=4)
    draw.polygon([(x + 54, y + 4), (x + 48, y + 6), (x + 52, y + 12)], fill=COL["green"])


def rocket_icon(draw, x, y):
    draw.ellipse((x + 18, y + 8, x + 54, y + 44), fill=COL["blue"])
    draw.polygon([(x + 36, y), (x + 54, y + 26), (x + 36, y + 18)], fill=COL["blue"])
    draw.polygon([(x + 20, y + 38), (x + 2, y + 58), (x + 30, y + 48)], fill=COL["blue"])
    draw.polygon([(x + 48, y + 34), (x + 62, y + 55), (x + 40, y + 46)], fill=COL["blue"])
    draw.ellipse((x + 31, y + 20, x + 42, y + 31), fill="white")


def bulb_icon(draw, x, y):
    draw.ellipse((x + 10, y, x + 48, y + 38), outline=COL["yellow"], width=3)
    draw.rectangle((x + 22, y + 36, x + 36, y + 51), outline=COL["yellow"], width=3)
    draw.line((x + 20, y + 55, x + 38, y + 55), fill=COL["yellow"], width=3)
    for dx, dy in [(-8, 9), (0, -8), (42, 9)]:
        draw.line((x + 28, y + 18, x + 28 + dx, y + 18 + dy), fill=COL["yellow"], width=2)


def avatar(draw, cx, cy, name, subtitle, note, female=True):
    draw.ellipse((cx - 50, cy - 50, cx + 50, cy + 50), fill="#EFE7FF", outline="#D6C7FF", width=2)
    skin = "#F3B37C"
    hair = "#171727"
    if female:
        draw.ellipse((cx - 32, cy - 37, cx + 32, cy + 25), fill=hair)
        draw.ellipse((cx - 24, cy - 26, cx + 24, cy + 28), fill=skin)
        draw.polygon([(cx - 38, cy + 46), (cx + 38, cy + 46), (cx, cy + 12)], fill=COL["purple"])
    else:
        draw.ellipse((cx - 30, cy - 34, cx + 30, cy + 16), fill=hair)
        draw.ellipse((cx - 25, cy - 21, cx + 25, cy + 28), fill=skin)
        draw.polygon([(cx - 38, cy + 46), (cx + 38, cy + 46), (cx, cy + 14)], fill="#4F46E5")
    draw.ellipse((cx - 11, cy - 4, cx - 6, cy + 1), fill=COL["navy"])
    draw.ellipse((cx + 7, cy - 4, cx + 12, cy + 1), fill=COL["navy"])
    draw.arc((cx - 10, cy + 6, cx + 10, cy + 18), 0, 180, fill=COL["navy"], width=2)
    draw_center(draw, cx, cy + 62, name, F["h"], COL["purple"])
    draw_wrapped(draw, cx, cy + 92, subtitle, F["small_bold"], COL["text"], 23, center=True)
    draw_wrapped(draw, cx, cy + 130, note, F["small"], COL["text"], 24, center=True)


def make_slide():
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    x = 22
    d.text((x, 16), "The ", font=F["title"], fill=COL["navy"])
    x += text_size(d, "The ", F["title"])[0]
    d.text((x, 16), "Broken Learner Journey", font=F["title"], fill=COL["pink"])
    x += text_size(d, "Broken Learner Journey", F["title"])[0]
    d.text((x, 16), ": From Curiosity to a Dead End", font=F["title"], fill=COL["navy"])

    # Main containers
    px, py, pw, ph = 8, 92, 195, 660
    round_box(d, (px, py, px + pw, py + ph), "white")
    d.rounded_rectangle((px, py, px + pw, py + 44), radius=12, fill=COL["purple"])
    d.rectangle((px, py + 24, px + pw, py + 44), fill=COL["purple"])
    draw_center(d, px + pw // 2, py + 13, "The Personas", F["stage"], "white")
    avatar(d, px + 98, py + 175, "Aisha (21)", 'The "Uncertain Explorer"', "Wants clear pathways but feels overwhelmed.", True)
    d.line((px + 18, py + 380, px + pw - 18, py + 380), fill="#E6E0F7", width=1)
    avatar(d, px + 98, py + 485, "Marcus (22)", 'The "Frustrated Builder"', "Wants real industry problems, not just theory.", False)

    jx, jy, jw, jh = 210, 92, 925, 660
    round_box(d, (jx, jy, jx + jw, jy + jh), "#FFFFFF")
    stage_w = jw // 4
    stages = [
        ("1. EXPLORATION", COL["purple"], COL["purple_light"], "happy"),
        ("2. STRUCTURED\nLEARNING ATTEMPT", COL["pink"], COL["pink_light"], "neutral"),
        ("3. THE REALITY CHECK\n(THE FRUSTRATION)", COL["yellow"], COL["yellow_light"], "sad"),
        ("4. SEEKING OPPORTUNITIES\n(THE WALL)", COL["purple"], "#F7F4FF", "sad"),
    ]
    for i, (label, colour, fill, mood) in enumerate(stages):
        sx = jx + i * stage_w
        d.polygon([(sx, jy), (sx + stage_w - 20, jy), (sx + stage_w, jy + 35), (sx + stage_w - 20, jy + 70), (sx, jy + 70)], fill=fill, outline=COL["line"])
        for k, line in enumerate(label.split("\n")):
            draw_center(d, sx + stage_w // 2, jy + 18 + k * 18, line, F["stage"], colour)
        face_icon(d, sx + stage_w // 2, jy + 92, mood, 42)

    # timeline
    line_y = jy + 130
    d.line((jx, line_y, jx + jw, line_y), fill=COL["purple"], width=3)
    for i, (_, colour, _, _) in enumerate(stages):
        cx = jx + i * stage_w + stage_w // 2
        d.ellipse((cx - 9, line_y - 9, cx + 9, line_y + 9), fill="#D9C7FF", outline=colour, width=2)
    d.line((jx, jy + 412, jx + jw, jy + 412), fill="#E6E0F7", width=1)
    for i in range(1, 4):
        xline = jx + i * stage_w
        d.line((xline, jy + 70, xline, jy + jh - 20), fill="#E6E0F7", width=1)

    rows = [(jy + 170, "Aisha's Roadblock:", "Information is too fragmented. Suffers from not knowing which pathway suits her.", "(Top barrier for 22% of surveyed learners)"),
            (jy + 430, "Marcus's Roadblock:", "University projects feel artificial. Lacks real industry exposure.", "(Top missing element for 47.7% of surveyed learners)")]
    for row_y, road_title, road_body, road_note in rows:
        youtube_icon(d, jx + 50, row_y)
        ai_icon(d, jx + 128, row_y - 2)
        draw_wrapped(d, jx + 36, row_y + 56, "Learns about new tech primarily through YouTube and ChatGPT.", F["small_bold"], COL["text"], 25, center=False)
        d.rounded_rectangle((jx + 20, row_y + 150, jx + 210, row_y + 184), radius=14, fill=COL["purple_light"])
        d.text((jx + 38, row_y + 158), "Feeling: Curious", font=F["small_bold"], fill=COL["purple"])

        if row_y < jy + 300:
            laptop_icon(d, jx + stage_w + 58, row_y + 10)
            draw_wrapped(d, jx + stage_w + 38, row_y + 96, "Searches for career paths online and explores learning resources.", F["small_bold"], COL["text"], 26)
        else:
            books_icon(d, jx + stage_w + 70, row_y + 12)
            draw_wrapped(d, jx + stage_w + 38, row_y + 96, "Takes university tech courses to build his skills.", F["small_bold"], COL["text"], 26)

        d.text((jx + 2 * stage_w + 28, row_y + 10), road_title, font=F["body_bold"], fill=COL["pink"])
        draw_wrapped(d, jx + 2 * stage_w + 28, row_y + 38, road_body, F["body_bold"], COL["text"], 26)
        draw_wrapped(d, jx + 2 * stage_w + 28, row_y + 112, road_note, F["italic"], COL["text"], 26)

        briefcase_icon(d, jx + 3 * stage_w + 82, row_y + 5)
        blocked_mark(d, jx + 3 * stage_w + 145, row_y + 28)
        draw_wrapped(d, jx + 3 * stage_w + 42, row_y + 96, "Tries to build a portfolio or find internships but faces a wall due to lack of established networks and hands-on projects.", F["small_bold"], COL["text"], 28)

    # stuck bubble
    bx, by, bs = 1128, 300, 255
    d.ellipse((bx, by, bx + bs, by + bs), fill="#F7F1FF", outline=COL["purple"], width=3)
    face_icon(d, bx + bs // 2, by + 44, "sad", 44)
    draw_center(d, bx + bs // 2, by + 92, "STUCK", F["h"], COL["purple"])
    draw_center(d, bx + bs // 2, by + 124, "Curious but", F["body_bold"], COL["text"])
    draw_center(d, bx + bs // 2, by + 148, "Directionless Talent", F["body_bold"], COL["text"])
    draw_wrapped(d, bx + 48, by + 178, "Both Aisha and Marcus tried to learn independently and formally, but are left stranded without a real pathway.", F["small_bold"], COL["text"], 28)
    d.rounded_rectangle((bx + 38, by + 242, bx + bs - 38, by + 306), radius=10, fill=COL["purple"])
    draw_center(d, bx + bs // 2, by + 252, "This is the execution", F["small_bold"], "white")
    draw_center(d, bx + bs // 2, by + 271, "gap Reactor Academy", F["small_bold"], "white")
    draw_center(d, bx + bs // 2, by + 290, "must fill.", F["small_bold"], "white")

    # arrows and outcomes
    d.line((jx + jw - 6, line_y, bx + 34, by + 58), fill=COL["purple"], width=4)
    d.polygon([(bx + 34, by + 58), (bx + 18, by + 52), (bx + 25, by + 70)], fill=COL["purple"])
    ox = 1435
    round_box(d, (ox, 235, ox + 155, 410), COL["green_light"], "#A8DFAE", radius=14)
    chart_icon(d, ox + 50, 250)
    draw_center(d, ox + 77, 318, "1. INDUSTRY JOB", F["small_bold"], COL["green"])
    draw_center(d, ox + 77, 338, "& INTERNSHIP", F["small_bold"], COL["green"])
    draw_wrapped(d, ox + 20, 365, "Roles at Google, Amazon, or Frontier Labs.", F["small"], COL["text"], 18, center=True)

    round_box(d, (ox, 495, ox + 155, 710), COL["blue_light"], "#A9CCFF", radius=14)
    rocket_icon(d, ox + 48, 515)
    draw_center(d, ox + 77, 575, "2. DEEP TECH", F["small_bold"], COL["blue"])
    draw_center(d, ox + 77, 595, "STARTUP FOUNDER", F["small_bold"], COL["blue"])
    draw_wrapped(d, ox + 18, 625, "Building a venture concept / entering Reactor Ventures.", F["small"], COL["text"], 18, center=True)
    d.line((bx + bs, by + 115, ox, 320), fill=COL["purple"], width=4)
    d.line((bx + bs, by + 175, ox, 595), fill=COL["purple"], width=4)

    # key insight
    d.rounded_rectangle((95, 775, 1515, 855), radius=12, fill="#FFFDF6", outline="#F0CF86", width=2)
    bulb_icon(d, 112, 800)
    d.text((200, 810), "KEY INSIGHT", font=F["h"], fill=COL["yellow"])
    draw_wrapped(d, 340, 800, "Learners are interested and willing to learn, but face major barriers: fragmented information, lack of real-world exposure, and limited access to opportunities. Reactor Academy is the bridge between potential and real-world impact.", F["small_bold"], COL["text"], 118, 4)

    out = OUT / "broken_learner_journey_slide.png"
    img.save(out, quality=95)
    print(out)


if __name__ == "__main__":
    make_slide()


def shadow_box(draw, box, fill, outline="#E6E0F7", radius=16, width=2):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 4, y1 + 5, x2 + 4, y2 + 5), radius=radius, fill="#F1F0F8")
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def clean_avatar(draw, cx, cy, initials, name, role, need, colour):
    draw.ellipse((cx - 44, cy - 44, cx + 44, cy + 44), fill="#F0E8FF", outline="#D9CBFF", width=2)
    draw.ellipse((cx - 34, cy - 34, cx + 34, cy + 34), fill=colour)
    draw_center(draw, cx, cy - 14, initials, font(31, True), "white")
    draw_center(draw, cx, cy + 58, name, font(19, True), COL["purple"])
    draw_wrapped(draw, cx, cy + 86, role, font(12, True), COL["text"], 23, center=True)
    draw_wrapped(draw, cx, cy + 125, need, font(12), COL["text"], 23, center=True)


def mini_icon(draw, kind, cx, cy):
    if kind == "self":
        youtube_icon(draw, cx - 46, cy - 18)
        ai_icon(draw, cx + 18, cy - 20)
    elif kind == "search":
        laptop_icon(draw, cx - 38, cy - 28)
    elif kind == "course":
        books_icon(draw, cx - 38, cy - 30)
    elif kind == "wall":
        briefcase_icon(draw, cx - 36, cy - 28)
        blocked_mark(draw, cx + 25, cy - 8)


def write_center_block(draw, cx, y, text, width_chars=24, fnt=None, fill=None):
    if fnt is None:
        fnt = font(13, True)
    if fill is None:
        fill = COL["text"]
    draw_wrapped(draw, cx, y, text, fnt, fill, width_chars, gap=3, center=True)


def make_slide_v2():
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    # Title
    x = 28
    d.text((x, 18), "The ", font=F["title"], fill=COL["navy"])
    x += text_size(d, "The ", F["title"])[0]
    d.text((x, 18), "Broken Learner Journey", font=F["title"], fill=COL["pink"])
    x += text_size(d, "Broken Learner Journey", F["title"])[0]
    d.text((x, 18), ": From Curiosity to a Dead End", font=F["title"], fill=COL["navy"])

    # Left persona rail
    left = (18, 92, 205, 742)
    shadow_box(d, left, "white", COL["line"], 14)
    d.rounded_rectangle((18, 92, 205, 137), radius=14, fill=COL["purple"])
    d.rectangle((18, 116, 205, 137), fill=COL["purple"])
    draw_center(d, 111, 106, "The Personas", F["stage"], "white")
    clean_avatar(d, 111, 245, "A", "Aisha (21)", 'The "Uncertain Explorer"', "Wants clear pathways but feels overwhelmed.", "#8B5CF6")
    d.line((38, 430, 185, 430), fill="#E8E2F8", width=1)
    clean_avatar(d, 111, 555, "M", "Marcus (22)", 'The "Frustrated Builder"', "Wants real industry problems, not just theory.", "#4F46E5")

    # Journey grid
    gx, gy, gw, gh = 220, 92, 895, 650
    shadow_box(d, (gx, gy, gx + gw, gy + gh), "white", COL["line"], 14)
    col_w = gw // 4
    headers = [
        ("1. EXPLORATION", COL["purple"], COL["purple_light"]),
        ("2. STRUCTURED\nLEARNING ATTEMPT", COL["pink"], COL["pink_light"]),
        ("3. THE REALITY CHECK\n(THE FRUSTRATION)", COL["yellow"], COL["yellow_light"]),
        ("4. SEEKING OPPORTUNITIES\n(THE WALL)", COL["purple"], "#F7F4FF"),
    ]
    moods = ["happy", "neutral", "sad", "sad"]
    for i, (label, colour, fill) in enumerate(headers):
        hx = gx + i * col_w
        d.polygon([(hx, gy), (hx + col_w - 20, gy), (hx + col_w, gy + 35), (hx + col_w - 20, gy + 70), (hx, gy + 70)], fill=fill, outline=COL["line"])
        for k, line in enumerate(label.split("\n")):
            draw_center(d, hx + col_w // 2, gy + 18 + k * 18, line, F["stage"], colour)
        face_icon(d, hx + col_w // 2, gy + 98, moods[i], 38)
        if i > 0:
            d.line((hx, gy + 70, hx, gy + gh - 20), fill="#E7E1F7", width=1)

    timeline_y = gy + 138
    d.line((gx, timeline_y, gx + gw, timeline_y), fill=COL["purple"], width=3)
    for i, (_, colour, _) in enumerate(headers):
        cx = gx + i * col_w + col_w // 2
        d.ellipse((cx - 8, timeline_y - 8, cx + 8, timeline_y + 8), fill="#D9C7FF", outline=colour, width=2)

    d.line((gx, gy + 405, gx + gw, gy + 405), fill="#E7E1F7", width=1)

    row_centres = [gy + 270, gy + 535]
    # Row 1 Aisha
    contents = [
        ("self", "Learns through YouTube and ChatGPT.\n70.6% and 59.6% use these to start.", COL["purple_light"], "Feeling: Curious"),
        ("search", "Searches career paths online and explores learning resources.", None, None),
        (None, "Aisha's Roadblock:\nInformation is fragmented.\nShe does not know which pathway suits her.\n\nTop barrier: 22%.", None, None),
        ("wall", "Tries to build a portfolio or find internships, but lacks networks and hands-on projects.", None, None),
    ]
    row2 = [
        ("self", "Learns through YouTube and ChatGPT.\n70.6% and 59.6% use these to start.", COL["purple_light"], "Feeling: Curious"),
        ("course", "Takes university tech courses to build his skills.", None, None),
        (None, "Marcus's Roadblock:\nUniversity projects feel artificial.\nHe lacks real industry exposure.\n\nTop missing element: 47.7%.", None, None),
        ("wall", "Tries to build a portfolio or find internships, but lacks networks and hands-on projects.", None, None),
    ]
    for row_i, (cy, row) in enumerate(zip(row_centres, [contents, row2])):
        for i, (kind, text, pill_fill, pill_text) in enumerate(row):
            cx = gx + i * col_w + col_w // 2
            if kind:
                mini_icon(d, kind, cx, cy - 74)
                ty = cy - 15
            else:
                ty = cy - 76
            if "Roadblock:" in text:
                title, rest = text.split("\n", 1)
                draw_wrapped(d, cx - 88, ty, title, font(15, True), COL["pink"], 22)
                draw_wrapped(d, cx - 88, ty + 25, rest, font(13, True), COL["text"], 27)
            else:
                write_center_block(d, cx, ty, text, 24, font(13, True), COL["text"])
            if pill_text:
                d.rounded_rectangle((cx - 95, cy + 95, cx + 95, cy + 130), radius=18, fill=pill_fill)
                draw_center(d, cx, cy + 104, pill_text, font(13, True), COL["purple"])

    # Stuck hub
    bx, by, bw, bh = 1135, 310, 245, 245
    d.ellipse((bx, by, bx + bw, by + bh), fill="#F7F1FF", outline=COL["purple"], width=3)
    face_icon(d, bx + bw // 2, by + 45, "sad", 42)
    draw_center(d, bx + bw // 2, by + 94, "STUCK", font(22, True), COL["purple"])
    draw_center(d, bx + bw // 2, by + 128, "Curious but", font(16, True), COL["text"])
    draw_center(d, bx + bw // 2, by + 152, "Directionless Talent", font(16, True), COL["text"])
    draw_wrapped(d, bx + 42, by + 184, "They are willing to learn, but are left without a real pathway.", font(12, True), COL["text"], 30)
    d.rounded_rectangle((bx + 34, by + 250, bx + bw - 34, by + 302), radius=10, fill=COL["purple"])
    draw_center(d, bx + bw // 2, by + 260, "Execution gap", font(13, True), "white")
    draw_center(d, bx + bw // 2, by + 279, "Reactor must fill", font(13, True), "white")

    # Connector from journey to stuck
    d.line((gx + gw - 4, timeline_y, bx + 28, by + 62), fill=COL["purple"], width=4)
    d.polygon([(bx + 28, by + 62), (bx + 10, by + 54), (bx + 18, by + 75)], fill=COL["purple"])

    # Outcome cards
    ox = 1424
    d.line((bx + bw, by + 120, ox, 325), fill=COL["purple"], width=4)
    d.line((bx + bw, by + 178, ox, 605), fill=COL["purple"], width=4)
    shadow_box(d, (ox, 235, ox + 158, 420), COL["green_light"], "#A8DFAE", 14)
    chart_icon(d, ox + 50, 255)
    draw_center(d, ox + 79, 322, "1. INDUSTRY JOB", font(12, True), COL["green"])
    draw_center(d, ox + 79, 342, "& INTERNSHIP", font(12, True), COL["green"])
    draw_wrapped(d, ox + 18, 375, "Roles at companies, labs, or frontier teams.", font(12), COL["text"], 19, center=True)

    shadow_box(d, (ox, 500, ox + 158, 710), COL["blue_light"], "#A9CCFF", 14)
    rocket_icon(d, ox + 48, 522)
    draw_center(d, ox + 79, 588, "2. DEEP TECH", font(12, True), COL["blue"])
    draw_center(d, ox + 79, 608, "STARTUP FOUNDER", font(12, True), COL["blue"])
    draw_wrapped(d, ox + 18, 638, "Building a venture concept or entering Reactor Ventures.", font(12), COL["text"], 19, center=True)

    # Key insight
    d.rounded_rectangle((95, 778, 1515, 858), radius=12, fill="#FFFDF6", outline="#F0CF86", width=2)
    bulb_icon(d, 116, 800)
    d.text((200, 810), "KEY INSIGHT", font=font(19, True), fill=COL["yellow"])
    draw_wrapped(d, 340, 800, "Learners are interested and willing to learn, but face major barriers: fragmented information, lack of real-world exposure, and limited access to opportunities. Reactor Academy is the bridge between potential and real-world impact.", font(13, True), COL["text"], 120, 4)

    out = OUT / "broken_learner_journey_slide_v2.png"
    img.save(out, quality=95)
    print(out)


if __name__ == "__main__":
    make_slide_v2()
