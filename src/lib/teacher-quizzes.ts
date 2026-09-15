"use client";

import { useCallback, useEffect, useState } from "react";

import { authenticatedRequest } from "./authenticated-api";

export interface TeacherChoice {
  id?: string;
  text: string;
  isCorrect: boolean;
  order?: number;
}

export interface TeacherQuestion {
  id?: string;
  text: string;
  explanation: string;
  order?: number;
  choices: TeacherChoice[];
}

export interface TeacherQuiz {
  id: string;
  course: string;
  section: string | null;
  kind: "section" | "final";
  title: string;
  description: string;
  passMarkPercent: number;
  questionsPerAttempt: number;
  isPublished: boolean;
  /** Server's verdict on whether this can actually be served to a student. */
  isReady: boolean;
  questionCount: number;
  questions: TeacherQuestion[];
}

export interface QuizDraft {
  course: string;
  section?: string | null;
  kind: "section" | "final";
  title: string;
  description?: string;
  passMarkPercent?: number;
  questionsPerAttempt?: number;
  isPublished?: boolean;
}

/**
 * Every quiz on one course, with create/update/delete.
 *
 * Reloads from the server after each write rather than patching local state.
 * `isReady` is the server's judgement — a quiz with no correct answer is not
 * servable, and the teacher needs to be told that by the same authority that
 * will refuse to serve it, not by a guess made in the browser.
 */
export function useTeacherQuizzes(courseId: string | undefined, enabled = true) {
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled || !courseId) {
      setQuizzes([]);
      return;
    }
    setIsLoading(true);
    try {
      const payload = await authenticatedRequest<unknown>(
        `/api/teacher/quizzes/?course=${courseId}`,
      );
      const rows = Array.isArray(payload)
        ? payload
        : ((payload as { results?: TeacherQuiz[] })?.results ?? []);
      setQuizzes(rows as TeacherQuiz[]);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load quizzes.");
    } finally {
      setIsLoading(false);
    }
  }, [courseId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const createQuiz = useCallback(
    async (draft: QuizDraft) => {
      const created = await authenticatedRequest<TeacherQuiz>("/api/teacher/quizzes/", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      await load();
      return created;
    },
    [load],
  );

  const updateQuiz = useCallback(
    async (quizId: string, patch: Partial<QuizDraft>) => {
      await authenticatedRequest(`/api/teacher/quizzes/${quizId}/`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    },
    [load],
  );

  const deleteQuiz = useCallback(
    async (quizId: string) => {
      await authenticatedRequest(`/api/teacher/quizzes/${quizId}/`, { method: "DELETE" });
      await load();
    },
    [load],
  );

  const saveQuestion = useCallback(
    async (quizId: string, question: TeacherQuestion) => {
      const body = JSON.stringify({
        quiz: quizId,
        text: question.text,
        explanation: question.explanation,
        order: question.order ?? 0,
        choices: question.choices.map((choice, index) => ({
          text: choice.text,
          isCorrect: choice.isCorrect,
          order: index,
        })),
      });

      if (question.id) {
        await authenticatedRequest(`/api/teacher/quiz-questions/${question.id}/`, {
          method: "PUT",
          body,
        });
      } else {
        await authenticatedRequest("/api/teacher/quiz-questions/", { method: "POST", body });
      }
      await load();
    },
    [load],
  );

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      await authenticatedRequest(`/api/teacher/quiz-questions/${questionId}/`, {
        method: "DELETE",
      });
      await load();
    },
    [load],
  );

  return {
    quizzes,
    isLoading,
    error,
    reload: load,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    saveQuestion,
    deleteQuestion,
  };
}

/** A blank question with two empty choices — the minimum that makes sense. */
export function emptyQuestion(order = 0): TeacherQuestion {
  return {
    text: "",
    explanation: "",
    order,
    choices: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}
