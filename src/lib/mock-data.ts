export type LessonStatus = "completed" | "unlocked" | "locked";

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
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  tag: "update" | "event" | "release";
}

export const mockUser = {
  id: "u_1",
  username: "alex.moore",
  displayName: "Alex Moore",
  email: "alex@mooreskillup.com",
  avatar: "AM",
  joinedAt: "2025-01-12",
};

const buildLessons = (prefix: string, titles: string[], unlockedThru: number, completedThru: number): Lesson[] =>
  titles.map((t, i) => ({
    id: `${prefix}-l${i + 1}`,
    title: t,
    duration: `${10 + ((i * 7) % 25)} min`,
    status: i < completedThru ? "completed" : i < unlockedThru ? "unlocked" : "locked",
    videoId: "dQw4w9WgXcQ",
    description:
      "In this lesson you'll learn the foundations and apply them in a short hands-on task. Take notes and complete the exercise at the end.",
  }));

export const courses: Course[] = [
  {
    id: "fullstack-101",
    title: "Fullstack Web Development",
    description: "From HTML fundamentals to deploying a complete React + API application.",
    instructor: "Dr. Lena Park",
    totalLessons: 16,
    completedLessons: 6,
    cover: "from-primary to-primary-glow",
    modules: [
      {
        id: "m1",
        week: 1,
        title: "Foundations of the Web",
        lessons: buildLessons("m1", ["How the web works", "HTML essentials", "CSS layout & flexbox", "Responsive design"], 4, 4),
      },
      {
        id: "m2",
        week: 2,
        title: "JavaScript Deep Dive",
        lessons: buildLessons("m2", ["JS syntax & types", "Functions & scope", "DOM manipulation", "Async & promises"], 3, 2),
      },
      {
        id: "m3",
        week: 3,
        title: "React Fundamentals",
        lessons: buildLessons("m3", ["Components & JSX", "State & hooks", "Routing", "Data fetching"], 0, 0),
      },
      {
        id: "m4",
        week: 4,
        title: "Ship Your First App",
        lessons: buildLessons("m4", ["APIs & auth", "Deployment", "Capstone project", "Wrap up"], 0, 0),
      },
    ],
  },
  {
    id: "data-essentials",
    title: "Data Analytics Essentials",
    description: "Spreadsheets, SQL, and visual storytelling for data-driven decisions.",
    instructor: "Marcus Vega",
    totalLessons: 12,
    completedLessons: 2,
    cover: "from-accent to-primary",
    modules: [
      {
        id: "d1",
        week: 1,
        title: "Thinking with data",
        lessons: buildLessons("d1", ["What is analytics", "Spreadsheet basics", "Cleaning data"], 3, 2),
      },
      {
        id: "d2",
        week: 2,
        title: "SQL for analysts",
        lessons: buildLessons("d2", ["SELECT & WHERE", "Joins", "Aggregations"], 0, 0),
      },
    ],
  },
];

export const announcements: Announcement[] = [
  {
    id: "a1",
    title: "New module released: React Fundamentals",
    body: "Week 3 lessons are now available. Dive in once you finish Week 2.",
    date: "2 hours ago",
    tag: "release",
  },
  {
    id: "a2",
    title: "Live Q&A with Dr. Park",
    body: "Join us Friday 7pm WAT for a live session covering common bugs and project reviews.",
    date: "Yesterday",
    tag: "event",
  },
  {
    id: "a3",
    title: "Platform update v2.4",
    body: "Faster lesson loading and improved progress tracking are now live.",
    date: "3 days ago",
    tag: "update",
  },
];

export function findLesson(lessonId: string): { lesson: Lesson; course: Course; module: Module } | null {
  for (const course of courses) {
    for (const module of course.modules) {
      const lesson = module.lessons.find((l) => l.id === lessonId);
      if (lesson) return { lesson, course, module };
    }
  }
  return null;
}

export function todaysLesson() {
  const course = courses[0];
  for (const m of course.modules) {
    const next = m.lessons.find((l) => l.status === "unlocked");
    if (next) return { course, lesson: next, module: m };
  }
  return { course, lesson: course.modules[0].lessons[0], module: course.modules[0] };
}
