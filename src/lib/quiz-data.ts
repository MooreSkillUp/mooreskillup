export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passingScore: number;
  pointsReward: number;
  questions: QuizQuestion[];
}

export const quizzes: Quiz[] = [
  {
    id: "quiz-fullstack-foundations",
    courseId: "fullstack-101",
    title: "Foundations of the Web Quiz",
    description: "Test your knowledge of HTML, CSS, and how the web works.",
    passingScore: 70,
    pointsReward: 200,
    questions: [
      {
        id: "q1",
        question: "What does HTML stand for?",
        options: [
          "HyperText Markup Language",
          "HighText Machine Language",
          "HyperTool Multi Language",
          "Home Tool Markup Language",
        ],
        correctIndex: 0,
        explanation:
          "HTML stands for HyperText Markup Language, the standard markup for web pages.",
      },
      {
        id: "q2",
        question: "Which CSS property is used to make a flexible row layout?",
        options: ["display: block", "display: flex", "position: absolute", "float: left"],
        correctIndex: 1,
        explanation:
          "`display: flex` enables flexbox, the modern way to lay out rows and columns.",
      },
      {
        id: "q3",
        question: "Which protocol does the web primarily use?",
        options: ["FTP", "SSH", "HTTP/HTTPS", "SMTP"],
        correctIndex: 2,
        explanation:
          "HTTP and HTTPS are the foundation of data exchange on the web.",
      },
      {
        id: "q4",
        question: "What does a responsive design adapt to?",
        options: ["Browser version", "Screen size", "User language", "Operating system"],
        correctIndex: 1,
        explanation:
          "Responsive design adapts the layout to different screen sizes and devices.",
      },
      {
        id: "q5",
        question: "Which HTML tag creates the largest heading?",
        options: ["<h6>", "<heading>", "<h1>", "<head>"],
        correctIndex: 2,
        explanation: "<h1> is the top-level heading and is the largest by default.",
      },
    ],
  },
  {
    id: "quiz-js-deep-dive",
    courseId: "fullstack-101",
    title: "JavaScript Deep Dive Quiz",
    description: "Check your understanding of JavaScript fundamentals and async patterns.",
    passingScore: 70,
    pointsReward: 250,
    questions: [
      {
        id: "q1",
        question: "Which keyword declares a block-scoped variable?",
        options: ["var", "let", "function", "global"],
        correctIndex: 1,
        explanation:
          "`let` and `const` are block-scoped, unlike `var`, which is function-scoped.",
      },
      {
        id: "q2",
        question: "What does `Promise.all` resolve with?",
        options: [
          "The first resolved value",
          "An array of all resolved values",
          "Always undefined",
          "The last resolved value",
        ],
        correctIndex: 1,
        explanation:
          "`Promise.all` waits for all promises and resolves with an array of their results.",
      },
      {
        id: "q3",
        question: "Which method runs a function for each array item?",
        options: [".map()", ".forEach()", ".filter()", "All of the above"],
        correctIndex: 3,
        explanation:
          "All three iterate, but they return different results. `forEach` itself returns nothing.",
      },
      {
        id: "q4",
        question: "What does `===` check?",
        options: ["Value only", "Type only", "Value and type", "Reference only"],
        correctIndex: 2,
        explanation:
          "Strict equality compares both value and type without coercion.",
      },
    ],
  },
  {
    id: "quiz-data-thinking",
    courseId: "data-essentials",
    title: "Thinking with Data Quiz",
    description: "A short check-in on analytics fundamentals.",
    passingScore: 70,
    pointsReward: 200,
    questions: [
      {
        id: "q1",
        question: "What is the first step in any analysis?",
        options: ["Build a chart", "Define the question", "Pick a tool", "Clean the data"],
        correctIndex: 1,
        explanation:
          "Start with a clear question. It shapes everything else.",
      },
      {
        id: "q2",
        question: "Which is NOT a common data cleaning task?",
        options: ["Removing duplicates", "Handling missing values", "Standardizing formats", "Encrypting data"],
        correctIndex: 3,
        explanation: "Encryption is a security task, not a cleaning task.",
      },
      {
        id: "q3",
        question: "Which tool is best for ad-hoc analysis on small data?",
        options: ["Spreadsheets", "Hadoop", "Kafka", "Redis"],
        correctIndex: 0,
        explanation:
          "Spreadsheets are great for quick exploration of small datasets.",
      },
    ],
  },
];

export function findQuiz(id: string): Quiz | null {
  return quizzes.find((quiz) => quiz.id === id) ?? null;
}

export function quizzesForCourse(courseId: string): Quiz[] {
  return quizzes.filter((quiz) => quiz.courseId === courseId);
}
