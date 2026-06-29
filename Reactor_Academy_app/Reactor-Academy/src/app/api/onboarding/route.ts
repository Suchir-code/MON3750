import { NextResponse } from "next/server";
import { type PathwayId } from "@/backend/academy-data";
import { asNumber, asString, jsonError, readJson } from "@/backend/http";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/backend/supabase/server";

type OnboardingRequest = {
  frontierInterests?: string[];
  skills?: string[];
  learningStyle?: string;
  confidenceLevel?: number;
  weeklyCommitmentHours?: number;
  longTermGoal?: string;
  recommendedPathway?: PathwayId;
  selectedMission?: string;
  profileSummary?: string;
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const body = await readJson<OnboardingRequest>(request);
  if (!body) {
    return jsonError("Invalid JSON body");
  }

  const supabase = createSupabaseServerClient(auth.accessToken);

  const payload = {
    student_id: auth.user.id,
    frontier_interests: Array.isArray(body.frontierInterests)
      ? body.frontierInterests
      : [],
    skills: Array.isArray(body.skills) ? body.skills : [],
    learning_style: asString(body.learningStyle),
    confidence_level: asNumber(body.confidenceLevel, 3),
    weekly_commitment_hours: asNumber(body.weeklyCommitmentHours, 4),
    long_term_goal: asString(body.longTermGoal),
    pathway: body.recommendedPathway ?? null,
    selected_mission: asString(body.selectedMission),
    profile_summary: asString(body.profileSummary),
    current_month: 1,
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("student_profiles")
    .upsert(payload, { onConflict: "student_id" })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ profile: data });
}
