export type Interest =
  | "Web Development"
  | "Backend Development"
  | "Graphics and Design"
  | "AI and Data"
  | "Engineering"
  | "Cloud and DevOps"
  | "Programming Languages";

export type WebTrack =
  | "Frontend Development"
  | "Fullstack Foundations"
  | "React and Modern UI";

export type BackendTrack =
  | "Backend with Python"
  | "Backend with JavaScript";

export type DesignTrack =
  | "UI/UX Design"
  | "Graphics Design"
  | "Video Editing"
  | "Figma Mastery";

export type DataTrack =
  | "Data Analysis"
  | "Artificial Intelligence"
  | "AI Automation";

export type EngineeringTrack =
  | "3D Modeling"
  | "SolidWorks"
  | "Engineering Design Systems";

export type CloudTrack =
  | "Cloud Foundations"
  | "DevOps Engineering"
  | "Cloud Automation";

export type LanguageTrack =
  | "JavaScript"
  | "Python"
  | "TypeScript"
  | "SQL";

export type TrackName =
  | WebTrack
  | BackendTrack
  | DesignTrack
  | DataTrack
  | EngineeringTrack
  | CloudTrack
  | LanguageTrack;

export type UserPlan = "free" | "pro" | "premium";
export type UserRole = "student" | "admin" | "teacher";
export type LessonStatus = "completed" | "unlocked" | "locked";
export type CourseAccess = "free" | "paid";
export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: "assessment" | "project";
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  status: LessonStatus;
  videoId: string;
  description: string;
}

