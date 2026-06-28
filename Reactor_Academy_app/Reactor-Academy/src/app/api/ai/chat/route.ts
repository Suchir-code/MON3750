import { NextResponse } from "next/server";
import { askReactorCopilot } from "@/backend/ai/reactor-copilot";
import { type PathwayId } from "@/backend/academy-data";
import { asNumber, asString, jsonError, readJson } from "@/backend/http";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/backend/supabase/server";

type ChatRequest = {
  question?: string;
  pathway?: PathwayId;
  mission?: string;
  currentMonth?: number;
  studentContext?: string;
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const body = await readJson<ChatRequest>(request);
  if (!body) {
    return jsonError("Invalid JSON body");
  }

  const question = asString(body.question);
  if (question.length < 3) {
    return jsonError("Question is required");
  }

  const supabase = createSupabaseServerClient(auth.accessToken);

  const { data: profile } = await supabase
    .from("student_profiles")
    .select("pathway, selected_mission, current_month, profile_summary")
    .eq("student_id", auth.user.id)
    .maybeSingle();

  const pathway = body.pathway ?? profile?.pathway ?? undefined;
  const mission = asString(body.mission, profile?.selected_mission ?? "");
  const currentMonth = asNumber(body.currentMonth, profile?.current_month ?? 2);
  const studentContext = asString(
    body.studentContext,
    profile?.profile_summary ?? "",
  );

  const aiResponse = await askReactorCopilot({
    question,
    pathway,
    mission,
    currentMonth,
    studentContext,
  });

  await supabase.from("ai_messages").insert({
    student_id: auth.user.id,
    question,
    answer: aiResponse.answer,
    response: aiResponse,
    pathway,
    mission,
    current_month: currentMonth,
    should_escalate_to_tutor: aiResponse.shouldEscalateToTutor,
  });

  return NextResponse.json(aiResponse);
}
