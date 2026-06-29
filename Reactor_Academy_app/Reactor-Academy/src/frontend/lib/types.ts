import type { AcademyMonth, PathwayId } from "@/backend/academy-data";

export type Mission = {
  id: string;
  title: string;
  domain: string;
  sponsorFit: string;
};

export type Pathway = {
  id: PathwayId;
  name: string;
  goal: string;
  finalOutput: string;
};

export type StudentProfile = {
  pathway: PathwayId | null;
  selected_mission: string;
  current_month: number;
  profile_summary: string;
  frontier_interests?: string[];
  skills?: string[];
};

export type BootstrapData = {
  user: {
    id: string;
    email?: string;
  };
  enrollment: {
    status: string;
    cohort?: string;
    starts_at?: string;
  } | null;
  profile: StudentProfile | null;
  isEnrolled: boolean;
  currentMonth: AcademyMonth;
  academyMonths: AcademyMonth[];
  pathways: Pathway[];
  missions: Mission[];
  calendarBookingUrl: string;
  passportItems: {
    id: string;
    month: number;
    title: string;
    status: string;
    evidence_url?: string;
    mentor_feedback?: string;
  }[];
};

export type AiResponse = {
  answer: string;
  timelineAnchor: string;
  nextActions: string[];
  deepDives: { level: string; title: string; url?: string; why: string }[];
  shouldEscalateToTutor: boolean;
  tutorEscalationReason: string;
  usedFallback?: boolean;
};

export type OnboardingTurn = {
  role: "assistant" | "student";
  content: string;
};

export type OnboardingResult = {
  stage: "question" | "recommendation";
  message: string;
  question?: string;
  recommendation?: {
    pathway: "founder" | "researcher" | "operator" | "enterprise";
    mission: string;
    reasoning: string;
    confidence: number;
    profileSummary: string;
    frontierInterests: string[];
    skills: string[];
    learningStyle: string;
    weeklyCommitmentHours: number;
    confidenceLevel: number;
    longTermGoal: string;
  };
};
