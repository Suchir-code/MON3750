import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import textwrap


def wrap_text(text, width=24):
    return "\n".join(textwrap.wrap(text, width=width))


def add_box(ax, x, y, w, h, title, body):
    box = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.03,rounding_size=0.04",
        linewidth=1.8,
        edgecolor="black",
        facecolor="white"
    )
    ax.add_patch(box)

    ax.text(
        x + w / 2,
        y + h * 0.68,
        title,
        ha="center",
        va="center",
        fontsize=12,
        fontweight="bold"
    )

    ax.text(
        x + w / 2,
        y + h * 0.35,
        wrap_text(body, 24),
        ha="center",
        va="center",
        fontsize=9
    )


def add_arrow(ax, x1, y1, x2, y2, label=None, curve=0):
    arrow = FancyArrowPatch(
        (x1, y1),
        (x2, y2),
        arrowstyle="->",
        mutation_scale=18,
        linewidth=1.6,
        color="black",
        connectionstyle=f"arc3,rad={curve}"
    )
    ax.add_patch(arrow)

    if label:
        ax.text(
            (x1 + x2) / 2,
            (y1 + y2) / 2 + 0.05,
            wrap_text(label, 22),
            ha="center",
            va="center",
            fontsize=8
        )


fig, ax = plt.subplots(figsize=(12, 5))
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis("off")

# Title
ax.text(
    0.5,
    0.93,
    "Reactor Ecosystem Loop: Exposure → Action → Capitalisation",
    ha="center",
    va="center",
    fontsize=15,
    fontweight="bold"
)

# Main three boxes
add_box(
    ax,
    0.06,
    0.43,
    0.23,
    0.26,
    "Reactor School",
    "Exposure\nBuild curiosity and early awareness"
)

add_box(
    ax,
    0.385,
    0.43,
    0.23,
    0.26,
    "Reactor Academy",
    "Action\nPractitioner-led missions, projects, and pathways"
)

add_box(
    ax,
    0.71,
    0.43,
    0.23,
    0.26,
    "Reactor Ventures",
    "Capitalisation\nFounder pathway, venture validation, and scaling"
)

# Main arrows
add_arrow(
    ax,
    0.29,
    0.56,
    0.385,
    0.56,
    "Curiosity → clarity"
)

add_arrow(
    ax,
    0.615,
    0.56,
    0.71,
    0.56,
    "Action → venture potential"
)

# Loop arrow from Ventures back to ecosystem
add_arrow(
    ax,
    0.82,
    0.43,
    0.18,
    0.43,
    "Success stories, mentors, and ecosystem credibility flow back",
    curve=-0.35
)

# Stakeholder labels
ax.text(
    0.50,
    0.78,
    "Corporates / Industry: primary funders, real problem owners, practitioner access",
    ha="center",
    va="center",
    fontsize=9,
    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="black")
)

ax.text(
    0.18,
    0.25,
    "Universities:\nlearner distribution",
    ha="center",
    va="center",
    fontsize=9,
    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="black")
)

ax.text(
    0.50,
    0.25,
    "Students:\nsubsidised beneficiaries",
    ha="center",
    va="center",
    fontsize=9,
    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="black")
)

ax.text(
    0.82,
    0.25,
    "Startups / founders:\nventure outcomes",
    ha="center",
    va="center",
    fontsize=9,
    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="black")
)

plt.tight_layout()
plt.savefig("reactor_ecosystem_loop.png", dpi=300, bbox_inches="tight")
plt.close()

print("Saved as reactor_ecosystem_loop.png")