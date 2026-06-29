import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  academyMonths,
  getCurrentAcademyMonth,
  missions,
  pathways,
  type PathwayId,
} from "@/backend/academy-data";
import { getAiProvider, getGeminiApiKey, getGeminiModel } from "@/backend/env";
import { askOllama } from "@/backend/ai/ollama";

type ChatInput = {
  question: string;
  pathway?: PathwayId;
  mission?: string;
  currentMonth?: number;
  studentContext?: string;
};

function buildSystemContext(input: ChatInput) {
  const currentMonth = getCurrentAcademyMonth(input.currentMonth);
  const pathway = pathways.find((item) => item.id === input.pathway);

  return `
You are Reactor AI Co-Pilot for Reactor Academy.
Reactor Academy is a 12-month Frontier Builder OS for top 1% ambitious students aged 17+.

Answer like a helpful, capable AI tutor. Be conversational, specific, and useful.

Rules:
- Answer the student's actual question first.
- Then connect the answer to the Reactor timeline only when it helps.
- Do not force every answer into a problem statement.
- Do not invent a separate curriculum.
- Keep the tone clear and practical for top 1% ambitious students.
- If the student asks for videos/resources, suggest what to search or watch.
- If the question needs human judgement, say that tutor/mentor review is useful.

Current month:
Month ${currentMonth.month}: ${currentMonth.title}
Theme: ${currentMonth.theme}
Required output: ${currentMonth.output}
Task: ${currentMonth.task}

Pathway:
${pathway ? `${pathway.name}: ${pathway.goal}. Final output: ${pathway.finalOutput}` : "Not selected yet."}

Mission:
${input.mission || "Not selected yet."}

Available missions:
${missions.map((mission) => `- ${mission.title} (${mission.domain})`).join("\n")}

Official monthly outputs:
${academyMonths.map((item) => `Month ${item.month}: ${item.output}`).join("\n")}

Student context:
${input.studentContext || "No extra context provided."}
`;
}

function makeYoutubeUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function inferDeepDives(question: string, currentMonthTitle: string, currentOutput: string) {
  const lower = question.toLowerCase();

  if (
    lower.includes("reference") ||
    lower.includes("citation") ||
    lower.includes("bibliography") ||
    lower.includes("apa") ||
    lower.includes("harvard")
  ) {
    return [
      {
        level: "Beginner",
        title: "How to cite sources APA style",
        url: makeYoutubeUrl("how to cite sources APA style"),
        why: "Useful for basic source formatting.",
      },
      {
        level: "Practical",
        title: "How to write a bibliography for a project",
        url: makeYoutubeUrl("how to write a bibliography for a project"),
        why: "Useful for Builder Passport submissions.",
      },
      {
        level: "Advanced",
        title: "Google Scholar",
        url: "https://scholar.google.com/",
        why: "Useful for research-quality sources.",
      },
    ];
  }

  if (
    lower.includes("research") ||
    lower.includes("literature") ||
    lower.includes("thesis") ||
    lower.includes("methodology")
  ) {
    return [
      {
        level: "Beginner",
        title: "How to start a research project",
        url: makeYoutubeUrl("how to start a research project"),
        why: "Good for learning the basic research workflow.",
      },
      {
        level: "Practical",
        title: "How to do a literature review",
        url: makeYoutubeUrl("how to do a literature review"),
        why: "Useful for Researcher Pathway work.",
      },
      {
        level: "Advanced",
        title: "Google Scholar",
        url: "https://scholar.google.com/",
        why: "Use this to find credible papers.",
      },
    ];
  }

  if (lower.includes("problem statement")) {
    return [
      {
        level: "Beginner",
        title: "How to write a strong problem statement",
        url: makeYoutubeUrl("how to write a strong problem statement startup"),
        why: "Useful for turning broad ideas into a clear problem.",
      },
      {
        level: "Practical",
        title: "Customer discovery interview questions",
        url: makeYoutubeUrl("customer discovery interview questions startup problem validation"),
        why: "Useful for validating whether the problem is real.",
      },
    ];
  }

  return [
    {
      level: "Beginner",
      title: `${currentMonthTitle} explained`,
      url: makeYoutubeUrl(`${currentMonthTitle} explained`),
      why: "Use this to understand the current topic quickly.",
    },
    {
      level: "Practical",
      title: `${currentOutput} examples`,
      url: makeYoutubeUrl(`${currentOutput} examples`),
      why: "Use this to connect learning to the required Reactor output.",
    },
  ];
}

function inferNextActions(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("research")) {
    return [
      "Write one focused research question.",
      "Collect 5 credible sources: academic, industry, and company examples.",
      "Summarise each source in 3 lines: claim, evidence, why it matters.",
    ];
  }

  if (lower.includes("reference") || lower.includes("citation")) {
    return [
      "Create a References section at the end of your submission.",
      "Include author/organisation, date, title, source, and link.",
      "Use one format consistently, such as APA or Harvard.",
    ];
  }

  return [
    "Clarify the specific output you are trying to create.",
    "Turn the answer into evidence for your current month.",
    "Ask for tutor review if the decision needs human judgement.",
  ];
}

function unavailableCopilot(input: ChatInput, errorMessage: string) {
  const currentMonth = getCurrentAcademyMonth(input.currentMonth);
  const question = input.question.toLowerCase();

  return {
    answer: `The live AI model is not responding correctly yet, so I do not want to pretend this is a full AI answer. Your question was: "${input.question}". The app can still give resources and next steps, but to make the AI behave like normal ChatGPT/Gemini, check the Gemini API key and model configuration. Technical detail: ${errorMessage}`,
    timelineAnchor: `Month ${currentMonth.month}: ${currentMonth.output}`,
    nextActions: inferNextActions(question),
    deepDives: inferDeepDives(input.question, currentMonth.title, currentMonth.output),
    shouldEscalateToTutor: true,
    tutorEscalationReason:
      "The live AI model is unavailable. Use tutor support if the student needs a real review now.",
    usedFallback: true,
  };
}

export async function askReactorCopilot(input: ChatInput) {
  try {
    const prompt = `${buildSystemContext(input)}\n\nStudent question:\n${input.question}`;
    const answer =
      getAiProvider() === "ollama"
        ? await askOllama(prompt)
        : await askGemini(prompt);

    if (!answer) {
      throw new Error("AI returned an empty answer");
    }

    const currentMonth = getCurrentAcademyMonth(input.currentMonth);
    return {
      answer,
      timelineAnchor: `Month ${currentMonth.month}: ${currentMonth.output}`,
      nextActions: inferNextActions(input.question),
      deepDives: inferDeepDives(
        input.question,
        currentMonth.title,
        currentMonth.output,
      ),
      shouldEscalateToTutor: false,
      tutorEscalationReason: "",
      usedFallback: false,
    };
  } catch (error) {
    return unavailableCopilot(
      input,
      error instanceof Error ? error.message : "Unknown Gemini error",
    );
  }
}

async function askGemini(prompt: string) {
  const ai = new GoogleGenerativeAI(getGeminiApiKey());
  const model = ai.getGenerativeModel({
    model: getGeminiModel(),
    generationConfig: {
      temperature: 0.65,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