export interface Module {
  id: string;
  title: string;
  week: number;
  lessons: Lesson[];
  assessment: Assessment;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  totalLessons: number;
  completedLessons: number;
  cover: string;
  modules: Module[];
  interest: Interest;
  track: TrackName;
  access: CourseAccess;
  availableOn?: Weekday;
  rating: number;
  learners: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  featured?: boolean;
  tags: string[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  tag: "update" | "event" | "release";
}

export interface PricingPlan {
  id: UserPlan;
  title: string;
  price: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export interface QuizShopItem {
  id: string;
  title: string;
  cost: number;
  rarity: "Rare" | "Epic" | "Legendary";
  reward: string;
  description: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  kind: "course" | "reward" | "message";
  read: boolean;
  time: string;
}

export interface LearningBranch {
  title: TrackName;
  summary: string;
  tools: string[];
  weeklyFocus: string[];
}

export interface AcademyProgram {
  id: string;
  title: Interest;
  description: string;
  cover: string;
  iconLabel: string;
  branches: LearningBranch[];
}

export const interests: Interest[] = [
  "Web Development",
  "Backend Development",
  "Graphics and Design",
  "AI and Data",
  "Engineering",
  "Cloud and DevOps",
  "Programming Languages",
];

export const trackOptionsByInterest: Record<Interest, TrackName[]> = {
  "Web Development": [
    "Frontend Development",
    "Fullstack Foundations",
    "React and Modern UI",
  ],
  "Backend Development": ["Backend with Python", "Backend with JavaScript"],
  "Graphics and Design": [
    "UI/UX Design",
    "Graphics Design",
    "Video Editing",
    "Figma Mastery",
  ],
  "AI and Data": ["Data Analysis", "Artificial Intelligence", "AI Automation"],
  Engineering: ["3D Modeling", "SolidWorks", "Engineering Design Systems"],
  "Cloud and DevOps": ["Cloud Foundations", "DevOps Engineering", "Cloud Automation"],
  "Programming Languages": ["JavaScript", "Python", "TypeScript", "SQL"],
};

function buildLessons(
  prefix: string,
  titles: string[],
  unlockedThru: number,
  completedThru: number,
): Lesson[] {
  return titles.map((title, index) => ({
    id: `${prefix}-l${index + 1}`,
    title,
    duration: `${12 + ((index * 6) % 22)} min`,
    status:
      index < completedThru
        ? "completed"
        : index < unlockedThru
          ? "unlocked"
          : "locked",
    videoId: "dQw4w9WgXcQ",
    description:
      "A guided lesson with examples, breakdowns, and a practical task to reinforce the concept.",
  }));
}

function buildModules(
  prefix: string,
  weeks: Array<{
    title: string;
    lessons: string[];
    assessment: string;
    completedLessons: number;
    unlockedLessons: number;
  }>,
): Module[] {
  return weeks.map((week, index) => ({
    id: `${prefix}-w${index + 1}`,
    title: week.title,
    week: index + 1,
    lessons: buildLessons(
      `${prefix}-w${index + 1}`,
      week.lessons,
      week.unlockedLessons,
      week.completedLessons,
    ),
    assessment: {
      id: `${prefix}-a${index + 1}`,
      title: index === weeks.length - 1 ? "Capstone project" : `Week ${index + 1} assessment`,
      description: week.assessment,
      type: index === weeks.length - 1 ? "project" : "assessment",
    },
  }));
}

export const academyPrograms: AcademyProgram[] = [
  {
    id: "web-development",
    title: "Web Development",
    description:
      "A complete path for learners who want to build websites, user interfaces, and real-world web apps.",
    cover: "from-primary via-primary-glow to-accent",
    iconLabel: "WD",
    branches: [
      {
        title: "Frontend Development",
        summary: "HTML, CSS, JavaScript, responsive layouts, and frontend project delivery.",
        tools: ["HTML", "CSS", "JavaScript", "React"],
        weeklyFocus: [
          "Week 1: HTML and CSS basics",
          "Week 2: Responsive layouts and design systems",
          "Week 3: JavaScript interactivity",
          "Week 4: React foundations",
          "Week 5: Components and state",
          "Week 6: Portfolio project",
        ],
      },
      {
        title: "Fullstack Foundations",
        summary: "Connect frontend thinking with APIs, databases, auth, and deployment basics.",
        tools: ["React", "Node.js", "REST", "Deployment"],
        weeklyFocus: [
          "Week 1: Request-response model",
          "Week 2: Frontend to backend communication",
          "Week 3: Auth and forms",
          "Week 4: Database basics",
          "Week 5: Fullstack integration",
          "Week 6: Build and deploy",
        ],
      },
      {
        title: "React and Modern UI",
        summary: "A specialized branch for modern product UIs, design systems, and animation.",
        tools: ["React", "Next.js", "Tailwind", "Framer Motion"],
        weeklyFocus: [
          "Week 1: React core concepts",
          "Week 2: Component architecture",
          "Week 3: State and async data",
          "Week 4: Design systems",
          "Week 5: Motion and UX polish",
          "Week 6: Premium UI build",
        ],
      },
    ],
  },
  {
    id: "backend-development",
    title: "Backend Development",
    description:
      "Learn server-side engineering with clear branches for Python and JavaScript backend careers.",
    cover: "from-sky-500 via-primary to-slate-900",
    iconLabel: "BE",
    branches: [
      {
        title: "Backend with Python",
        summary: "Python, Django, FastAPI, APIs, auth, and backend architecture.",
        tools: ["Python", "Django", "FastAPI", "PostgreSQL"],
        weeklyFocus: [
          "Week 1: Python for backend thinking",
          "Week 2: APIs and routing",
          "Week 3: Models and databases",
          "Week 4: Auth and permissions",
          "Week 5: Django and FastAPI projects",
          "Week 6: Backend capstone",
        ],
      },
      {
        title: "Backend with JavaScript",
        summary: "JavaScript backend engineering with Node.js, Express, auth, and data modeling.",
        tools: ["JavaScript", "Node.js", "Express", "MongoDB"],
        weeklyFocus: [
          "Week 1: JavaScript for servers",
          "Week 2: Express and routing",
          "Week 3: CRUD and APIs",
          "Week 4: Auth and middleware",
          "Week 5: Databases and scaling",
          "Week 6: Backend capstone",
        ],
      },
    ],
  },
  {
    id: "graphics-and-design",
    title: "Graphics and Design",
    description:
      "A creative category covering interface design, brand graphics, editing workflows, and visual production.",
    cover: "from-orange-400 via-accent to-rose-500",
    iconLabel: "GD",
    branches: [
      {
        title: "UI/UX Design",
        summary: "Research, interface design, wireframes, prototypes, and user-centered product thinking.",
        tools: ["Figma", "UX Research", "Wireframing", "Prototyping"],
        weeklyFocus: [
          "Week 1: UX basics and user flows",
          "Week 2: Wireframes and layout",
          "Week 3: UI systems and hierarchy",
          "Week 4: Prototyping",
          "Week 5: Testing and iteration",
          "Week 6: Product case study",
        ],
      },
      {
        title: "Graphics Design",
        summary: "Design visual assets, social graphics, and brand systems with modern creative tools.",
        tools: ["Photoshop", "Illustrator", "Brand Design", "Composition"],
        weeklyFocus: [
          "Week 1: Visual principles",
          "Week 2: Typography and color",
          "Week 3: Social design assets",
          "Week 4: Brand systems",
          "Week 5: Campaign design",
          "Week 6: Portfolio pack",
        ],
      },
      {
        title: "Video Editing",
        summary: "Learn editing flow, motion pacing, storytelling, and content polish for digital products.",
        tools: ["Premiere Pro", "CapCut", "After Effects", "Storyboarding"],
        weeklyFocus: [
          "Week 1: Editing foundations",
          "Week 2: Cut structure and pacing",
          "Week 3: Color and sound",
          "Week 4: Motion text",
          "Week 5: Brand editing workflow",
          "Week 6: Reel project",
        ],
      },
      {
        title: "Figma Mastery",
        summary: "Specialize in Figma for components, tokens, collaboration, and design operations.",
        tools: ["Figma", "Auto Layout", "Design Tokens", "Components"],
        weeklyFocus: [
          "Week 1: Figma workspace mastery",
          "Week 2: Components and variants",
          "Week 3: Design tokens",
          "Week 4: Collaboration and handoff",
          "Week 5: Systemized design",
          "Week 6: Figma systems project",
        ],
      },
    ],
  },
  {
    id: "ai-and-data",
    title: "AI and Data",
    description:
      "Data, machine learning, AI workflows, and automation paths for analytical and AI-driven careers.",
    cover: "from-emerald-400 via-primary-glow to-primary",
    iconLabel: "AI",
    branches: [
      {
        title: "Data Analysis",
        summary: "Learn analysis, reporting, SQL, spreadsheets, and storytelling with data.",
        tools: ["Excel", "SQL", "Python", "Power BI"],
        weeklyFocus: [
          "Week 1: Data fundamentals",
          "Week 2: SQL and querying",
          "Week 3: Cleaning and exploration",
          "Week 4: Dashboards",
          "Week 5: Storytelling and insights",
          "Week 6: Analysis project",
        ],
      },
      {
        title: "Artificial Intelligence",
        summary: "Core AI concepts, Python tooling, model thinking, and responsible AI workflows.",
        tools: ["Python", "NumPy", "Pandas", "Modeling"],
        weeklyFocus: [
          "Week 1: AI foundations",
          "Week 2: Python math tooling",
          "Week 3: Data preparation",
          "Week 4: Model basics",
          "Week 5: Applied AI workflows",
          "Week 6: AI mini project",
        ],
      },
      {
        title: "AI Automation",
        summary: "Use AI tools and no-code/low-code flows to automate repetitive work and product tasks.",
        tools: ["Python", "APIs", "Automation", "Agents"],
        weeklyFocus: [
          "Week 1: Automation thinking",
          "Week 2: AI toolchains",
          "Week 3: API integrations",
          "Week 4: Workflow orchestration",
          "Week 5: Business automation",
          "Week 6: Automation project",
        ],
      },
    ],
  },
  {
    id: "engineering",
    title: "Engineering",
    description:
      "Technical design paths for learners interested in 3D systems, product modeling, and engineering workflows.",
    cover: "from-slate-700 via-primary to-cyan-400",
    iconLabel: "EN",
    branches: [
      {
        title: "3D Modeling",
        summary: "Learn the foundations of digital modeling, forms, assemblies, and presentation.",
        tools: ["Blender", "CAD Basics", "Rendering", "Model Workflow"],
        weeklyFocus: [
          "Week 1: Modeling fundamentals",
          "Week 2: Surface and form",
          "Week 3: Assemblies",
          "Week 4: Render setup",
          "Week 5: Product presentation",
          "Week 6: Model showcase project",
        ],
      },
      {
        title: "SolidWorks",
        summary: "Go deeper into mechanical modeling and engineering documentation workflows.",
        tools: ["SolidWorks", "Assemblies", "Drawings", "Simulation"],
        weeklyFocus: [
          "Week 1: Parts and sketches",
          "Week 2: Assemblies",
          "Week 3: Drawings",
          "Week 4: Constraints and detail",
          "Week 5: Engineering workflow",
          "Week 6: Mechanical capstone",
        ],
      },
      {
        title: "Engineering Design Systems",
        summary: "Create repeatable design workflows for technical product teams and engineering orgs.",
        tools: ["Systems Thinking", "CAD Workflow", "Documentation", "Review Loops"],
        weeklyFocus: [
          "Week 1: Design systems for engineering",
          "Week 2: Technical workflows",
          "Week 3: Review pipelines",
          "Week 4: Design documentation",
          "Week 5: Team coordination",
          "Week 6: Systems project",
        ],
      },
    ],
  },
  {
    id: "cloud-and-devops",
    title: "Cloud and DevOps",
    description:
      "Deployment, infrastructure, cloud systems, CI/CD, and operational thinking for modern engineering teams.",
    cover: "from-indigo-500 via-primary to-orange-400",
    iconLabel: "CD",
    branches: [
      {
        title: "Cloud Foundations",
        summary: "Understand cloud platforms, hosting models, networking basics, and deployment paths.",
        tools: ["AWS", "Azure", "Cloud Concepts", "Networking"],
        weeklyFocus: [
          "Week 1: Cloud basics",
          "Week 2: Compute and storage",
          "Week 3: Networking",
          "Week 4: Hosting applications",
          "Week 5: Secure cloud setup",
          "Week 6: Cloud deployment project",
        ],
      },
      {
        title: "DevOps Engineering",
        summary: "CI/CD, automation, containers, monitoring, and release confidence.",
        tools: ["Docker", "GitHub Actions", "Linux", "Monitoring"],
        weeklyFocus: [
          "Week 1: DevOps workflow",
          "Week 2: Containers",
          "Week 3: CI pipelines",
          "Week 4: CD and release flow",
          "Week 5: Monitoring and rollback",
          "Week 6: DevOps capstone",
        ],
      },
      {
        title: "Cloud Automation",
        summary: "Automate cloud workflows with scripts, IaC concepts, and team-ready operations.",
        tools: ["Terraform", "Bash", "Python", "Automation"],
        weeklyFocus: [
          "Week 1: Scripting foundations",
          "Week 2: Infrastructure as code",
          "Week 3: Provisioning",
          "Week 4: Repeatable releases",
          "Week 5: Team automation",
          "Week 6: Infrastructure project",
        ],
      },
    ],
  },
  {
    id: "programming-languages",
    title: "Programming Languages",
    description:
      "Deep language-first tracks for learners who want strong fundamentals before choosing a specialization.",
    cover: "from-violet-500 via-primary-glow to-cyan-500",
    iconLabel: "PL",
    branches: [
      {
        title: "JavaScript",
        summary: "Language fundamentals, DOM thinking, async flow, and practical app logic.",
        tools: ["JavaScript", "DOM", "Async", "ESNext"],
        weeklyFocus: [
          "Week 1: Syntax and variables",
          "Week 2: Functions and scope",
          "Week 3: Arrays and objects",
          "Week 4: DOM and browser logic",
          "Week 5: Async JavaScript",
          "Week 6: JavaScript project",
        ],
      },
      {
        title: "Python",
        summary: "Core Python for scripting, automation, backend, and data workflows.",
        tools: ["Python", "Functions", "OOP", "Packages"],
        weeklyFocus: [
          "Week 1: Python basics",
          "Week 2: Functions and data structures",
          "Week 3: Files and modules",
          "Week 4: OOP",
          "Week 5: Automation patterns",
          "Week 6: Python project",
        ],
      },
      {
        title: "TypeScript",
        summary: "Learn safer JavaScript with types, contracts, and scalable frontend/backend code.",
        tools: ["TypeScript", "Types", "Generics", "Tooling"],
        weeklyFocus: [
          "Week 1: TypeScript basics",
          "Week 2: Interfaces and models",
          "Week 3: Generics",
          "Week 4: App architecture",
          "Week 5: Type-safe APIs",
          "Week 6: TypeScript project",
        ],
      },
      {
        title: "SQL",
        summary: "Query relational data confidently and understand the language behind business systems.",
        tools: ["SQL", "Joins", "Aggregations", "Query Design"],
        weeklyFocus: [
          "Week 1: SQL basics",
          "Week 2: Filtering and sorting",
          "Week 3: Joins",
          "Week 4: Aggregations",
          "Week 5: Reporting patterns",
          "Week 6: Data query project",
        ],
      },
    ],
  },
];

export const mockUser = {
  id: "u_1",
  username: "alex.moore",
  displayName: "Alex Moore",
  email: "alex@mooreskillup.com",
  avatar: "AM",
  joinedAt: "2025-01-12",
  plan: "pro" as UserPlan,
  role: "student" as UserRole,
  interests: ["Backend Development"] as Interest[],
  wishlist: ["backend-python-api-builder"],
  selectedInterest: "Backend Development" as Interest,
  selectedTrack: "Backend with Python" as TrackName,
};

export const courses: Course[] = [
  {
    id: "frontend-react-studio",
    title: "Frontend React Studio",
    description:
      "A structured web development track for modern frontend builders with HTML, CSS, JavaScript, React, and shipped projects.",
    instructor: "Ada Morgan",
    totalLessons: 24,
    completedLessons: 9,
    cover: "from-primary via-primary-glow to-accent",
    interest: "Web Development",
    track: "Frontend Development",
    access: "free",
    availableOn: "Monday",
    rating: 4.9,
    learners: 1240,
    level: "Intermediate",
    featured: true,
    tags: ["HTML", "CSS", "JavaScript", "React"],
    modules: buildModules("front-react", [
      {
        title: "HTML and CSS foundations",
        lessons: [
          "How the web works",
          "Semantic HTML",
          "CSS layout systems",
          "Responsive design basics",
        ],
        assessment: "Build and style a responsive landing page section.",
        completedLessons: 4,
        unlockedLessons: 4,
      },
      {
        title: "JavaScript essentials",
        lessons: [
          "Variables and functions",
          "Arrays and objects",
          "DOM interaction",
          "Async basics",
        ],
        assessment: "Create an interactive mini UI with state changes.",
        completedLessons: 3,
        unlockedLessons: 4,
      },
      {
        title: "React foundations",
        lessons: [
          "Components and props",
          "State and hooks",
          "Routing concepts",
          "Reusable UI patterns",
        ],
        assessment: "Build a multi-section React interface.",
        completedLessons: 2,
        unlockedLessons: 3,
      },
      {
        title: "UI polish and motion",
        lessons: [
          "Design tokens",
          "Motion basics",
          "Accessibility polish",
          "Responsive QA",
        ],
        assessment: "Improve a UI to production-ready quality.",
        completedLessons: 0,
        unlockedLessons: 1,
      },
      {
        title: "Frontend capstone",
        lessons: [
          "Planning the build",
          "Component architecture",
          "Integration pass",
          "Deployment and review",
        ],
        assessment: "Ship a complete frontend capstone project.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
  {
    id: "backend-python-api-builder",
    title: "Backend with Python API Builder",
    description:
      "Learn backend development with Python, Django, FastAPI, databases, auth, and real API projects.",
    instructor: "Lena Park",
    totalLessons: 25,
    completedLessons: 7,
    cover: "from-sky-500 via-primary to-slate-900",
    interest: "Backend Development",
    track: "Backend with Python",
    access: "paid",
    rating: 4.85,
    learners: 980,
    level: "Intermediate",
    featured: true,
    tags: ["Python", "Django", "FastAPI", "PostgreSQL"],
    modules: buildModules("back-python", [
      {
        title: "Python for backend engineers",
        lessons: [
          "Python syntax for services",
          "Functions and modules",
          "Data structures for APIs",
          "Environment setup",
        ],
        assessment: "Write a clean Python utility service.",
        completedLessons: 4,
        unlockedLessons: 4,
      },
      {
        title: "API design and routing",
        lessons: [
          "HTTP and REST thinking",
          "FastAPI basics",
          "Request validation",
          "Error handling",
        ],
        assessment: "Create a simple CRUD API.",
        completedLessons: 2,
        unlockedLessons: 4,
      },
      {
        title: "Django backend systems",
        lessons: [
          "Django architecture",
          "Models and ORM",
          "Django REST patterns",
          "Serialization basics",
        ],
        assessment: "Build a Django API module.",
        completedLessons: 1,
        unlockedLessons: 3,
      },
      {
        title: "Auth, permissions, and database flow",
        lessons: [
          "JWT auth",
          "Permissions",
          "Database migrations",
          "Service layer design",
        ],
        assessment: "Secure an API with role-based rules.",
        completedLessons: 0,
        unlockedLessons: 1,
      },
      {
        title: "Backend capstone",
        lessons: [
          "Capstone planning",
          "API implementation",
          "Testing and docs",
          "Deployment flow",
        ],
        assessment: "Ship a full backend capstone with docs.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
  {
    id: "backend-javascript-service-lab",
    title: "Backend with JavaScript Service Lab",
    description:
      "Build backend services with JavaScript and Node.js, from API routing to auth, middleware, and deployment.",
    instructor: "Jordan Cole",
    totalLessons: 22,
    completedLessons: 0,
    cover: "from-amber-400 via-orange-500 to-slate-900",
    interest: "Backend Development",
    track: "Backend with JavaScript",
    access: "paid",
    rating: 4.76,
    learners: 710,
    level: "Intermediate",
    tags: ["JavaScript", "Node.js", "Express", "MongoDB"],
    modules: buildModules("back-js", [
      {
        title: "JavaScript service foundations",
        lessons: [
          "Node runtime basics",
          "Modules and project structure",
          "Async flow on the server",
          "Local tooling",
        ],
        assessment: "Set up a Node service foundation.",
        completedLessons: 0,
        unlockedLessons: 2,
      },
      {
        title: "APIs with Express",
        lessons: [
          "Routing and middleware",
          "Controllers and handlers",
          "Validation",
          "Error boundaries",
        ],
        assessment: "Create and test Express endpoints.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Persistence and auth",
        lessons: [
          "Database integration",
          "Authentication",
          "Authorization",
          "Session and token strategy",
        ],
        assessment: "Add auth to a service app.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Production backend patterns",
        lessons: [
          "Testing",
          "Logging",
          "Deployment",
          "Monitoring basics",
        ],
        assessment: "Prepare a service for production.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Backend capstone",
        lessons: [
          "Planning the project",
          "Building the API",
          "Security and review",
          "Deployment and wrap-up",
        ],
        assessment: "Ship a backend capstone app.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
  {
    id: "uiux-figma-product-track",
    title: "UI/UX and Figma Product Track",
    description:
      "A premium graphics and design path covering UX thinking, interface design, Figma systems, and case studies.",
    instructor: "Mina Duarte",
    totalLessons: 24,
    completedLessons: 4,
    cover: "from-orange-400 via-accent to-rose-500",
    interest: "Graphics and Design",
    track: "UI/UX Design",
    access: "paid",
    availableOn: "Thursday",
    rating: 4.95,
    learners: 760,
    level: "Advanced",
    tags: ["UI/UX", "Figma", "Research", "Systems"],
    modules: buildModules("design-uiux", [
      {
        title: "UX foundations",
        lessons: [
          "Research basics",
          "Personas and flows",
          "Information architecture",
          "Problem framing",
        ],
        assessment: "Map a learner journey flow.",
        completedLessons: 3,
        unlockedLessons: 4,
      },
      {
        title: "Interface design in Figma",
        lessons: [
          "Layout and hierarchy",
          "Components and variants",
          "Auto layout",
          "Design consistency",
        ],
        assessment: "Design a responsive product page in Figma.",
        completedLessons: 1,
        unlockedLessons: 4,
      },
      {
        title: "Systems and prototyping",
        lessons: [
          "Tokens and systems",
          "Interaction states",
          "Prototyping",
          "Design handoff",
        ],
        assessment: "Prototype a learner dashboard flow.",
        completedLessons: 0,
        unlockedLessons: 2,
      },
      {
        title: "Creative production",
        lessons: [
          "Graphics thinking",
          "Brand expression",
          "Video handoff and direction",
          "Design critique loops",
        ],
        assessment: "Create a visual campaign pack.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Portfolio case study",
        lessons: [
          "Case study structure",
          "Presentation polish",
          "Feedback pass",
          "Final delivery",
        ],
        assessment: "Ship a full design case study.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
  {
    id: "ai-data-automation-lab",
    title: "AI, Data, and Automation Lab",
    description:
      "Learn analysis, AI workflows, Python tooling, and automation systems for modern digital work.",
    instructor: "Marcus Vega",
    totalLessons: 23,
    completedLessons: 2,
    cover: "from-emerald-400 via-primary-glow to-primary",
    interest: "AI and Data",
    track: "AI Automation",
    access: "free",
    availableOn: "Wednesday",
    rating: 4.72,
    learners: 680,
    level: "Beginner",
    tags: ["Python", "Data", "AI", "Automation"],
    modules: buildModules("ai-data", [
      {
        title: "Data and Python foundations",
        lessons: [
          "Python basics",
          "NumPy and arrays",
          "Pandas intro",
          "Clean data thinking",
        ],
        assessment: "Analyze a starter dataset.",
        completedLessons: 2,
        unlockedLessons: 4,
      },
      {
        title: "Visualization and reporting",
        lessons: [
          "Plotting basics",
          "Storytelling with charts",
          "Business insights",
          "Communicating results",
        ],
        assessment: "Present a simple findings report.",
        completedLessons: 0,
        unlockedLessons: 2,
      },
      {
        title: "AI fundamentals",
        lessons: [
          "AI concepts",
          "Model intuition",
          "Prompt and tool workflows",
          "Responsible AI basics",
        ],
        assessment: "Document an AI-assisted workflow.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Automation systems",
        lessons: [
          "Workflow mapping",
          "API automation",
          "Agent loops",
          "Business use cases",
        ],
        assessment: "Build an automation concept demo.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "AI and data capstone",
        lessons: [
          "Project plan",
          "Implementation",
          "Insights and review",
          "Presentation",
        ],
        assessment: "Ship an AI/data capstone project.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
  {
    id: "engineering-3d-systems",
    title: "Engineering 3D Systems Studio",
    description:
      "A technical engineering path covering 3D modeling, SolidWorks workflows, and technical design systems.",
    instructor: "Tomi Bello",
    totalLessons: 21,
    completedLessons: 1,
    cover: "from-slate-700 via-primary to-cyan-400",
    interest: "Engineering",
    track: "3D Modeling",
    access: "paid",
    rating: 4.83,
    learners: 410,
    level: "Intermediate",
    tags: ["3D Modeling", "SolidWorks", "Engineering"],
    modules: buildModules("eng-3d", [
      {
        title: "Modeling fundamentals",
        lessons: [
          "3D form thinking",
          "Parts and sketches",
          "Tool familiarity",
          "Precision habits",
        ],
        assessment: "Model a simple engineering part.",
        completedLessons: 1,
        unlockedLessons: 3,
      },
      {
        title: "Assemblies and technical workflows",
        lessons: [
          "Assemblies",
          "Constraints",
          "Iteration",
          "Review loops",
        ],
        assessment: "Build a small multi-part assembly.",
        completedLessons: 0,
        unlockedLessons: 1,
      },
      {
        title: "SolidWorks and documentation",
        lessons: [
          "SolidWorks workflow",
          "Drawings",
          "Technical communication",
          "Simulation awareness",
        ],
        assessment: "Prepare technical drawings for review.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Design systems for engineering",
        lessons: [
          "Reusable workflows",
          "Team standards",
          "Versioning and naming",
          "Critique loops",
        ],
        assessment: "Define a team modeling standard.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Engineering capstone",
        lessons: [
          "Planning",
          "Build",
          "Review",
          "Presentation",
        ],
        assessment: "Ship a full engineering model showcase.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
  {
    id: "cloud-devops-launchpad",
    title: "Cloud and DevOps Launchpad",
    description:
      "Learn cloud deployment, DevOps workflows, CI/CD, automation, and release confidence for modern teams.",
    instructor: "Nina Brooks",
    totalLessons: 22,
    completedLessons: 0,
    cover: "from-indigo-500 via-primary to-orange-400",
    interest: "Cloud and DevOps",
    track: "DevOps Engineering",
    access: "paid",
    rating: 4.8,
    learners: 530,
    level: "Intermediate",
    tags: ["Cloud", "DevOps", "Docker", "CI/CD"],
    modules: buildModules("cloud-devops", [
      {
        title: "Cloud foundations",
        lessons: [
          "Cloud concepts",
          "Compute and storage",
          "Networking basics",
          "Hosting choices",
        ],
        assessment: "Map a deployment architecture.",
        completedLessons: 0,
        unlockedLessons: 2,
      },
      {
        title: "DevOps workflow",
        lessons: [
          "Linux basics",
          "Containers with Docker",
          "CI principles",
          "Automation thinking",
        ],
        assessment: "Containerize a small app.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Deployment systems",
        lessons: [
          "CD pipelines",
          "Environment management",
          "Monitoring",
          "Rollback plans",
        ],
        assessment: "Design a deployment workflow.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "Cloud automation",
        lessons: [
          "Scripting automation",
          "Infrastructure concepts",
          "Repeatable workflows",
          "Team operations",
        ],
        assessment: "Automate an ops task flow.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
      {
        title: "DevOps capstone",
        lessons: [
          "Plan",
          "Implement",
          "Observe",
          "Deliver",
        ],
        assessment: "Ship a cloud and DevOps capstone.",
        completedLessons: 0,
        unlockedLessons: 0,
      },
    ]),
  },
];

export const announcements: Announcement[] = [
  {
    id: "a1",
    title: "Quiz Shop just opened",
    body: "Redeem your points for challenge packs, retries, and mentor-style review perks.",
    date: "20 minutes ago",
    tag: "release",
  },
  {
    id: "a2",
    title: "Backend cohort sprint on Friday",
    body: "Join the live build-along session covering auth, permissions, and clean service layers.",
    date: "Today",
    tag: "event",
  },
  {
    id: "a3",
    title: "New engineering and cloud paths added",
    body: "The academy now includes engineering, cloud, DevOps, and language-first learning trees.",
    date: "2 days ago",
    tag: "update",
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    title: "Free",
    price: "$0",
    tagline: "Explore the academy",
    description: "Great for trying selected public and weekly-unlocked courses before committing.",
    cta: "Start free",
    features: [
      "Public course catalog access",
      "Selected free weekly course unlocks",
      "Basic dashboard and notifications",
      "Limited quiz attempts",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    price: "$29/mo",
    tagline: "Build momentum faster",
    description: "Unlock student content, quizzes, and project-based learning with strong progression support.",
    cta: "Go Pro",
    highlight: true,
    features: [
      "Full learner course access",
      "All weekly lessons and assessments",
      "Quiz Shop rewards and certificates",
      "Priority support and curated paths",
    ],
  },
  {
    id: "premium",
    title: "Premium",
    price: "$79/mo",
    tagline: "Career acceleration",
    description: "Designed for serious learners who want mentorship, deeper accountability, and elite project review.",
    cta: "Join Premium",
    features: [
      "Everything in Pro",
      "Mentor-style office-hour support",
      "Portfolio and capstone review",
      "Advanced learning paths and leadership tracks",
    ],
  },
];

export const quizShopItems: QuizShopItem[] = [
  {
    id: "qs-1",
    title: "Rapid Quiz Booster",
    cost: 150,
    rarity: "Rare",
    reward: "+1 retry token",
    description: "Use points earned from quizzes to unlock one extra attempt on a challenge.",
  },
  {
    id: "qs-2",
    title: "Mentor Access Pass",
    cost: 450,
    rarity: "Epic",
    reward: "15-minute mentor review",
    description: "A premium-style reward for focused feedback on a project or stuck topic.",
  },
  {
    id: "qs-3",
    title: "Legendary Capstone Drop",
    cost: 900,
    rarity: "Legendary",
    reward: "Private critique + exclusive badge",
    description: "A capstone-level reward pack unlocked through consistent quiz performance.",
  },
];

export const faqItems = [
  {
    question: "How does course access work on the free plan?",
    answer:
      "Free learners can explore the public academy catalog and access selected courses on specific release days. Paid plans unlock everything full-time.",
  },
  {
    question: "How is the dashboard personalized?",
    answer:
      "Learners choose a main academy path and a track during registration. The dashboard then prioritizes content, recommendations, and progress around that selection.",
  },
  {
    question: "What is the Quiz Shop?",
    answer:
      "The Quiz Shop is a gamified rewards area where quiz points can be redeemed for perks like retry tokens, challenge packs, and premium-style review rewards.",
  },
  {
    question: "How are courses structured?",
    answer:
      "Courses are organized week by week. Each week includes lessons plus an assessment, and the final week ends with a capstone-style project before certification.",
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Monday unlock is live",
    body: "Frontend React Studio is open today for free learners.",
    kind: "course",
    read: false,
    time: "Now",
  },
  {
    id: "n2",
    title: "220 points added",
    body: "You passed the backend foundations assessment and unlocked a new Quiz Shop item.",
    kind: "reward",
    read: false,
    time: "1h ago",
  },
  {
    id: "n3",
    title: "Capstone review available",
    body: "Your design submission has new feedback from the team workspace.",
    kind: "message",
    read: true,
    time: "Yesterday",
  },
];

export const teacherUploads = [
  {
    id: "tu-1",
    title: "Design critique workflow",
    status: "Draft",
    learners: 0,
    completionRate: 0,
  },
  {
    id: "tu-2",
    title: "Advanced API versioning",
    status: "Published",
    learners: 182,
    completionRate: 67,
  },
];

export const adminUsers = [
  { id: "u-11", name: "Zainab Okon", plan: "Free", role: "Student", courses: 2 },
  { id: "u-12", name: "Chinedu Grey", plan: "Pro", role: "Student", courses: 5 },
  { id: "u-13", name: "Mina Duarte", plan: "Premium", role: "Teacher", courses: 3 },
  { id: "u-14", name: "Ada Morgan", plan: "Premium", role: "Admin", courses: 6 },
];

export function findLesson(lessonId: string): { lesson: Lesson; course: Course; module: Module } | null {
  for (const course of courses) {
    for (const module of course.modules) {
      const lesson = module.lessons.find((item) => item.id === lessonId);
      if (lesson) {
        return { lesson, course, module };
      }
    }
  }
  return null;
}

export function todaysLesson() {
  const course = courses[1];
  for (const module of course.modules) {
    const next = module.lessons.find((lesson) => lesson.status === "unlocked");
    if (next) {
      return { course, lesson: next, module };
    }
  }
  return { course, lesson: course.modules[0].lessons[0], module: course.modules[0] };
}

export function getCoursesByInterest(selectedInterests: Interest[]) {
  if (!selectedInterests.length) {
    return courses;
  }

  const matches = courses.filter((course) => selectedInterests.includes(course.interest));
  const rest = courses.filter((course) => !selectedInterests.includes(course.interest));
  return [...matches, ...rest];
}

export function getTodayName(date = new Date()): Weekday {
  return date.toLocaleDateString("en-US", { weekday: "long" }) as Weekday;
}

export function canAccessCourse(course: Course, plan: UserPlan, day = getTodayName()) {
  if (plan !== "free") {
    return { allowed: true, reason: null as string | null };
  }

  if (course.access === "paid") {
    return { allowed: false, reason: "Upgrade to Pro to unlock this course." };
  }

  if (course.availableOn && course.availableOn !== day) {
    return {
      allowed: false,
      reason: `Free learners can access this course on ${course.availableOn}.`,
    };
  }

  return { allowed: true, reason: null as string | null };
}
