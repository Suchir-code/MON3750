import matplotlib.pyplot as plt
import numpy as np

barriers = [
    "No clear\naction pathway",
    "Limited\nindustry access",
    "Low learner\nconfidence",
    "Deep tech\ncomplexity",
    "Scattered online\ninformation",
    "Traditional university\nlearning"
]

impact = [10, 10, 9, 9, 8, 7]
response = [10, 9, 8, 7, 8, 6]

y = np.arange(len(barriers))
bar_height = 0.35

plt.figure(figsize=(12, 7))

plt.barh(y - bar_height/2, impact, height=bar_height, label="Impact on learner involvement")
plt.barh(y + bar_height/2, response, height=bar_height, label="Reactor response potential")

plt.yticks(y, barriers)
plt.xlabel("Qualitative score out of 10")

plt.title(
    "Barriers to Gen Z Learner Involvement in Deep Tech",
    fontsize=14,
    fontweight="bold"
)

plt.xlim(0, 11)
plt.grid(axis="x", linestyle="--", alpha=0.4)
plt.legend()

plt.gca().invert_yaxis()

plt.figtext(
    0.5,
    0.01,
    "Scores are qualitative and based on my interpretation of the Reactor Academy challenge brief and Industry Touchpoint discussion.",
    ha="center",
    fontsize=9,
    style="italic"
)

plt.tight_layout(rect=[0, 0.04, 1, 1])
plt.savefig("reactor_barrier_priority_graph.png", dpi=300, bbox_inches="tight")
plt.close()

print("Graph saved as reactor_barrier_priority_graph.png")