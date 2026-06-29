"use client";

import type { Session } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileText,
  Home,
  Loader2,
  LogOut,
  Map,
  Mic,
  Paperclip,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  askAi,
  createOpportunitySuggestion,
  createPassportItem,
  createTutorRequest,
  getBootstrap,
  runOnboardingAi,
  saveOnboarding,
} from "@/frontend/lib/api-client";
import {
  createSupabaseBrowserClient,
  hasSupabaseConfig,
} from "@/frontend/lib/supabase-client";
import { askGeminiInBrowser } from "@/frontend/lib/browser-gemini";
import type {
  AiResponse,
  BootstrapData,
  OnboardingResult,
  OnboardingTurn,
} from "@/frontend/lib/types";
import type { PathwayId } from "@/backend/academy-data";

type SpeechRecognitionResultEvent = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

type TabId = "today" | "ai" | "opportunities" | "build" | "passport";
type PassportItem = BootstrapData["passportItems"][number];

const tabs = [
  { id: "today", label: "Today", hint: "Command centre", icon: Home },
  { id: "ai", label: "Ask AI", hint: "AI support", icon: Bot },
  { id: "build", label: "Build Room", hint: "Tasks and proof", icon: ClipboardCheck },
  { id: "passport", label: "Passport", hint: "Proof record", icon: ShieldCheck },
  { id: "opportunities", label: "Opportunities", hint: "Events and links", icon: Search },
] satisfies { id: TabId; label: string; hint: string; icon: LucideIcon }[];

