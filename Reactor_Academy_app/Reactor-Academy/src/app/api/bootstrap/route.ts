import { NextResponse } from "next/server";
import {
  academyMonths,
  getCurrentAcademyMonth,
  missions,
  pathways,
} from "@/backend/academy-data";
import { getCalendarBookingUrl } from "@/backend/env";
import { jsonError } from "@/backend/http";
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from "@/backend/supabase/server";

export async function GET(request: Request) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.user || !auth.accessToken) {
    return jsonError(auth.error ?? "Not authenticated", 401);
  }

  const supabase = createSupabaseServerClient(auth.accessToken);

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("status, cohort, starts_at")
    .eq("student_id", auth.user.id)
    .maybeSingle();

  if (enrollmentError) {
    return jsonError(enrollmentError.message, 500);
  }

  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("student_id", auth.user.id)
    .maybeSingle();

  if (profileError) {
    return jsonError(profileError.message, 500);
  }

  const currentMonth = getCurrentAcademyMonth(profile?.current_month ?? 2);

  const { data: passportItems, error: passportError } = await supabase
    .from("passport_items")
    .select("id, month, title, status, evidence_url, mentor_feedback")
    .eq("student_id", auth.user.id)
    .order("month", { ascending: true });

  if (passportError) {
    return jsonError(passportError.message, 500);
  }

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
    },
    enrollment,
    profile,
    isEnrolled: enrollment?.status === "active",
    currentMonth,
    academyMonths,
    pathways,
    missions,
    calendarBookingUrl: getCalendarBookingUrl(),
    passportItems: passportItems ?? [],
  });
}
