import { GoogleGenerativeAI } from "@google/generative-ai";
import { missions, pathways } from "@/backend/academy-data";
import { getAiProvider, getGeminiApiKey, getGeminiModel } from "@/backend/env";
import { askOllama } from "@/backend/ai/ollama";

export type OnboardingTurn = {
  role: "assistant" | "student";
  content: string;
};

export type OnboardingResult = {
  stage: "question" | "recommendation";
  message: string;
  question?: string;
  recommendation?: {
    pathway: "founder" | "researcher" | "operator" | "enterprise";
    mission: string;
    reasoning: string;
    confidence: number;
    profileSummary: string;
    frontierInterests: string[];
    skills: string[];
    learningStyle: string;
    weeklyCommitmentHours: number;
    confidenceLevel: number;
    longTermGoal: string;
  };
};

const fallbackQuestions = [
  "When you say research, what kind of frontier area pulls you most: AI agents, climate tech, quantum security, robotics, biotech, semiconductors, or something else?",
  "What are your strongest skills right now? For example: coding, writing, experiments, design, maths, business analysis, interviewing, pitching, or building prototypes.",
  "Which kind of output sounds most exciting for the next 12 months: a startup prototype, a research thesis, a market/investment memo, or a corporate technical challenge portfolio?",
  "How many hours per week can you realistically commit to Reactor Academy, and what do you want this to unlock by Month 12?",
];

function buildPrompt(turns: OnboardingTurn[]) {
  return `
You are Reactor AI Onboarding for Reactor Academy.
Your job is to interview a top 1% student before they enter the 12-month Reactor Builder OS.

Important:
- This must feel like an interactive AI onboarding session, not a form.
- Ask one focused question at a time.
- Keep questions concise and high-signal.
- The student must choose a deep tech/frontier focus before pathway recommendation.
- Treat the chosen deep tech area as the anchor. Do not recommend a pathway until you understand why that area interests them.
- Do not recommend until you have enough information.
- Recommend one of exactly four pathway ids: founder, researcher, operator, enterprise.
- Recommend one mission from the provided mission titles.
- Let the student choose in the UI after you recommend.

You need to understand:
1. Chosen deep tech/frontier focus
2. Current skills and evidence of initiative
3. Whether they prefer building, researching, analysing markets, or solving company challenges
4. Confidence level
5. Weekly availability
6. Long-term goal after 12 months
7. Preferred mission/domain

Available pathways:
${pathways.map((item) => `- ${item.id}: ${item.name} (${item.goal})`).join("\n")}

Available missions:
${missions.map((item) => `- ${item.title}: ${item.domain}`).join("\n")}

Conversation so far:
${turns.map((turn) => `${turn.role}: ${turn.content}`).join("\n") || "No messages yet."}

Return JSON only.

If you still need more information, return:
{
  "stage": "question",
  "message": "short assistant message",
  "question": "one question to ask next"
}

If you have enough information, return:
{
  "stage": "recommendation",
  "message": "short summary of what you heard",
  "recommendation": {
    "pathway": "founder|researcher|operator|enterprise",
    "mission": "exact mission title",
    "reasoning": "why this fit makes sense",
    "confidence": 1-5,
    "profileSummary": "short Builder Profile summary",
    "frontierInterests": ["interest 1", "interest 2"],
    "skills": ["skill 1", "skill 2"],
    "learningStyle": "short phrase",
    "weeklyCommitmentHours": number,
    "confidenceLevel": 1-5,
    "longTermGoal": "short phrase"
  }
}
`;
}

function parseJsonResult(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (!cleaned) {
    throw new Error("AI returned an empty response");
  }

  return JSON.parse(cleaned) as OnboardingResult;
}

function inferFallbackRecommendation(studentText: string): OnboardingResult {
  const lower = studentText.toLowerCase();
  const pathway =
    lower.includes("research") || lower.includes("thesis") || lower.includes("paper")
      ? "researcher"
      : lower.includes("invest") || lower.includes("market") || lower.includes("vc")
        ? "operator"
        : lower.includes("job") || lower.includes("company") || lower.includes("interview")
          ? "enterprise"
          : "founder";

  const mission = lower.includes("quantum")
    ? "Quantum security for financial systems"
    : lower.includes("robot")
      ? "Robotics for agriculture"
      : lower.includes("factory") || lower.includes("manufact")
        ? "AI agents for factory productivity"
        : "Climate intelligence for SME energy efficiency";

  const pathwayLabel =
    pathways.find((item) => item.id === pathway)?.name ?? "Researcher Pathway";

  return {
    stage: "recommendation",
    message:
      "I have enough to make an initial recommendation. You can still change the final pathway and mission before starting.",
    recommendation: {
      pathway,
      mission,
      reasoning: `Based on your answers, ${pathwayLabel} fits best because your current interest points toward producing serious proof of work rather than passively following content.`,
      confidence: 4,
      profileSummary: `Student is exploring ${pathwayLabel} with an early mission direction around ${mission}. They need structure, mentor feedback, and a clear Month 12 proof-of-work target.`,
      frontierInterests: ["AI agents", mission.split(" for ")[0]],
      skills: ["Research", "Problem discovery"],
      learningStyle: "Project-based with mentor feedback",
      weeklyCommitmentHours: 4,
      confidenceLevel: 3,
      longTermGoal: `Build a credible ${pathwayLabel.toLowerCase()} proof-of-work portfolio by Month 12`,
    },
  };
}

function fallbackOnboarding(turns: OnboardingTurn[]): OnboardingResult {
  const studentTurns = turns.filter((turn) => turn.role === "student");
  if (studentTurns.length < fallbackQuestions.length) {
    return {
      stage: "question",
      message: "I need one more signal before recommending a pathway.",
      question: fallbackQuestions[studentTurns.length],
    };
  }

  return inferFallbackRecommendation(
    studentTurns.map((turn) => turn.content).join("\n"),
  );
}

export async function runReactorOnboarding(turns: OnboardingTurn[]) {
  try {
    const prompt = buildPrompt(turns);
    const text =
      getAiProvider() === "ollama"
        ? await askOllama(prompt)
        : await askGeminiJson(prompt);
    return parseJsonResult(text);
  } catch {
    return fallbackOnboarding(turns);
  }
}

async function askGeminiJson(prompt: string) {
  const ai = new GoogleGenerativeAI(getGeminiApiKey());
  const model = ai.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.45,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
