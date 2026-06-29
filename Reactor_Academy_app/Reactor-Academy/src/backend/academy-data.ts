export type PathwayId = "founder" | "researcher" | "operator" | "enterprise";

export type AcademyMonth = {
  month: number;
  phase: string;
  title: string;
  theme: string;
  output: string;
  task: string;
  weeks: {
    week: number;
    format: string;
    taught: string;
    studentAction: string;
  }[];
  pathwayOutputs: Record<PathwayId, string>;
};

export const pathways = [
  {
    id: "founder",
    name: "Founder Pathway",
    goal: "Build a deep tech startup",
    finalOutput: "Investor pitch deck, prototype, pilot plan, validation evidence",
  },
  {
    id: "researcher",
    name: "Researcher Pathway",
    goal: "Build frontier knowledge",
    finalOutput: "Preliminary thesis, research proposal, methodology, expert feedback",
  },
  {
    id: "operator",
    name: "Operator / Investor Pathway",
    goal: "Build the ecosystem around deep tech",
    finalOutput: "Venture thesis, investment memo, market map, operator playbook",
  },
  {
    id: "enterprise",
    name: "Enterprise Talent Pathway",
    goal: "Secure a deep tech career at an industry sponsor",
    finalOutput:
      "Corporate challenge portfolio, verified skills dashboard, final interview presentation",
  },
] as const;

export const missions = [
  {
    id: "climate-intelligence",
    title: "Climate intelligence for SME energy efficiency",
    domain: "Climate tech and AI",
    sponsorFit: "Energy operators, sustainability teams, corporate innovation",
  },
  {
    id: "factory-ai-agents",
    title: "AI agents for factory productivity",
    domain: "AI agents and advanced manufacturing",
    sponsorFit: "Manufacturing sponsors, automation teams, operations leaders",
  },
  {
    id: "quantum-security",
    title: "Quantum security for financial systems",
    domain: "Quantum security and cybersecurity",
    sponsorFit: "Banks, cybersecurity teams, infrastructure partners",
  },
  {
    id: "agri-robotics",
    title: "Robotics for agriculture",
    domain: "Robotics and food systems",
    sponsorFit: "Agri-tech operators, robotics labs, supply chain teams",
  },
] as const;

const monthBase = [
  ["Frontier Sensing", "Where is the future being built?", "Frontier Curiosity Map"],
  ["Industry Problem Discovery", "What problems are worth solving?", "Problem Discovery Brief"],
  ["Builder Pathway and Team Formation", "What kind of builder will I become?", "Builder Thesis Brief"],
  ["Technical Foundations and Risk Mapping", "What must be true for this to work?", "Risk and Evidence Map"],
  ["Build Sprint 1", "Build the first version.", "Version 0 Artifact"],
  ["Mid-Year Proof Gate", "Kill, pivot, or double down.", "Mid-Year Proof Package"],
  ["External Validation", "Talk to the real world.", "External Validation Notes"],
  ["Pilot, Research, or Market Design", "Design the next real-world test.", "Pathway Validation Plan"],
  ["Industry Validation Gate", "Can this become real?", "Industry Validation Report"],
  ["Packaging and Storytelling", "Turn the work into a compelling story.", "Final Output Draft 1"],
  ["Readiness Sprint", "Prepare for the real opportunity.", "Reactor Assembly Package"],
  ["Reactor Assembly and Pathway Matching", "Show proof of work. Enter the ecosystem.", "Final Builder Passport"],
] as const;

