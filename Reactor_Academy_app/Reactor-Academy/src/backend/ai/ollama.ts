import { getOllamaModel, getOllamaUrl } from "@/backend/env";

type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

export async function askOllama(prompt: string) {
  const response = await fetch(`${getOllamaUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt,
      stream: false,
      options: {
        temperature: 0.65,
        num_predict: 700,
      },
    }),
  });

  const payload = (await response.json()) as OllamaGenerateResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Ollama request failed");
  }

  const answer = payload.response?.trim();
  if (!answer) {
    throw new Error("Ollama returned an empty answer");
  }

  return answer;
}
