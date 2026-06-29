import { NextResponse } from "next/server";
import { asNumber, asString, jsonError, readJson } from "@/backend/http";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/backend/supabase/server";

type PassportItemBody = {
  month?: number;
  title?: string;
  status?: string;
  evidenceUrl?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const body = await readJson<PassportItemBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body");
  }

  const month = asNumber(body.month, 0);
  const title = asString(body.title);
  const status = asString(body.status, "in_progress");

  if (month < 1 || month > 12) {
    return jsonError("Month must be between 1 and 12");
  }

  if (title.length < 3) {
    return jsonError("Proof title is required");
  }

  if (!["not_started", "in_progress", "submitted", "verified"].includes(status)) {
    return jsonError("Invalid proof status");
  }

  const supabase = createSupabaseServerClient(auth.accessToken);
  const { data, error } = await supabase
    .from("passport_items")
    .insert({
      student_id: auth.user.id,
      month,
      title,
      status,
      evidence_url: asString(body.evidenceUrl) || null,
      mentor_feedback: asString(body.notes),
    })
    .select("id, month, title, status, evidence_url, mentor_feedback")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ passportItem: data }, { status: 201 });
}