export function ReactorApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [status, setStatus] = useState<"checking" | "login" | "loading" | "ready">(
    () => (hasSupabaseConfig() ? "checking" : "login"),
  );
  const [error, setError] = useState("");
  const supabase = useMemo(() => {
    if (!hasSupabaseConfig()) return null;
    return createSupabaseBrowserClient();
  }, []);

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.removeItem("reactor-theme");
  }, []);

  const loadApp = useCallback(
    async (nextSession: Session) => {
      setStatus("loading");
      setError("");
      try {
        const data = await getBootstrap(nextSession);
        setBootstrap(data);
        setStatus("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load app";
        setError(
          message.includes("schema cache") || message.includes("enrollments")
            ? "Supabase database tables are not installed yet. Run the project schema in Supabase SQL Editor before opening the dashboard."
            : message,
        );
        setStatus("ready");
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void loadApp(data.session);
      } else {
        setStatus("login");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void loadApp(nextSession);
      } else {
        setBootstrap(null);
        setStatus("login");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadApp, supabase]);

  if (status === "checking") {
    return <FullScreenState icon={Loader2} title="Starting Reactor Builder OS" spin />;
  }

  if (!supabase) {
    return (
      <LoginScreen
        setupError="Supabase environment variables are missing in this app folder."
        onGoogleLogin={() => undefined}
      />
    );
  }

  if (!session) {
    return <LoginScreen onGoogleLogin={() => signInWithGoogle(supabase)} />;
  }

  if (status === "loading") {
    return <FullScreenState icon={Loader2} title="Loading your Builder OS" spin />;
  }

  if (error) {
    return (
      <Shell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={() => supabase.auth.signOut()}
      >
        <SetupProblem message={error} />
      </Shell>
    );
  }

  if (!bootstrap) {
    return <FullScreenState icon={AlertCircle} title="No app data loaded" />;
  }

  if (!bootstrap.isEnrolled) {
    return (
      <Shell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={() => supabase.auth.signOut()}
      >
        <EnrollmentGate email={bootstrap.user.email ?? ""} />
      </Shell>
    );
  }

  if (!bootstrap.profile) {
    return (
      <Shell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={() => supabase.auth.signOut()}
      >
        <Onboarding
          data={bootstrap}
          session={session}
          onDone={() => loadApp(session)}
        />
      </Shell>
    );
  }

  return (
    <Shell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={() => supabase.auth.signOut()}
    >
      {activeTab === "today" && <Today data={bootstrap} onTabChange={setActiveTab} />}
      {activeTab === "ai" && <AskAi data={bootstrap} session={session} />}
      {activeTab === "opportunities" && <Opportunities data={bootstrap} session={session} onTabChange={setActiveTab} />}
      {activeTab === "build" && (
        <BuildRoom
          data={bootstrap}
          session={session}
          onProofCreated={(passportItem) =>
            setBootstrap((current) =>
              current
                ? {
                    ...current,
                    passportItems: [passportItem, ...current.passportItems],
                  }
                : current,
            )
          }
        />
      )}
      {activeTab === "passport" && <Passport data={bootstrap} />}
    </Shell>
  );
}

async function signInWithGoogle(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
}

function LoginScreen({
  onGoogleLogin,
  setupError,
}: {
  onGoogleLogin: () => void;
  setupError?: string;
}) {
  return (
    <main className="min-h-screen bg-[#050606] text-[#fff8ee]">
      <Background />
      <section className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Brand />
          <p className="mt-8 inline-flex rounded-lg border border-[#fcb33b55] bg-[#fcb33b18] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#fcb33b]">
            AI-supported pathway OS
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight md:text-7xl">
            Your Reactor Academy command centre.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#c5bba8] md:text-lg">
            Sign in to access your fixed 12-month timeline, AI Co-Pilot, tutor
            escalation, mission map, Build Room, and Builder Passport.
          </p>
          <button
            onClick={onGoogleLogin}
            disabled={Boolean(setupError)}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-[#fcb33b] px-5 py-4 text-base font-black text-[#050606] shadow-[0_18px_38px_rgba(252,179,59,0.18)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Continue with Google <ArrowRight size={18} />
          </button>
          {setupError && <p className="mt-4 max-w-xl rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">{setupError}</p>}
        </div>

        <div className="rounded-lg border border-[#fcb33b4d] bg-[#141817e6] p-5 shadow-[0_22px_58px_rgba(0,0,0,0.36)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#fcb33b]">
            What students get
          </p>
          <div className="mt-5 grid gap-3">
            {[
              ["Fixed timeline", "Everyone follows the same 12-month academy spine."],
              ["Personalised pathway", "Founder, Researcher, Operator / Investor, or Enterprise Talent."],
              ["AI first support", "Ask AI, get deep dives, then escalate to tutors when needed."],
              ["Proof of work", "Monthly outputs build toward the Builder Passport."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-black/25 p-4">
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[#c5bba8]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Shell({
  activeTab,
  onTabChange,
  onSignOut,
  children,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <main className="app-bg min-h-screen">
      <Background />
      <div className="relative grid min-h-screen w-full gap-4 px-3 py-3 lg:grid-cols-[248px_minmax(0,1fr)] lg:px-6 lg:py-5">
        <aside className="app-surface-strong hidden h-[calc(100vh-2.5rem)] flex-col rounded-2xl border p-3 backdrop-blur-xl lg:sticky lg:top-5 lg:flex">
          <Brand />
          <nav className="mt-6 grid gap-1.5">
            {tabs.map((tab) => (
              <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)} />
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-[#fcb33b22] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">Tutor hours</p>
            <p className="mt-2 text-sm font-bold">6am-12pm</p>
            <p className="mt-1 text-xs leading-5 text-[#c5bba8]">AI first, deep dive second, tutor when needed.</p>
          </div>
          <button onClick={onSignOut} className="app-border app-muted-text mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition hover:border-[var(--border-strong)] hover:bg-[#fcb33b0d]">
            <LogOut size={16} /> Sign out
          </button>
        </aside>

        <section className="min-w-0 pb-24 lg:pb-0">
          <header className="app-surface-strong mb-3 flex items-center justify-between rounded-2xl border p-3 backdrop-blur-xl lg:hidden">
            <Brand compact />
            <div className="flex items-center gap-2">
              <button onClick={onSignOut} className="app-border app-accent rounded-lg border px-3 py-2 text-sm font-bold">Sign out</button>
            </div>
          </header>
          <header className="app-surface mb-4 hidden items-center justify-between rounded-2xl border px-5 py-4 backdrop-blur-xl lg:flex">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#fcb33b]">
                Reactor Builder OS
              </p>
              <h1 className="mt-1 text-2xl font-black">{activeTabMeta.label}</h1>
              <p className="mt-1 text-sm text-[#c5bba8]">{activeTabMeta.hint}</p>
            </div>
            <div className="flex items-center gap-2">
              {["Week 1 demo", "Supabase live", "AI ready"].map((item) => (
                <span key={item} className="rounded-full border border-[#fcb33b22] bg-[#fcb33b0d] px-3 py-2 text-xs font-black text-[#d4c5ad]">
                  {item}
                </span>
              ))}
            </div>
          </header>
          {children}
        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-5 rounded-lg border border-[#fcb33b33] bg-[#070808ee] p-1 shadow-2xl backdrop-blur-xl lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-bold ${
              activeTab === tab.id ? "bg-[#fcb33b] text-[#050606]" : "text-[#c5bba8]"
            }`}
          >
            <tab.icon size={17} />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function Today({ data, onTabChange }: { data: BootstrapData; onTabChange: (tab: TabId) => void }) {
  const [commandMode, setCommandMode] = useState<"focus" | "proof" | "support">("focus");
  const month = data.currentMonth;
  const profile = data.profile;
  const currentWeek = getCurrentCalendarWeek();
  const week = month.weeks[currentWeek - 1] ?? month.weeks[0];
  const completedProof = data.passportItems.filter(
    (item) => item.status === "verified" || item.status === "submitted",
  );
  const currentMonthProof = data.passportItems.filter(
    (item) => item.month === month.month,
  );
  const currentWeekProof = currentMonthProof.find((item) =>
    item.title.toLowerCase().includes(`week ${currentWeek}`),
  );
  const progress = completedProof.length
    ? Math.round((completedProof.length / 48) * 100)
    : 8;
  const monthProgress = Math.round((currentMonthProof.length / 4) * 100);
  const nextAction = currentWeekProof
    ? "Review the proof you saved, then ask AI or a tutor how to make it stronger."
    : "Add one useful piece of evidence for this week in Build Room.";
  const modeCopy = {
    focus: {
      label: "Focus",
      title: "Today is about one clear weekly move.",
      text: week.studentAction,
      action: "Open Build Room",
      tab: "build" as TabId,
    },
    proof: {
      label: "Proof",
      title: currentWeekProof ? "Proof exists. Make it sharper." : "No Week 1 proof yet.",
      text: currentWeekProof?.title ?? "Capture one note, link, image, PDF, or draft that proves progress.",
      action: currentWeekProof ? "View Passport" : "Add Proof",
      tab: currentWeekProof ? "passport" as TabId : "build" as TabId,
    },
    support: {
      label: "Support",
      title: "Use AI first, then escalate only if needed.",
      text: "Ask Reactor AI for a clearer task, a deep-dive video, or mentor questions before booking tutor help.",
      action: "Ask AI",
      tab: "ai" as TabId,
    },
  };
  const activeMode = modeCopy[commandMode];

  return (
    <div className="grid gap-3">
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <div className="flex flex-wrap gap-2">
            <Pill icon={CalendarClock}>Month {month.month}</Pill>
            <Pill icon={Map}>Week {currentWeek}</Pill>
            <Pill icon={Compass}>{profile?.pathway ?? "Pathway pending"}</Pill>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight tracking-tight text-[#f7efe2] md:text-5xl">
            {week.studentAction}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c5bba8] md:text-base">
            {week.format}: {week.taught}
          </p>

          <div className="mt-5 rounded-lg border border-[#fcb33b55] bg-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="grid gap-2 rounded-lg bg-black/30 p-1 sm:grid-cols-3">
              {Object.entries(modeCopy).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setCommandMode(key as "focus" | "proof" | "support")}
                  className={`rounded-lg px-4 py-3 text-sm font-black transition duration-200 ${
                    commandMode === key
                      ? "bg-[#fcb33b] text-[#050606] shadow-[0_14px_32px_rgba(252,179,59,0.22)]"
                      : "text-[#c5bba8] hover:bg-[#fcb33b14] hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 rounded-2xl border border-[#fcb33b33] bg-[#fcb33b10] p-4 md:grid-cols-[minmax(0,1fr)_170px] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
                  Command mode
                </p>
                <h2 className="mt-2 text-2xl font-black">{activeMode.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#c5bba8]">{activeMode.text}</p>
              </div>
              <button
                onClick={() => onTabChange(activeMode.tab)}
                className="rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] shadow-[0_14px_32px_rgba(252,179,59,0.2)] transition hover:-translate-y-0.5"
              >
                {activeMode.action}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StatusTile label="This month" value={`${monthProgress}%`} text={`${currentMonthProof.length}/4 weekly proof items saved`} />
            <StatusTile label="This week" value={currentWeekProof ? "Proof saved" : "Open"} text={currentWeekProof?.title ?? "Needs one clear evidence item"} />
            <StatusTile label="Pathway" value={profile?.pathway ?? "Pending"} text={profile?.selected_mission ?? "Choose a mission"} />
          </div>

          <div className="mt-5 rounded-2xl border border-[#fcb33b33] bg-[#fcb33b0d] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
                  Best next move
                </p>
                <h2 className="mt-2 text-xl font-black text-[#f7efe2]">{nextAction}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c5bba8]">
                  Keep today simple: learn what matters, capture proof, and only
                  escalate when the AI or deep dives cannot unblock you.
                </p>
              </div>
              <button
                onClick={() => onTabChange(currentWeekProof ? "ai" : "build")}
                className="rounded-xl bg-[#f0ad3d] px-4 py-3 text-sm font-black text-[#111413] shadow-[0_10px_24px_rgba(240,173,61,0.14)]"
              >
                {currentWeekProof ? "Strengthen with AI" : "Add proof now"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ActionCard icon={ClipboardCheck} title="Build Room" text="Finish weekly tasks, add files, notes, and proof." onClick={() => onTabChange("build")} />
            <ActionCard icon={Bot} title="Ask AI" text="Get timeline-aware help before tutor escalation." onClick={() => onTabChange("ai")} />
            <ActionCard icon={Rocket} title="Opportunities" text="Track external events, hackathons, and openings." onClick={() => onTabChange("opportunities")} />
          </div>
        </Panel>
        <Panel title="Current Output" icon={FileText}>
          <h2 className="text-2xl font-black">{month.output}</h2>
          <p className="mt-3 text-sm leading-6 text-[#c5bba8]">
            Mission: {profile?.selected_mission || "Not selected"}
          </p>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {month.weeks.map((monthWeek) => {
              const proofForWeek = currentMonthProof.find((item) =>
                item.title.toLowerCase().includes(`week ${monthWeek.week}`),
              );
              const active = monthWeek.week === currentWeek;
              const height = proofForWeek ? "100%" : active ? "72%" : monthWeek.week < currentWeek ? "44%" : "24%";
              return (
                <button
                  key={monthWeek.week}
                  onClick={() => onTabChange("build")}
                  className={`rounded-lg border p-2 text-left transition hover:border-[#fcb33b88] ${
                    active
                      ? "border-[#fcb33b] bg-[#fcb33b14]"
                      : "border-white/10 bg-black/25"
                  }`}
                >
                  <div className="flex h-20 items-end rounded-md bg-black/30 p-1">
                    <div
                      className={`w-full rounded-md ${proofForWeek ? "bg-[#fcb33b]" : "bg-[#fcb33b66]"}`}
                      style={{ height }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-black">W{monthWeek.week}</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-[#c5bba8]">
                    {proofForWeek ? "Saved" : active ? "Now" : monthWeek.week < currentWeek ? "Catch up" : "Next"}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="mt-5 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#f0ad3d]" style={{ width: `${Math.max(progress, 8)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-[#c5bba8]">{progress}% passport progress</p>
        </Panel>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Week Plan" icon={Map}>
          <div className="grid gap-2 md:grid-cols-4">
            {month.weeks.map((monthWeek) => {
              const active = monthWeek.week === currentWeek;
              const proofForWeek = currentMonthProof.find((item) =>
                item.title.toLowerCase().includes(`week ${monthWeek.week}`),
              );
              return (
                <button
                  key={monthWeek.week}
                  onClick={() => onTabChange("build")}
                  className={`rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#fcb33b88] ${
                    active
                      ? "border-[#fcb33b] bg-[#fcb33b14]"
                      : proofForWeek
                        ? "border-[#fcb33b55] bg-[#fcb33b0d]"
                        : "border-white/10 bg-black/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                      Week {monthWeek.week}
                    </p>
                    <CheckCircle2
                      size={17}
                      className={proofForWeek ? "text-[#fcb33b]" : "text-white/25"}
                    />
                  </div>
                  <h3 className="mt-2 text-sm font-black">{monthWeek.format}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#c5bba8]">
                    {monthWeek.studentAction}
                  </p>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Quick Decisions" icon={Compass}>
          <div className="grid gap-2">
            {[
              ["Stuck on concept?", "Ask AI first, then request tutor help."],
              ["Found evidence?", "Add it to Build Room before you forget."],
              ["Need outside momentum?", "Check Opportunities at the end of your workflow."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-black/25 p-3">
                <p className="text-sm font-black">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#c5bba8]">{text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StatusTile({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#c5bba8]">{text}</p>
    </div>
  );
}

function AskAi({ data, session }: { data: BootstrapData; session: Session }) {
  const [question, setQuestion] = useState("");
  const [responses, setResponses] = useState<
    { question: string; response: AiResponse }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const latestResponse = responses.at(-1)?.response;

  const quickPrompts = [
    "Help me write my problem statement",
    "Suggest YouTube videos for customer discovery",
    "Prepare 5 mentor questions",
    "Review my Month 1 output",
  ];

  async function submit() {
    if (!question.trim()) return;
    const askedQuestion = question.trim();
    setLoading(true);
    setMessage("");
    setQuestion("");
    try {
      const result = await askAi(session, {
        question: askedQuestion,
        pathway: data.profile?.pathway,
        mission: data.profile?.selected_mission,
        currentMonth: data.currentMonth.month,
        studentContext: data.profile?.profile_summary,
      });
      if (
        result.usedFallback &&
        result.answer.includes("live AI model is not responding")
      ) {
        const browserResult = await askGeminiInBrowser(askedQuestion, data);
        setResponses((current) => [
          ...current,
          { question: askedQuestion, response: browserResult },
        ]);
        return;
      }
      setResponses((current) => [
        ...current,
        { question: askedQuestion, response: result },
      ]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  async function escalate() {
    const escalationQuestion = question.trim() || responses.at(-1)?.question;
    if (!escalationQuestion) return;
    await createTutorRequest(session, {
      question: escalationQuestion,
      context: latestResponse?.answer ?? "",
    });
    setMessage("Tutor request created.");
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Ask AI" icon={Bot}>
        <div className="mb-4 grid gap-3 rounded-lg border border-[#fcb33b44] bg-[#fcb33b10] p-4 md:grid-cols-[96px_minmax(0,1fr)] md:items-center">
          <ReactorGuideAvatar thinking={loading} />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
              Reactor AI is online
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Ask, learn, then escalate only if needed.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#c5bba8]">
              I’ll answer inside your Reactor timeline, suggest focused YouTube
              deep dives, and help you turn confusion into proof of work.
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setQuestion(prompt)}
              className="rounded-lg border border-[#fcb33b33] bg-black/25 px-3 py-2 text-xs font-bold text-[#ffe0a3] hover:border-[#fcb33b88]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mb-4 max-h-[440px] space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
          {responses.length === 0 ? (
            <div className="rounded-lg border border-[#fcb33b33] bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                Try asking
              </p>
              <p className="mt-2 text-sm leading-6 text-[#c5bba8]">
                “I’m not sure how to write the problem statement” or “Give me
                YouTube videos before I ask a tutor.”
              </p>
            </div>
          ) : (
            responses.map((item, index) => (
              <div key={`${item.question}-${index}`} className="grid gap-3">
                <ChatBubble role="Student" text={item.question} />
                <ChatBubble role="Reactor AI" text={item.response.answer} ai />
                {item.response.usedFallback && (
                  <div className="rounded-lg border border-[#fcb33b33] bg-[#fcb33b0f] p-3 text-sm leading-6 text-[#ffe0a3]">
                    Reactor AI used a safe local response because the live AI
                    model did not return a usable answer. You can still use the
                    guidance, or send it to a tutor for human review.
                  </div>
                )}
                {item.response.shouldEscalateToTutor && (
                  <div className="rounded-lg border border-[#fcb33b55] bg-black/25 p-3 text-sm leading-6 text-[#c5bba8]">
                    Tutor review recommended:{" "}
                    {item.response.tutorEscalationReason}
                  </div>
                )}
                <div className="grid gap-3 lg:grid-cols-2">
                  <ResultBlock
                    title="Timeline Anchor"
                    text={item.response.timelineAnchor}
                  />
                  <ListBlock
                    title="Next Actions"
                    items={item.response.nextActions}
                  />
                </div>
                <DeepDiveCards items={item.response.deepDives} />
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-3 rounded-lg border border-[#fcb33b44] bg-[#fcb33b12] p-4">
              <ReactorGuideAvatar small thinking />
              <p className="text-sm font-bold text-[#ffe0a3]">
                Reactor AI is thinking through your timeline, pathway, and next
                action...
              </p>
            </div>
          )}
        </div>

        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your mission, pathway, submission, mentor prep, or a difficult concept..."
          className="min-h-32 w-full resize-none rounded-lg border border-[#fcb33b33] bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-[#8b806e] focus:border-[#fcb33b]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={submit} disabled={loading} className="rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] disabled:opacity-60">
            {loading ? "Asking..." : "Ask AI"}
          </button>
          <button onClick={escalate} className="rounded-lg border border-[#fcb33b44] px-4 py-3 text-sm font-black text-[#fff8ee]">
            Send to tutor
          </button>
        </div>
        {message && <p className="mt-3 rounded-lg border border-[#fcb33b33] bg-black/25 p-3 text-sm text-[#ffe0a3]">{message}</p>}
      </Panel>
      <Panel title="Support Ladder" icon={UserRoundCheck}>
        <ReactorGuideAvatar thinking={loading} />
        <p className="mb-4 mt-3 text-sm leading-6 text-[#c5bba8]">
          The AI should help first. If the answer still feels weak, send the
          whole context to a tutor or open the booking link.
        </p>
        {["Ask AI", "Get Suggested Deep Dives", "Escalate to tutor", "Bring stronger work to mentors"].map((step, index) => (
          <div key={step} className="mb-2 flex gap-3 rounded-lg bg-black/25 p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fcb33b] text-sm font-black text-[#050606]">{index + 1}</span>
            <p className="text-sm font-bold leading-6 text-[#d9c1a1]">{step}</p>
          </div>
        ))}
        {data.calendarBookingUrl && (
          <a
            href={data.calendarBookingUrl}
            target="_blank"
            className="mt-3 block rounded-lg bg-[#fcb33b] px-4 py-3 text-center text-sm font-black text-[#050606]"
          >
            Book tutor slot
          </a>
        )}
      </Panel>
    </div>
  );
}

const frontierDomains = [
  {
    domain: "AI agents",
    signal: "Teams are moving from chatbots to autonomous workflows.",
    problem: "Which repetitive expert tasks can be safely delegated?",
    search: "AI agents autonomous workflows startup examples",
    currentSignals: [
      "Companies are testing agents for customer support, sales operations, coding, research, and internal workflows.",
      "The important question is shifting from can it answer to can it reliably complete a task.",
      "Students should look for failure modes: hallucination, handoff, security, cost, and human approval.",
    ],
  },
  {
    domain: "Quantum security",
    signal: "Banks and infrastructure teams are preparing for post-quantum risk.",
    problem: "How should critical systems migrate before quantum attacks are practical?",
    search: "post quantum cryptography financial systems explained",
    currentSignals: [
      "Security teams are mapping which systems depend on encryption that may need migration.",
      "Post-quantum readiness is becoming a board-level infrastructure question.",
      "Students should look for sectors with long-lived sensitive data, such as finance, health, and government.",
    ],
  },
  {
    domain: "Climate intelligence",
    signal: "SMEs need practical energy and emissions decisions, not just dashboards.",
    problem: "How can small operators find the highest-impact energy fixes?",
    search: "AI energy efficiency SMEs climate intelligence",
    currentSignals: [
      "Energy costs, reporting pressure, and operational waste are pushing SMEs toward practical climate tools.",
      "The gap is not more charts; it is decision support that tells operators what to fix first.",
      "Students should look for repeatable workflows in factories, offices, retail, logistics, and food operators.",
    ],
  },
  {
    domain: "Robotics",
    signal: "Robots are leaving labs and entering farms, warehouses, and factories.",
    problem: "Where are labour shortages and safety risks severe enough for robotics?",
    search: "robotics agriculture manufacturing automation case studies",
    currentSignals: [
      "Robotics demand is strongest where labour is scarce, work is repetitive, or environments are unsafe.",
      "New progress is coming from better sensors, cheaper compute, and AI-assisted perception.",
      "Students should compare the real workflow cost against robot setup, maintenance, and trust barriers.",
    ],
  },
  {
    domain: "Semiconductors and edge AI",
    signal: "More AI work is moving onto devices, sensors, and industrial hardware.",
    problem: "What can run locally when cloud AI is too slow, costly, or risky?",
    search: "edge AI semiconductor industrial applications",
    currentSignals: [
      "More AI is being pushed closer to machines, cameras, sensors, and vehicles.",
      "The drivers are latency, privacy, reliability, bandwidth, and cost.",
      "Students should look for use cases where cloud dependence is a blocker.",
    ],
  },
  {
    domain: "Synthetic biology",
    signal: "Biology is becoming programmable, measurable, and increasingly automated.",
    problem: "Which health, food, or materials problems need biological solutions?",
    search: "synthetic biology startup applications beginners",
    currentSignals: [
      "Biology teams are combining automation, data, and design tools to speed up experimentation.",
      "The opportunity sits across health, food, agriculture, materials, and diagnostics.",
      "Students should look for problems where biology offers a better route than software or hardware alone.",
    ],
  },
];

const opportunityTypes = ["Hackathon", "Meetup", "Research", "Fellowship", "Challenge"];

const opportunityCards = [
  {
    type: "Hackathon",
    title: "Find a frontier hackathon",
    why: "Build a fast prototype, find teammates, and turn curiosity into visible proof.",
    action: "Search Devpost",
    url: "https://devpost.com/hackathons",
  },
  {
    type: "Meetup",
    title: "Attend a deep tech meetup",
    why: "Meet builders, researchers, founders, engineers, and possible mentors.",
    action: "Search Meetup",
    url: "https://www.meetup.com/find/?keywords=deep%20tech",
  },
  {
    type: "Research",
    title: "Look for PhD/lab events",
    why: "Useful for finding supervisors, lab talks, papers, or methodology feedback.",
    action: "Search FindAPhD",
    url: "https://www.findaphd.com/",
  },
  {
    type: "Fellowship",
    title: "Track fellowships and accelerators",
    why: "Useful for serious external programmes, grants, or startup pathways.",
    action: "Search opportunities",
    url: "https://www.google.com/search?q=deep+tech+student+fellowship+accelerator",
  },
  {
    type: "Challenge",
    title: "Find company or sponsor challenges",
    why: "Useful for industry-facing proof of work and enterprise talent portfolios.",
    action: "Search challenges",
    url: "https://www.google.com/search?q=AI+robotics+climate+tech+innovation+challenge+students",
  },
];

function Opportunities({
  data,
  session,
  onTabChange,
}: {
  data: BootstrapData;
  session: Session;
  onTabChange: (tab: TabId) => void;
}) {
  const savedFocus = data.profile?.frontier_interests?.[0] ?? "";
  const [filter, setFilter] = useState("All");
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionUrl, setSuggestionUrl] = useState("");
  const [suggestionType, setSuggestionType] = useState(opportunityTypes[0]);
  const [suggestionNotes, setSuggestionNotes] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [savingSuggestion, setSavingSuggestion] = useState(false);
  const filteredOpportunities =
    filter === "All"
      ? opportunityCards
      : opportunityCards.filter((item) => item.type === filter);

  async function submitOpportunitySuggestion() {
    if (!suggestionTitle.trim() || !suggestionUrl.trim()) return;
    setSavingSuggestion(true);
    setSuggestionMessage("");
    try {
      await createOpportunitySuggestion(session, {
        title: suggestionTitle,
        url: suggestionUrl,
        type: suggestionType,
        domain: savedFocus || "General frontier",
        notes: suggestionNotes,
      });
      setSuggestionTitle("");
      setSuggestionUrl("");
      setSuggestionNotes("");
      setSuggestionMessage("Suggestion sent to Reactor for review.");
    } catch (err) {
      setSuggestionMessage(err instanceof Error ? err.message : "Could not send suggestion.");
    } finally {
      setSavingSuggestion(false);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Opportunities" icon={Search}>
        <div className="rounded-lg border border-[#fcb33b66] bg-[#fcb33b12] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
            Events, openings, and useful links
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">
            Find places to learn, build, meet people, and show proof.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c5bba8]">
            This is not a generic topic list. It starts from the student’s
            chosen deep tech focus and shows what to investigate in the world
            right now.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {["All", ...opportunityTypes].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-lg border px-3 py-2 text-xs font-black ${
                filter === item
                  ? "border-[#fcb33b] bg-[#fcb33b] text-[#050606]"
                  : "border-[#fcb33b44] text-[#ffe0a3]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {filteredOpportunities.map((item) => (
            <a
              key={item.title}
              href={item.url}
              target="_blank"
              className="rounded-lg border border-white/10 bg-black/25 p-4 transition hover:border-[#fcb33b66]"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                {item.type}
              </p>
              <h2 className="mt-2 text-lg font-black">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#c5bba8]">{item.why}</p>
              <p className="mt-3 text-xs font-black text-[#ffe0a3]">{item.action}</p>
            </a>
          ))}
        </div>

      </Panel>

      <aside className="grid content-start gap-3">
        <Panel title="Suggest an Opportunity" icon={Rocket}>
          <p className="mb-3 text-sm leading-6 text-[#c5bba8]">
            Found a useful hackathon, PhD meetup, webinar, fellowship,
            competition, or company challenge? Send it to Reactor for review.
          </p>
          <label className="grid gap-2 text-sm font-bold">
            Title
            <input
              value={suggestionTitle}
              onChange={(event) => setSuggestionTitle(event.target.value)}
              placeholder="e.g. AI agents hackathon"
              className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm outline-none focus:border-[#fcb33b]"
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-bold">
            Link
            <input
              value={suggestionUrl}
              onChange={(event) => setSuggestionUrl(event.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm outline-none focus:border-[#fcb33b]"
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-bold">
            Type
            <select
              value={suggestionType}
              onChange={(event) => setSuggestionType(event.target.value)}
              className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm outline-none focus:border-[#fcb33b]"
            >
              {opportunityTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={suggestionNotes}
            onChange={(event) => setSuggestionNotes(event.target.value)}
            placeholder="Why is this useful for Reactor students?"
            className="mt-3 min-h-24 w-full resize-none rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm leading-6 outline-none placeholder:text-[#8b806e] focus:border-[#fcb33b]"
          />
          <button
            onClick={submitOpportunitySuggestion}
            disabled={savingSuggestion || !suggestionTitle.trim() || !suggestionUrl.trim()}
            className="mt-3 w-full rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] disabled:opacity-60"
          >
            {savingSuggestion ? "Sending..." : "Submit suggestion"}
          </button>
          {suggestionMessage && (
            <p className="mt-3 text-sm font-bold text-[#ffe0a3]">{suggestionMessage}</p>
          )}
        </Panel>

        <Panel title="Use It Well" icon={Compass}>
          <ListBlock
            title="Turn opportunity into proof"
            items={[
              "Attend or apply only if it fits your pathway.",
              "Capture screenshots, notes, feedback, or certificates.",
              "Add the strongest evidence in Build Room.",
              "Ask AI to turn the experience into Passport proof.",
            ]}
          />
          <button
            onClick={() => onTabChange("build")}
            className="mt-3 w-full rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606]"
          >
            Add proof in Build Room
          </button>
        </Panel>
      </aside>
    </div>
  );
}

function formatRecordingTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getCurrentCalendarWeek() {
  return 1;
}

function BuildRoom({
  data,
  session,
  onProofCreated,
}: {
  data: BootstrapData;
  session: Session;
  onProofCreated: (passportItem: PassportItem) => void;
}) {
  const [question, setQuestion] = useState("");
  const [workNote, setWorkNote] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [summarising, setSummarising] = useState(false);
  const [listening, setListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingPreview, setRecordingPreview] = useState("");
  const [proofTitle, setProofTitle] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [attachments, setAttachments] = useState<
    { name: string; type: string; size: number; previewUrl?: string }[]
  >([]);
  const [savingProof, setSavingProof] = useState(false);
  const [message, setMessage] = useState("");
  const currentWeekNumber = getCurrentCalendarWeek();
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(currentWeekNumber);
  const currentWeek =
    data.currentMonth.weeks.find((week) => week.week === selectedWeekNumber) ??
    data.currentMonth.weeks[0];
  const tasks = useMemo(() => [
    currentWeek.taught,
    currentWeek.studentAction,
    `Prepare evidence for ${data.currentMonth.output}`,
    "Update Builder Passport proof",
  ], [currentWeek.studentAction, currentWeek.taught, data.currentMonth.output]);
  const [taskState, setTaskState] = useState<boolean[]>(
    () => tasks.map((_, index) => index === 0),
  );
  const [proofItems, setProofItems] = useState(
    () => data.passportItems.filter((item) => item.month === data.currentMonth.month),
  );
  const selectedWeekProof = proofItems.filter((item) =>
    item.title.toLowerCase().includes(`week ${currentWeek.week}`),
  );
  const completedTasks = taskState.filter(Boolean).length;
  const progress = Math.round((completedTasks / tasks.length) * 100);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (!listening) return;
    const interval = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function addAttachments(files: FileList | null) {
    if (!files?.length) return;
    const accepted = Array.from(files).filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf",
    );
    setAttachments((current) => [
      ...accepted.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
      ...current,
    ]);
  }

  function finishRecording(stopEngine: boolean) {
    const transcript = transcriptRef.current.trim();
    if (transcript) {
      setWorkNote((current) => {
        if (current.includes(transcript)) return current;
        return `${current}${current ? "\n" : ""}${transcript}`;
      });
    }
    transcriptRef.current = "";
    setRecordingPreview("");
    if (stopEngine) {
      recognitionRef.current?.stop();
    }
    recognitionRef.current = null;
    setListening(false);
  }

  function startRecording() {
    if (!speechSupported || listening) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    transcriptRef.current = "";
    setRecordingPreview("");
    setRecordingSeconds(0);
    setListening(true);
    recognition.onresult = (event) => {
      const transcriptParts: string[] = [];
      for (let index = 0; index < event.results.length; index += 1) {
        transcriptParts.push(event.results[index][0]?.transcript ?? "");
      }
      const transcript = transcriptParts.join(" ").trim();
      if (transcript) {
        transcriptRef.current = transcript;
        setRecordingPreview(transcript);
      }
    };
    recognition.onerror = () => {
      setMessage("Microphone dictation was not available in this browser.");
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      finishRecording(false);
    };
    recognition.start();
  }

  function stopRecording() {
    finishRecording(true);
  }

  async function summariseNotes() {
    if (!workNote.trim()) return;
    setSummarising(true);
    setAiSummary("");
    setMessage("");
    try {
      const result = await askAi(session, {
        question: `Summarise these Build Room notes into a clear proof update. Keep it specific, short, and useful. Notes:\n\n${workNote}`,
        pathway: data.profile?.pathway,
        mission: data.profile?.selected_mission,
        currentMonth: data.currentMonth.month,
        studentContext: data.profile?.profile_summary,
      });
      setAiSummary(result.answer);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI summary failed.");
    } finally {
      setSummarising(false);
    }
  }

  async function submitProof() {
    if (!proofTitle.trim()) return;
    setSavingProof(true);
    setMessage("");
    try {
      const result = await createPassportItem(session, {
        month: data.currentMonth.month,
        title: `Week ${currentWeek.week}: ${proofTitle}`,
        status: "submitted",
        evidenceUrl: proofUrl,
        notes: [
          `${currentWeek.format}: ${currentWeek.studentAction}`,
          proofNotes || workNote,
          attachments.length
            ? `Attached files: ${attachments.map((file) => file.name).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      setProofItems((current) => [
        result.passportItem,
        ...current.filter((item) => item.id !== result.passportItem.id),
      ]);
      onProofCreated(result.passportItem);
      setProofTitle("");
      setProofUrl("");
      setProofNotes("");
      setAttachments([]);
      setMessage("Proof saved to Builder Passport.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save proof.");
    } finally {
      setSavingProof(false);
    }
  }

  async function submitTutorRequest() {
    if (!question.trim()) return;
    await createTutorRequest(session, {
      question,
      context: [
        `Month ${data.currentMonth.month}: ${data.currentMonth.output}`,
        `Week ${currentWeek.week}: ${currentWeek.format}`,
        `Weekly action: ${currentWeek.studentAction}`,
        `Mission: ${data.profile?.selected_mission || "Not selected"}`,
        workNote ? `Student notes: ${workNote}` : "",
        selectedWeekProof.length
          ? `Selected week proof: ${selectedWeekProof.map((item) => item.title).join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    setQuestion("");
    setMessage("Tutor request submitted.");
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-3">
        <Panel title="Build Room" icon={ClipboardCheck}>
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            {data.currentMonth.weeks.map((week) => {
              const proofForWeek = proofItems.find((item) =>
                item.title.toLowerCase().includes(`week ${week.week}`),
              );
              const selected = week.week === currentWeek.week;
              const isNow = week.week === currentWeekNumber;
              return (
                <button
                  key={week.week}
                  onClick={() => {
                    setSelectedWeekNumber(week.week);
                    setTaskState(tasks.map((_, index) => index === 0));
                    setMessage("");
                  }}
                  className={`rounded-lg border p-3 text-left transition hover:border-[#fcb33b88] ${
                    selected
                      ? "border-[#fcb33b] bg-[#fcb33b18]"
                      : "border-white/10 bg-black/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                      Week {week.week}{isNow ? " - now" : ""}
                    </p>
                    <CheckCircle2
                      size={17}
                      className={proofForWeek ? "text-[#fcb33b]" : "text-white/25"}
                    />
                  </div>
                  <p className="mt-2 text-sm font-black">{week.format}</p>
                  <p className="mt-1 text-xs leading-5 text-[#c5bba8]">
                    {proofForWeek ? "Proof saved" : "Add proof"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 rounded-lg border border-[#fcb33b66] bg-[#fcb33b12] p-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#fcb33b]">
                Month {data.currentMonth.month} · Week {currentWeek.week} of 4
              </p>
              <h2 className="mt-2 text-3xl font-black">{currentWeek.format}</h2>
              <p className="mt-2 text-sm leading-6 text-[#c5bba8]">
                {currentWeek.studentAction}
              </p>
            </div>
            <div className="rounded-lg border border-[#fcb33b33] bg-black/25 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
                Week task progress
              </p>
              <p className="mt-2 text-4xl font-black">{progress}%</p>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#fcb33b]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ResultBlock title={`What is taught in Week ${currentWeek.week}`} text={currentWeek.taught} />
            <ResultBlock title="Monthly output" text={data.currentMonth.output} />
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {tasks.map((task, index) => (
              <button
                key={task}
                onClick={() =>
                  setTaskState((current) =>
                    current.map((done, taskIndex) => (taskIndex === index ? !done : done)),
                  )
                }
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  taskState[index]
                    ? "border-[#fcb33b66] bg-[#fcb33b12]"
                    : "border-white/10 bg-black/25 hover:border-[#fcb33b55]"
                }`}
              >
                <CheckCircle2
                  className={taskState[index] ? "text-[#fcb33b]" : "text-white/25"}
                  size={19}
                />
                <p className="text-sm font-bold leading-6">{task}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Working Notes" icon={FileText}>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={listening ? stopRecording : startRecording}
              disabled={!speechSupported}
              className="inline-flex items-center gap-2 rounded-lg border border-[#fcb33b44] px-3 py-2 text-xs font-black text-[#ffe0a3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mic size={15} />
              {listening
                ? `Stop recording ${formatRecordingTime(recordingSeconds)}`
                : "Start recording"}
            </button>
            <button
              onClick={summariseNotes}
              disabled={summarising || !workNote.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#fcb33b] px-3 py-2 text-xs font-black text-[#050606] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles size={15} />
              {summarising ? "Summarising..." : "AI summarise"}
            </button>
          </div>
          <textarea
            value={workNote}
            onChange={(event) => setWorkNote(event.target.value)}
            placeholder="Write what you are building, researching, validating, or still confused about..."
            className="min-h-36 w-full resize-none rounded-lg border border-[#fcb33b33] bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-[#8b806e] focus:border-[#fcb33b]"
          />
          {recordingPreview && (
            <div className="mt-3 rounded-lg border border-[#fcb33b33] bg-black/25 p-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
                Recording preview
              </p>
              <p className="mt-2 text-sm leading-6 text-[#d9c1a1]">
                {recordingPreview}
              </p>
            </div>
          )}
          {aiSummary && (
            <div className="mt-3 rounded-lg border border-[#fcb33b55] bg-[#fcb33b10] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
                AI summary suggestion
              </p>
              <div className="mt-2 text-sm leading-6 text-[#fff8ee]">
                <MarkdownText text={aiSummary} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setWorkNote(aiSummary);
                    setAiSummary("");
                  }}
                  className="rounded-lg bg-[#fcb33b] px-3 py-2 text-xs font-black text-[#050606]"
                >
                  Accept AI summary
                </button>
                <button
                  onClick={() => setAiSummary("")}
                  className="rounded-lg border border-[#fcb33b44] px-3 py-2 text-xs font-black text-[#fff8ee]"
                >
                  Keep my notes
                </button>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs font-bold text-[#c5bba8]">
            These notes are included when you ask a tutor for help. Microphone
            dictation depends on browser support.
          </p>
        </Panel>

        <Panel title="Add Proof" icon={ShieldCheck}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Proof title
              <input
                value={proofTitle}
                onChange={(event) => setProofTitle(event.target.value)}
                placeholder={`e.g. ${currentWeek.studentAction}`}
                className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm outline-none focus:border-[#fcb33b]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Link
              <input
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                placeholder="Google Doc, Drive, GitHub, Figma, video..."
                className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm outline-none focus:border-[#fcb33b]"
              />
            </label>
          </div>
          <textarea
            value={proofNotes}
            onChange={(event) => setProofNotes(event.target.value)}
            placeholder={`What does this prove for Week ${currentWeek.week}? What changed after mentor, AI, or user feedback?`}
            className="mt-3 min-h-24 w-full resize-none rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm leading-6 outline-none placeholder:text-[#8b806e] focus:border-[#fcb33b]"
          />
          <div className="mt-3 rounded-lg border border-[#fcb33b33] bg-black/25 p-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#fcb33b44] px-3 py-2 text-xs font-black text-[#ffe0a3]">
              <Paperclip size={15} />
              Add PDFs or images
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="hidden"
                onChange={(event) => addAttachments(event.target.files)}
              />
            </label>
            {attachments.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {attachments.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
                    {file.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.previewUrl}
                        alt={file.name}
                        className="mb-2 h-24 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mb-2 grid h-24 place-items-center rounded-lg bg-[#fcb33b12] text-xs font-black text-[#fcb33b]">
                        PDF
                      </div>
                    )}
                    <p className="truncate text-sm font-black">{file.name}</p>
                    <p className="mt-1 text-xs font-bold text-[#c5bba8]">
                      {Math.max(1, Math.round(file.size / 1024))} KB
                    </p>
                    <button
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.name !== file.name || item.size !== file.size),
                        )
                      }
                      className="mt-2 text-xs font-black text-[#ffe0a3]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={submitProof}
            disabled={savingProof || !proofTitle.trim()}
            className="mt-3 rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] disabled:opacity-60"
          >
            {savingProof ? "Saving proof..." : "Save proof to Passport"}
          </button>
        </Panel>
      </div>

      <aside className="grid content-start gap-3">
        <Panel title="Proof Added" icon={ShieldCheck}>
          <p className="mb-3 text-sm leading-6 text-[#c5bba8]">
            Showing Week {currentWeek.week} proof first. Switch weeks on the
            left to add or check earlier evidence.
          </p>
          <p className="hidden">
            Showing Month {data.currentMonth.month} proof. Add this week’s strongest
            evidence here, then it appears in Passport.
          </p>
          <div className="grid gap-2">
            {selectedWeekProof.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm leading-6 text-[#c5bba8]">
                No proof added for Week {currentWeek.week} yet. Add a link,
                notes, PDF, image, or draft when the work is good enough to show.
              </p>
            ) : (
              selectedWeekProof.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#fcb33b]">
                    {item.status.replace("_", " ")}
                  </p>
                  {item.evidence_url && (
                    <a
                      href={item.evidence_url}
                      target="_blank"
                      className="mt-2 block text-xs font-bold text-[#ffe0a3] underline underline-offset-4"
                    >
                      Open proof link
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Tutor Checkpoint" icon={UserRoundCheck}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What do you need a tutor to review?"
            className="min-h-28 w-full resize-none rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm leading-6 outline-none placeholder:text-[#8b806e] focus:border-[#fcb33b]"
          />
          <button
            onClick={submitTutorRequest}
            disabled={!question.trim()}
            className="mt-3 w-full rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] disabled:opacity-60"
          >
            Request tutor help
          </button>
          {data.calendarBookingUrl && (
            <a
              href={data.calendarBookingUrl}
              target="_blank"
              className="mt-2 block rounded-lg border border-[#fcb33b44] px-4 py-3 text-center text-sm font-black text-[#fff8ee]"
            >
              Open Google Calendar booking
            </a>
          )}
        </Panel>

        {message && (
          <p className="rounded-lg border border-[#fcb33b33] bg-[#fcb33b12] p-3 text-sm font-bold text-[#ffe0a3]">
            {message}
          </p>
        )}
      </aside>
    </div>
  );
}

function Passport({ data }: { data: BootstrapData }) {
  const currentWeek = getCurrentCalendarWeek();
  const completed = data.passportItems.filter((item) => item.status === "submitted" || item.status === "verified").length;
  const expectedProofCount = data.academyMonths.length * 4;
  const passportProgress = Math.round((completed / expectedProofCount) * 100);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const currentMonthProof = data.passportItems.filter((item) => item.month === data.currentMonth.month);

  return (
    <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Passport" icon={ShieldCheck}>
        <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-8 border-[#fcb33b] bg-black/30">
          <span className="text-4xl font-black">{passportProgress}%</span>
        </div>
        <p className="mt-4 text-center text-sm leading-6 text-[#c5bba8]">
          Weekly proof-of-work record across the 12-month Builder OS.
        </p>
        <div className="mt-4 rounded-lg border border-[#fcb33b33] bg-black/25 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
            Current checkpoint
          </p>
          <p className="mt-2 text-sm font-bold">
            Month {data.currentMonth.month}, Week {currentWeek}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#c5bba8]">
            {data.currentMonth.weeks[currentWeek - 1]?.studentAction}
          </p>
        </div>
      </Panel>

      <div className="grid gap-3">
        <Panel title="Current Month Proof" icon={FileText}>
          <div className="rounded-lg border border-[#fcb33b66] bg-[#fcb33b12] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
              Month {data.currentMonth.month} · Week {currentWeek}
            </p>
            <h2 className="mt-2 text-3xl font-black">{data.currentMonth.output}</h2>
            <p className="mt-2 text-sm leading-6 text-[#c5bba8]">
              {data.currentMonth.weeks[currentWeek - 1]?.studentAction}
            </p>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {data.currentMonth.weeks.map((week) => {
              const proofForWeek = currentMonthProof.find((item) =>
                item.title.toLowerCase().includes(`week ${week.week}`),
              );
              const activeWeek = week.week === currentWeek;
              return (
                <div
                  key={week.week}
                  className={`rounded-lg border p-3 ${
                    proofForWeek
                      ? "border-[#fcb33b66] bg-[#fcb33b12]"
                      : activeWeek
                        ? "border-[#fcb33b55] bg-black/30"
                        : "border-white/10 bg-black/25"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={proofForWeek ? "text-[#fcb33b]" : "text-white/25"}
                      size={17}
                    />
                    <p className="text-sm font-black">
                      Week {week.week}{activeWeek ? " · now" : ""}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-bold text-[#fcb33b]">
                    {week.format}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#c5bba8]">
                    {week.studentAction}
                  </p>
                  {proofForWeek && (
                    <p className="mt-2 text-xs font-black text-[#ffe0a3]">
                      {proofForWeek.title}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Other Months" icon={Map}>
          <div className="grid gap-2">
            {data.academyMonths.map((month) => {
            const monthProof = data.passportItems.filter((item) => item.month === month.month);
            const isCurrentMonth = month.month === data.currentMonth.month;
            const expanded = openMonth === month.month;
            return (
              <article
                key={month.month}
                className={`rounded-lg border p-3 ${
                  isCurrentMonth ? "border-[#fcb33b66] bg-[#fcb33b10]" : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                      Month {month.month}
                    </p>
                    <h3 className="mt-1 text-lg font-black">{month.output}</h3>
                  </div>
                  <p className="rounded-lg border border-[#fcb33b33] bg-black/25 px-3 py-2 text-xs font-black text-[#ffe0a3]">
                    {monthProof.length}/4 proof items
                  </p>
                </div>

                <button
                  onClick={() => setOpenMonth((current) => (current === month.month ? null : month.month))}
                  className="mt-3 rounded-lg border border-[#fcb33b44] px-3 py-2 text-xs font-black text-[#ffe0a3]"
                >
                  {expanded ? "Hide weekly proof" : "View weekly proof"}
                </button>

                {expanded && (
                  <div className="mt-3 grid gap-2 md:grid-cols-4">
                    {month.weeks.map((week) => {
                      const proofForWeek = monthProof.find((item) =>
                        item.title.toLowerCase().includes(`week ${week.week}`),
                      );
                      return (
                        <div key={week.week} className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              className={proofForWeek ? "text-[#fcb33b]" : "text-white/25"}
                              size={17}
                            />
                            <p className="text-sm font-black">Week {week.week}</p>
                          </div>
                          <p className="mt-2 text-xs font-bold text-[#fcb33b]">
                            {week.format}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#c5bba8]">
                            {proofForWeek?.title ?? week.studentAction}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Onboarding({ data, session, onDone }: { data: BootstrapData; session: Session; onDone: () => void }) {
  const initialQuestion =
    "Welcome to Reactor AI Onboarding. I’ll help place you into the right builder pathway. First: what frontier areas are you most curious about, and what have you already built, researched, led, or explored?";
  const [turns, setTurns] = useState<OnboardingTurn[]>([
    { role: "assistant", content: initialQuestion },
  ]);
  const [answer, setAnswer] = useState("");
  const [selectedFrontier, setSelectedFrontier] = useState(frontierDomains[0].domain);
  const [aiResult, setAiResult] = useState<OnboardingResult | null>(null);
  const [pathway, setPathway] = useState<PathwayId>("founder");
  const [mission, setMission] = useState(data.missions[0]?.title ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function sendAnswer() {
    if (!answer.trim()) return;
    const studentAnswer =
      turns.filter((turn) => turn.role === "student").length === 0
        ? `Chosen deep tech focus: ${selectedFrontier}\n\n${answer.trim()}`
        : answer.trim();

    const nextTurns: OnboardingTurn[] = [
      ...turns,
      { role: "student", content: studentAnswer },
    ];
    setTurns(nextTurns);
    setAnswer("");
    setLoading(true);
    setError("");

    try {
      const result = await runOnboardingAi(session, nextTurns);
      setAiResult(result);

      if (result.stage === "question" && result.question) {
        setTurns([
          ...nextTurns,
          { role: "assistant", content: result.question },
        ]);
      }

      if (result.stage === "recommendation" && result.recommendation) {
        setPathway(result.recommendation.pathway);
        setMission(result.recommendation.mission);
        setTurns([
          ...nextTurns,
          {
            role: "assistant",
            content: `${result.message}\n\nRecommendation: ${result.recommendation.pathway} pathway with "${result.recommendation.mission}". ${result.recommendation.reasoning}`,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI onboarding failed");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!aiResult?.recommendation) return;
    setSaving(true);
    const frontierInterests = [
      selectedFrontier,
      ...aiResult.recommendation.frontierInterests.filter(
        (item) => item.toLowerCase() !== selectedFrontier.toLowerCase(),
      ),
    ];
    await saveOnboarding(session, {
      frontierInterests,
      skills: aiResult.recommendation.skills,
      learningStyle: aiResult.recommendation.learningStyle,
      confidenceLevel: aiResult.recommendation.confidenceLevel,
      weeklyCommitmentHours: aiResult.recommendation.weeklyCommitmentHours,
      longTermGoal: aiResult.recommendation.longTermGoal,
      recommendedPathway: pathway,
      selectedMission: mission,
      profileSummary: aiResult.recommendation.profileSummary,
    });
    await onDone();
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Reactor AI Onboarding" icon={Sparkles}>
        <p className="max-w-3xl text-sm leading-6 text-[#c5bba8]">
          First choose a deep tech focus. Reactor AI will then ask a few
          high-signal questions, recommend a pathway and mission, then let the
          student make the final choice.
        </p>

        <div className="mt-4 rounded-lg border border-[#fcb33b33] bg-black/20 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fcb33b]">
            Step 1 · Choose deep tech focus
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {frontierDomains.map((item) => (
              <button
                key={item.domain}
                onClick={() => setSelectedFrontier(item.domain)}
                className={`rounded-lg border p-3 text-left transition ${
                  selectedFrontier === item.domain
                    ? "border-[#fcb33b] bg-[#fcb33b12]"
                    : "border-white/10 bg-black/25 hover:border-[#fcb33b66]"
                }`}
              >
                <p className="text-sm font-black">{item.domain}</p>
                <p className="mt-1 text-xs leading-5 text-[#c5bba8]">
                  {item.signal}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto rounded-lg border border-[#fcb33b33] bg-black/20 p-3">
          {turns.map((turn, index) => (
            <div
              key={`${turn.role}-${index}`}
              className={`rounded-lg border p-3 ${
                turn.role === "assistant"
                  ? "border-[#fcb33b44] bg-[#fcb33b12]"
                  : "ml-auto max-w-[86%] border-white/10 bg-white/[0.06]"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                {turn.role === "assistant" ? "Reactor AI" : "Student"}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6">
                {turn.content}
              </p>
            </div>
          ))}
        </div>

        {aiResult?.stage !== "recommendation" && (
          <div className="mt-3">
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Reply to Reactor AI..."
              className="min-h-28 w-full resize-none rounded-lg border border-[#fcb33b33] bg-black/30 p-3 text-sm outline-none focus:border-[#fcb33b]"
            />
            <button
              onClick={sendAnswer}
              disabled={loading || !answer.trim()}
              className="mt-3 rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] disabled:opacity-60"
            >
              {loading ? "Reactor AI is thinking..." : "Send answer"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </p>
        )}
      </Panel>

      <Panel title="Final Choice" icon={Compass}>
        {aiResult?.recommendation ? (
          <>
            <p className="rounded-lg border border-[#fcb33b33] bg-black/25 p-3 text-sm leading-6 text-[#ffe0a3]">
              Deep tech focus: <span className="font-black">{selectedFrontier}</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-[#c5bba8]">
              AI recommendation confidence:{" "}
              <span className="font-black text-[#fcb33b]">
                {aiResult.recommendation.confidence}/5
              </span>
            </p>
            <p className="mt-3 rounded-lg border border-[#fcb33b33] bg-black/25 p-3 text-sm leading-6 text-[#ffe0a3]">
              {aiResult.recommendation.reasoning}
            </p>
            <label className="mt-4 grid gap-2 text-sm font-bold">
              Choose pathway
              <select
                value={pathway}
                onChange={(event) => setPathway(event.target.value as PathwayId)}
                className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 outline-none"
              >
                {data.pathways.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 grid gap-2 text-sm font-bold">
              Choose mission
              <select
                value={mission}
                onChange={(event) => setMission(event.target.value)}
                className="rounded-lg border border-[#fcb33b33] bg-black/30 p-3 outline-none"
              >
                {data.missions.map((item) => (
                  <option key={item.id} value={item.title}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={submit}
              disabled={saving}
              className="mt-4 w-full rounded-lg bg-[#fcb33b] px-4 py-3 text-sm font-black text-[#050606] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Start Builder OS"}
            </button>
          </>
        ) : (
          <p className="text-sm leading-6 text-[#c5bba8]">
            Once Reactor AI has enough information, the pathway and mission
            recommendation will appear here. The student still makes the final
            choice.
          </p>
        )}
      </Panel>
    </div>
  );
}

function EnrollmentGate({ email }: { email: string }) {
  return (
    <SetupProblem
      title="You are signed in, but not enrolled yet"
      message={`Your Google account ${email || ""} does not have an active enrollment row in Supabase. Add this user to the enrollments table with status active.`}
    />
  );
}

function SetupProblem({ message, title = "Setup needed" }: { message: string; title?: string }) {
  return (
    <Panel title={title} icon={AlertCircle}>
      <p className="max-w-3xl text-sm leading-6 text-[#c5bba8]">{message}</p>
      <p className="mt-4 rounded-lg border border-[#fcb33b33] bg-black/25 p-4 text-sm text-[#ffe0a3]">
        This means the Supabase SQL schema has not been run yet. Open Supabase SQL Editor and run
        `D:\MON3750\Reactor_Academy_app\reactor-academy\supabase\schema.sql`.
      </p>
    </Panel>
  );
}

function Panel({ title, icon: Icon, children }: { title?: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="app-surface group relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition duration-200 hover:border-[#fcb33b44] md:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#fcb33b33] to-transparent opacity-50" />
      {title && Icon && (
        <div className="mb-4 flex items-center gap-3">
          <div className="app-accent app-accent-soft rounded-xl p-2 transition group-hover:scale-105"><Icon size={19} /></div>
          <h2 className="text-xl font-black text-[#f7efe2]">{title}</h2>
        </div>
      )}
      {children}
    </section>
  );
}

function ActionCard({ icon: Icon, title, text, onClick }: { icon: LucideIcon; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="app-border app-muted-surface group rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:bg-[var(--accent-soft)]">
      <div className="flex items-center justify-between gap-3">
        <Icon className="app-accent transition group-hover:scale-110" size={22} />
        <ArrowRight className="text-[#fcb33b66] transition group-hover:translate-x-1 group-hover:text-[#fcb33b]" size={17} />
      </div>
      <p className="mt-3 font-black text-[#f7efe2] group-hover:text-[#f0ad3d]">{title}</p>
      <p className="app-muted-text mt-1 text-sm leading-6">{text}</p>
    </button>
  );
}

function ResultBlock({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-[#fcb33b33]"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ad3d]">{title}</p><p className="mt-2 text-sm leading-6 text-[#f7efe2]">{text}</p></div>;
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-[#fcb33b33]"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ad3d]">{title}</p><ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-[#d4c5ad]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0ad3d]" /> <span>{item}</span></li>)}</ul></div>;
}

function ChatBubble({
  role,
  text,
  ai = false,
}: {
  role: string;
  text: string;
  ai?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        ai
          ? "border-[#fcb33b44] bg-[#fcb33b12]"
          : "ml-auto max-w-[88%] border-white/10 bg-white/[0.06]"
      }`}
    >
      <p className="app-accent text-xs font-black uppercase tracking-[0.14em]">
        {role}
      </p>
      {ai ? (
        <MarkdownText text={text} />
      ) : (
        <p className="mt-2 whitespace-pre-line text-sm leading-6">
          {text}
        </p>
      )}
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      <ul key={`list-${blocks.length}`} className="mt-2 space-y-1 pl-4">
        {items.map((item) => (
          <li key={item} className="list-disc text-sm leading-6 text-[#fff8ee]">
            <InlineMarkdown text={item} />
          </li>
        ))}
      </ul>,
    );
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    if (line === "---") {
      flushList();
      blocks.push(
        <hr key={`hr-${index}`} className="my-4 border-[#fcb33b33]" />,
      );
      return;
    }

    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    const numbered = line.match(/^\d+\.\s+(.+)/);
    if (numbered) {
      flushList();
      blocks.push(
        <h3
          key={`h-${index}`}
          className="mt-4 text-base font-black text-[#ffe0a3]"
        >
          <InlineMarkdown text={numbered[1]} />
        </h3>,
      );
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${index}`} className="mt-2 text-sm leading-6 text-[#fff8ee]">
        <InlineMarkdown text={line.replace(/^#+\s*/, "")} />
      </p>,
    );
  });

  flushList();

  return <div className="mt-2">{blocks}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return (
    <>
      {parts.map((part, index) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
          return (
            <strong key={`${part}-${index}`} className="font-black text-white">
              {bold[1]}
            </strong>
          );
        }

        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return (
            <a
              key={`${part}-${index}`}
              href={link[2]}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#fcb33b] underline decoration-[#fcb33b66] underline-offset-4"
            >
              {link[1]}
            </a>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function DeepDiveCards({
  items,
}: {
  items: { level: string; title: string; url?: string; why: string }[];
}) {
  return (
    <div className="rounded-lg border border-[#fcb33b33] bg-black/25 p-4">
      <p className="flex items-center gap-2 text-sm font-black text-[#fcb33b]">
        <Sparkles size={16} /> Suggested Deep Dives
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {items.map((item) => {
          const href =
            item.url ||
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
              item.title,
            )}`;
          return (
            <a
              key={`${item.level}-${item.title}`}
              href={href}
              target="_blank"
              className="group rounded-lg border border-white/10 bg-white/[0.05] p-3 transition hover:border-[#fcb33b88] hover:bg-[#fcb33b12]"
            >
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fcb33b]">
                {item.level}
              </p>
              <p className="mt-2 text-sm font-bold group-hover:text-[#fcb33b]">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#c5bba8]">
                {item.why}
              </p>
              <p className="mt-3 text-xs font-black text-[#ffe0a3]">
                Open resource
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ReactorGuideAvatar({
  thinking = false,
  small = false,
}: {
  thinking?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`relative grid place-items-center ${
        small ? "h-12 w-12" : "h-24 w-24"
      }`}
    >
      <div
        className={`absolute inset-0 rounded-full border border-[#fcb33b55] ${
          thinking ? "animate-ping" : "animate-pulse"
        }`}
      />
      <div className="absolute inset-2 rounded-full bg-[#fcb33b1f] blur-sm" />
      <div
        className={`relative grid place-items-center rounded-full bg-[#fcb33b] text-[#050606] shadow-[0_18px_38px_rgba(252,179,59,0.22)] ${
          small ? "h-10 w-10" : "h-20 w-20"
        }`}
      >
        <Bot size={small ? 19 : 34} />
      </div>
      {!small && (
        <>
          <span className="absolute right-2 top-4 h-2 w-2 rounded-full bg-[#fff8ee]" />
          <span className="absolute bottom-5 left-3 h-2 w-2 rounded-full bg-[#fcb33b]" />
        </>
      )}
    </div>
  );
}

function TabButton({ tab, active, onClick }: { tab: { id: TabId; label: string; hint: string; icon: LucideIcon }; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`group relative flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-bold transition ${active ? "border-[#fcb33b44] bg-[#fcb33b18] text-[#f7efe2]" : "border-transparent text-[#bcb2a2] hover:border-[#fcb33b22] hover:bg-[#fcb33b0d] hover:text-[#f7efe2]"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl transition ${active ? "bg-[#f0ad3d] text-[#111413]" : "bg-white/[0.04] group-hover:bg-[#fcb33b18]"}`}>
        <tab.icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block">{tab.label}</span>
        <span className={`block truncate text-[11px] font-bold ${active ? "text-[#d4c5ad]" : "text-[#8f8779]"}`}>
          {tab.hint}
        </span>
      </span>
      {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#f0ad3d]" />}
    </button>
  );
}

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-lg border border-[#fcb33b33] bg-[#fcb33b0d] px-3 py-2 text-xs font-black text-[#d4c5ad] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"><Icon size={14} />{children}</span>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="app-accent-bg grid h-10 w-10 place-items-center rounded-xl text-lg font-black shadow-[0_10px_24px_rgba(240,173,61,0.12)]">R</div>
      {!compact && <div><p className="text-sm font-black leading-4">Reactor Academy</p><p className="app-soft-text text-xs">Frontier Builder OS</p></div>}
    </div>
  );
}

function Background() {
  return (
    <>
      <div className="app-bg-gradient pointer-events-none fixed inset-0" />
      <div className="app-dots pointer-events-none fixed inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.62)_0_1px,transparent_1.4px),radial-gradient(circle,rgba(252,179,59,0.5)_0_1px,transparent_1.3px)] [background-position:0_0,32px_18px] [background-size:74px_74px,118px_118px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-[#fcb33b14] to-transparent" />
    </>
  );
}

function FullScreenState({ icon: Icon, title, spin = false }: { icon: LucideIcon; title: string; spin?: boolean }) {
  return (
    <main className="app-bg grid min-h-screen place-items-center">
      <Background />
      <div className="app-surface relative rounded-lg border p-8 text-center">
        <Icon className={`app-accent mx-auto ${spin ? "animate-spin" : ""}`} size={34} />
        <p className="mt-4 text-xl font-black">{title}</p>
      </div>
    </main>
  );
}
