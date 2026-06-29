import { NextResponse } from "next/server";
import { asString, jsonError, readJson } from "@/backend/http";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/backend/supabase/server";

type OpportunitySuggestionBody = {
  title?: string;
  url?: string;
  type?: string;
  domain?: string;
  notes?: string;
};

export async function POST(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const body = await readJson<OpportunitySuggestionBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body");
  }

  const title = asString(body.title);
  const url = asString(body.url);
  const type = asString(body.type, "Other");

  if (title.length < 3) {
    return jsonError("Opportunity title is required");
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return jsonError("A valid link starting with http:// or https:// is required");
  }

  const supabase = createSupabaseServerClient(auth.accessToken);
  const { data, error } = await supabase
    .from("opportunity_suggestions")
    .insert({
      student_id: auth.user.id,
      title,
      url,
      type,
      domain: asString(body.domain),
      notes: asString(body.notes),
      status: "submitted",
    })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ suggestion: data }, { status: 201 });
}