const weeklyPlans: Record<number, AcademyMonth["weeks"]> = {
  1: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Introduction to frontier technology and the Builder mindset",
      studentAction: "Create personal Builder Profile",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "How to spot emerging technology signals",
      studentAction: "Map 3 frontier domains of interest",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Practitioner briefing: what industry is building now",
      studentAction: "Ask questions and identify possible problems",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Reflection and synthesis",
      studentAction: "Submit Frontier Curiosity Map",
    },
  ],
  2: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Problem framing and stakeholder mapping",
      studentAction: "Choose 2 Reactor Missions to explore",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Customer and expert interview basics",
      studentAction: "Prepare interview questions",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Industry sponsor challenge session",
      studentAction: "Interview mentors, users, or industry guests",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Problem synthesis",
      studentAction: "Submit Problem Discovery Brief",
    },
  ],
  3: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "The three builder pathways",
      studentAction: "Choose preferred pathway",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Team formation and role design",
      studentAction: "Pitch yourself during Builder Draft Day",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Project scoping and milestone planning",
      studentAction: "Form teams or working groups",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Mentor review",
      studentAction: "Submit Builder Thesis Brief",
    },
  ],
  4: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Technical readiness and risk",
      studentAction: "Identify key assumptions",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "IP, defensibility, ethics, regulation",
      studentAction: "Map legal and ethical risks",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Pathway studio",
      studentAction: "Build pathway-specific evidence plan",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Mentor review",
      studentAction: "Submit Risk and Evidence Map",
    },
  ],
  5: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Rapid prototyping and experiment design",
      studentAction: "Start first build or research sprint",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Documentation and evidence collection",
      studentAction: "Produce first artifact",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Mentor clinic",
      studentAction: "Receive technical or strategic feedback",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Iteration sprint",
      studentAction: "Submit Version 0 artifact",
    },
  ],
  6: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Evidence review and decision-making",
      studentAction: "Prepare proof presentation",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Pitching technical work simply",
      studentAction: "Rehearse with peers",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Mid-Year Proof Panel",
      studentAction: "Present to mentors and industry reviewers",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Decision and reset",
      studentAction: "Submit revised 6-month plan",
    },
  ],
  7: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Interviewing and validation methods",
      studentAction: "Build interview list",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Customer, expert, or investor discovery",
      studentAction: "Conduct first interviews",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Industry mentor clinic",
      studentAction: "Review interview insights",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Insight synthesis",
      studentAction: "Submit External Validation Notes",
    },
  ],
  8: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Pilot design and research planning",
      studentAction: "Design next external test",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Commercialisation and partnership models",
      studentAction: "Build pathway roadmap",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Sponsor or expert review",
      studentAction: "Present roadmap for feedback",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Revision sprint",
      studentAction: "Submit Pilot / Research / Market Plan",
    },
  ],
  9: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Evidence synthesis",
      studentAction: "Prepare validation report",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Storytelling with data",
      studentAction: "Build presentation",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Industry Validation Panel",
      studentAction: "Present to external reviewers",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Pathway decision",
      studentAction: "Submit final three-month plan",
    },
  ],
  10: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Deep tech storytelling",
      studentAction: "Build narrative",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Visual and executive communication",
      studentAction: "Create first final-output draft",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Mentor review",
      studentAction: "Receive feedback",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Revision sprint",
      studentAction: "Submit Final Output Draft 1",
    },
  ],
  11: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Investor, research, and ecosystem readiness",
      studentAction: "Prepare pathway package",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Financial model, grant, or memo clinic",
      studentAction: "Build technical documents",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Mock panel",
      studentAction: "Present to mentors",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Final revisions",
      studentAction: "Submit Reactor Assembly package",
    },
  ],
  12: [
    {
      week: 1,
      format: "Frontier Briefing",
      taught: "Final pitch and Q&A training",
      studentAction: "Final rehearsal",
    },
    {
      week: 2,
      format: "Pathway Studio",
      taught: "Reactor Assembly",
      studentAction: "Present proof of work",
    },
    {
      week: 3,
      format: "Industry / Mentor Clinic",
      taught: "Pathway matching",
      studentAction: "Meet investors, labs, companies, mentors",
    },
    {
      week: 4,
      format: "Build Sprint and Submission",
      taught: "Reflection and next-step planning",
      studentAction: "Submit final Builder Passport",
    },
  ],
};

export const academyMonths: AcademyMonth[] = monthBase.map(
  ([title, theme, output], index) => {
    const month = index + 1;
    return {
      month,
      phase:
        month <= 3
          ? "Frontier Discovery and Builder Formation"
          : month <= 6
            ? "Technical Proof and Knowledge Building"
            : month <= 9
              ? "Industry Validation and External Testing"
              : "Pathway Readiness and Reactor Assembly",
      title,
      theme,
      output,
      task:
        month === 1
          ? "Map frontier domains, industries, problems, and early pathway preference."
          : month === 2
            ? "Choose 1-2 Reactor Missions and prepare interviews with users, experts, or mentors."
            : month === 3
              ? "Choose pathway, mission, team role, key risks, and Month 6/9/12 targets."
            : `Complete and submit ${output} for the official Reactor timeline.`,
      weeks: weeklyPlans[month],
      pathwayOutputs: {
        founder: `${output} translated into startup evidence, prototype direction, customer proof, or investor readiness.`,
        researcher: `${output} translated into research evidence, literature direction, methodology, or expert feedback.`,
        operator: `${output} translated into market evidence, venture thesis, investment memo, or ecosystem playbook.`,
        enterprise: `${output} translated into sponsor challenge evidence, skills dashboard, technical portfolio, or interview readiness.`,
      },
    };
  },
);

export function getCurrentAcademyMonth(month = 2) {
  return academyMonths.find((item) => item.month === month) ?? academyMonths[0];
}
