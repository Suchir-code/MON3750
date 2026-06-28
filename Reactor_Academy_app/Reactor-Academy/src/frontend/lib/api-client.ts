"use client";

import type { Session } from "@supabase/supabase-js";
import type {
  AiResponse,
  BootstrapData,
  OnboardingResult,
  OnboardingTurn,
} from "@/frontend/lib/types";

async function apiFetch<T>(
  path: string,
  session: Session,
  init: RequestInit = {},
) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload as T;
}

export function getBootstrap(session: Session) {
  return apiFetch<BootstrapData>("/api/bootstrap", session);
}

export function askAi(
  session: Session,
  body: {
    question: string;
    pathway?: string | null;
    mission?: string;
    currentMonth?: number;
    studentContext?: string;
  },
) {
  return apiFetch<AiResponse>("/api/ai/chat", session, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function runOnboardingAi(session: Session, turns: OnboardingTurn[]) {
  return apiFetch<OnboardingResult>("/api/ai/onboarding", session, {
    method: "POST",
    body: JSON.stringify({ turns }),
  });
}

export function createTutorRequest(
  session: Session,
  body: { question: string; context?: string; preferredTime?: string },
) {
  return apiFetch<{ tutorRequest: unknown }>("/api/tutor-requests", session, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createPassportItem(
  session: Session,
  body: {
    month: number;
    title: string;
    status: "not_started" | "in_progress" | "submitted" | "verified";
    evidenceUrl?: string;
    notes?: string;
  },
) {
  return apiFetch<{
    passportItem: {
      id: string;
      month: number;
      title: string;
      status: string;
      evidence_url?: string;
      mentor_feedback?: string;
    };
  }>("/api/passport-items", session, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createOpportunitySuggestion(
  session: Session,
  body: {
    title: string;
    url: string;
    type: string;
    domain?: string;
    notes?: string;
  },
) {
  return apiFetch<{ suggestion: unknown }>("/api/opportunity-suggestions", session, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function saveOnboarding(
  session: Session,
  body: {
    frontierInterests: string[];
    skills: string[];
    learningStyle: string;
    confidenceLevel: number;
    weeklyCommitmentHours: number;
    longTermGoal: string;
    recommendedPathway: string;
    selectedMission: string;
    profileSummary: string;
  },
) {
  return apiFetch<{ profile: unknown }>("/api/onboarding", session, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
