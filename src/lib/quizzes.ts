"use client";

import { useCallback, useEffect, useState } from "react";
import { authenticatedRequest } from "./authenticated-api";

export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  isMultiSelect: boolean;
  choices: QuizChoice[];
}

export interface QuizSummary {
  id: string;
  kind: "section" | "final";
  title: string;
  description: string;
  sectionId: string | null;
  questionCount: number;
  passMarkPercent: number;
  questionsPerAttempt: number;
}

export interface QuizAttemptResult {
  id: string;
  quizId: string;
  scorePercent: number;
  passed: boolean;
  submittedAt: string | null;
}

/** One question, shown after scoring: what you picked and what was right. */
export interface ReviewRow {
  id: string;
  text: string;
  explanation: string;
  wasCorrect: boolean;
  choices: { id: string; text: string; isCorrect: boolean; wasChosen: boolean }[];
}

export interface QuizOverview {
  quiz: QuizSummary;
  isReady: boolean;
  passed: boolean;
  /** Seconds until a retry is allowed. 0 means now. */
  cooldownSeconds: number;
  openAttemptId: string | null;
  attempts: QuizAttemptResult[];
}

/** One thing still standing between the student and the certificate. */
export type OutstandingItem =
  | { kind: "lessons"; remaining: number }
  | { kind: "section_quiz"; quizId: string; title: string; sectionId: string; sectionTitle: string }
  | { kind: "final"; quizId: string; title: string };

export interface ProgressionState {
  mode: "open" | "sequential";
  accessibleSectionIds: string[];
  sectionsComplete: boolean;
  finalAssessmentId: string | null;
  finalAssessmentPassed: boolean;
  finalAssessmentAvailable: boolean;
  certificateEarned: boolean;
  outstanding: OutstandingItem[];
}

/** A sentence a student can act on, plus where to go. */
export function describeOutstanding(
  item: OutstandingItem,
): { text: string; href: string | null } {
  if (item.kind === "lessons") {
    return {
      text: `${item.remaining} ${item.remaining === 1 ? "lesson" : "lessons"} left to finish`,
      href: null,
    };
  }
  if (item.kind === "section_quiz") {
    return { text: `Pass the quiz in ${item.sectionTitle}`, href: `/quiz/${item.quizId}` };
  }
  return { text: "Pass the final assessment", href: `/quiz/${item.quizId}` };
}

/** What a student sees before starting: the shape of it, and where they stand. */
export function useQuizOverview(quizId: string, enabled = true) {
  const [data, setData] = useState<QuizOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled || !quizId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setData(await authenticatedRequest<QuizOverview>(`/api/quizzes/${quizId}/`));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this quiz.");
    } finally {
      setIsLoading(false);
    }
  }, [quizId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

/**
 * Begin (or resume) an attempt.
 *
 * The server decides which questions to serve and remembers them, so a reload
 * mid-quiz returns the same paper rather than a fresh draw.
 */
export async function startQuiz(quizId: string) {
  return authenticatedRequest<{
    attemptId: string;
    quiz: QuizSummary;
    questions: QuizQuestion[];
  }>(`/api/quizzes/${quizId}/start/`, { method: "POST" });
}

/** Submit answers as {questionId: [choiceId, ...]}. Scored server-side. */
export async function submitQuiz(attemptId: string, answers: Record<string, string[]>) {
  return authenticatedRequest<{
    attempt: QuizAttemptResult;
    passMarkPercent: number;
    review: ReviewRow[];
    progression: ProgressionState | null;
  }>(`/api/quiz-attempts/${attemptId}/submit/`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

/** Where a student stands in a course: what's open, what's left. */
export function useProgression(courseId: string, enabled = true) {
  const [state, setState] = useState<ProgressionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled || !courseId) {
      setIsLoading(false);
      return;
    }
    try {
      setState(await authenticatedRequest<ProgressionState>(`/api/courses/${courseId}/progression/`));
    } catch {
      // Not enrolled, or the course has no progression to report. Either way
      // the UI falls back to showing nothing rather than an error.
      setState(null);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, isLoading, refresh };
}

/** "14:32" — a cooldown reads better counting down than as a timestamp. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
