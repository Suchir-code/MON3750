import { NextResponse } from "next/server";
import {
  runReactorOnboarding,
  type OnboardingTurn,
} from "@/backend/ai/reactor-onboarding";
import { jsonError, readJson } from "@/backend/http";
import { getAuthenticatedUser } from "@/backend/supabase/server";

type OnboardingAiRequest = {
  turns?: OnboardingTurn[];
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const body = await readJson<OnboardingAiRequest>(request);
  if (!body || !Array.isArray(body.turns)) {
    return jsonError("Conversation turns are required");
  }

  const cleanedTurns = body.turns
    .filter(
      (turn) =>
        (turn.role === "assistant" || turn.role === "student") &&
        typeof turn.content === "string" &&
        turn.content.trim(),
    )
    .slice(-16);

  const result = await runReactorOnboarding(cleanedTurns);
  return NextResponse.json(result);
}
