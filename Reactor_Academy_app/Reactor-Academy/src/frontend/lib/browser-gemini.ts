"use client";

import type { AiResponse, BootstrapData } from "@/frontend/lib/types";

function youtubeUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function deepDivesFor(question: string, output: string) {
  const lower = question.toLowerCase();
  if (lower.includes("research")) {
    return [
      {
        level: "Beginner",
        title: "How to start a research project",
        url: youtubeUrl("how to start a research project"),
        why: "Good for understanding the research workflow.",
      },
      {
        level: "Practical",
        title: "How to do a literature review",
        url: youtubeUrl("how to do a literature review"),
        why: "Useful for research pathway work.",
      },
      {
        level: "Advanced",
        title: "Google Scholar",
        url: "https://scholar.google.com/",
        why: "Use this for credible academic sources.",
      },
    ];
  }

  return [
    {
      level: "Beginner",
      title: `${output} explained`,
      url: youtubeUrl(`${output} explained`),
      why: "Use this to quickly get oriented.",
    },
    {
      level: "Practical",
      title: `${output} example`,
      url: youtubeUrl(`${output} example`),
      why: "Use this to connect the idea to your Reactor submission.",
    },
  ];
}

export async function askGeminiInBrowser(
  question: string,
  data: BootstrapData,
): Promise<AiResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is missing");
  }
  const modelsToTry = [
    process.env.NEXT_PUBLIC_GEMINI_MODEL,
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
  ].filter(Boolean) as string[];

  const prompt = `
You are Reactor AI Co-Pilot for Reactor Academy.
Answer like a normal helpful AI tutor. Be specific, conversational, and useful.
Do not force every answer into a problem statement.

Current Reactor context:
Month ${data.currentMonth.month}: ${data.currentMonth.title}
Required output: ${data.currentMonth.output}
Student pathway: ${data.profile?.pathway ?? "not selected"}
Mission: ${data.profile?.selected_mission ?? "not selected"}

Student question:
${question}
`;

  let lastError = "";

  for (const model of modelsToTry) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.65 },
        }),
      },
    );

    const payload = await response.json();
    if (!response.ok) {
      lastError = payload.error?.message ?? `${model} request failed`;
      continue;
    }

    const answer =
      payload.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!answer) {
      lastError = `${model} returned an empty response`;
      continue;
    }

    return {
      answer,
      timelineAnchor: `Month ${data.currentMonth.month}: ${data.currentMonth.output}`,
      nextActions: [
        "Turn this into one concrete note for your current submission.",
        "Save useful sources or examples in your Builder Passport.",
        "Ask a tutor if you need human review.",
      ],
      deepDives: deepDivesFor(question, data.currentMonth.output),
      shouldEscalateToTutor: false,
      tutorEscalationReason: "",
      usedFallback: false,
    };
  }

  throw new Error(
    `No Gemini model worked for this key/project. Last error: ${lastError}`,
  );
}
