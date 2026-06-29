import { NextResponse } from "next/server";
import { asString, jsonError, readJson } from "@/backend/http";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/backend/supabase/server";

type TutorRequestBody = {
  question?: string;
  context?: string;
  aiMessageId?: string;
  preferredTime?: string;
};

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const supabase = createSupabaseServerClient(auth.accessToken);
  const { data, error } = await supabase
    .from("tutor_requests")
    .select("*")
    .eq("student_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ tutorRequests: data });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const body = await readJson<TutorRequestBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body");
  }

  const question = asString(body.question);
  if (question.length < 3) {
    return jsonError("Question is required");
  }

  const supabase = createSupabaseServerClient(auth.accessToken);
  const { data, error } = await supabase
    .from("tutor_requests")
    .insert({
      student_id: auth.user.id,
      question,
      context: asString(body.context),
      ai_message_id: asString(body.aiMessageId) || null,
      preferred_time: asString(body.preferredTime),
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ tutorRequest: data }, { status: 201 });
}
