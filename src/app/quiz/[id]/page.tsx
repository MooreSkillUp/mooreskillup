"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Lightbulb,
  RotateCcw,
  X,
} from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { BrandSpinner } from "@/components/shared/BrandSpinner";
import { Button } from "@/components/ui-kit/Button";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import {
  formatCountdown,
  startQuiz,
  submitQuiz,
  useQuizOverview,
  type QuizQuestion,
  type ReviewRow,
} from "@/lib/quizzes";
import { cn } from "@/lib/utils";

type Stage = "overview" | "taking" | "result";

/**
 * Taking a quiz.
 *
 * One question at a time rather than a scrolling list: it keeps the phone
 * experience sane, makes progress legible, and stops someone answering the
 * first question while reading the fifth.
 *
 * Nothing here decides anything. The server picks the questions, holds the
 * answer key, and scores the attempt — this screen only collects choices and
 * shows what came back.
 */
export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const { user } = useAuth();
  const { notifyError } = useFeedback();

  const { data, isLoading, error, refresh } = useQuizOverview(
    quizId,
    user?.role === "student",
  );

  const [stage, setStage] = useState<Stage>("overview");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const [result, setResult] = useState<{
    scorePercent: number;
    passed: boolean;
    passMark: number;
    review: ReviewRow[];
  } | null>(null);

  // Count the cooldown down on screen. A static "try again in 15 minutes" is
  // stale the moment it renders, and leaves people refreshing to find out.
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    setCooldown(data?.cooldownSeconds ?? 0);
  }, [data?.cooldownSeconds]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const current = questions[index];
  const answered = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? []).length > 0).length,
    [questions, answers],
  );

  const begin = async () => {
    setBusy(true);
    try {
      const started = await startQuiz(quizId);
      setAttemptId(started.attemptId);
      setQuestions(started.questions);
      setAnswers({});
      setIndex(0);
      setStage("taking");
    } catch (startError) {
      notifyError(
        "Can't start yet",
        startError instanceof Error ? startError.message : "Please try again.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const choose = (question: QuizQuestion, choiceId: string) => {
    setAnswers((current) => {
      const picked = current[question.id] ?? [];
      if (question.isMultiSelect) {
        return {
          ...current,
          [question.id]: picked.includes(choiceId)
            ? picked.filter((id) => id !== choiceId)
            : [...picked, choiceId],
        };
      }
      return { ...current, [question.id]: [choiceId] };
    });
  };

  const finish = async () => {
    if (!attemptId) return;
    setBusy(true);
    try {
      const submitted = await submitQuiz(attemptId, answers);
      setResult({
        scorePercent: Number(submitted.attempt.scorePercent),
        passed: submitted.attempt.passed,
        passMark: submitted.passMarkPercent,
        review: submitted.review,
      });
      setStage("result");
      await refresh();
    } catch (submitError) {
      notifyError(
        "Couldn't submit",
        submitError instanceof Error ? submitError.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <BrandSpinner size="lg" label="Loading quiz" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell allowedRoles={["student"]}>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="font-display text-xl font-bold">Quiz unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "This quiz may have been removed."}
          </p>
          <Link href="/dashboard/courses" className="mt-5 inline-block">
            <Button variant="outline">Back to courses</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { quiz } = data;
  const isFinal = quiz.kind === "final";

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="mx-auto max-w-3xl space-y-6">
        {stage === "overview" && (
          <Overview
            data={data}
            cooldown={cooldown}
            busy={busy}
            onStart={begin}
            onBack={() => router.back()}
          />
        )}

        {stage === "taking" && current && (
          <Taking
            quizTitle={quiz.title}
            question={current}
            index={index}
            total={questions.length}
            answeredCount={answered}
            selected={answers[current.id] ?? []}
            busy={busy}
            onChoose={(choiceId) => choose(current, choiceId)}
            onPrev={() => setIndex((n) => Math.max(0, n - 1))}
            onNext={() => setIndex((n) => Math.min(questions.length - 1, n + 1))}
            onSubmit={finish}
          />
        )}

        {stage === "result" && result && (
          <Result
            result={result}
            isFinal={isFinal}
            cooldown={cooldown}
            onRetry={() => {
              setResult(null);
              setStage("overview");
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function Overview({
  data,
  cooldown,
  busy,
  onStart,
  onBack,
}: {
  data: NonNullable<ReturnType<typeof useQuizOverview>["data"]>;
  cooldown: number;
  busy: boolean;
  onStart: () => void;
  onBack: () => void;
}) {
  const { quiz, isReady, passed, attempts } = data;
  const served = quiz.questionsPerAttempt || quiz.questionCount;
  const best = attempts.reduce((top, a) => Math.max(top, Number(a.scorePercent)), 0);

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              {quiz.kind === "final" ? "Final assessment" : "Section quiz"}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold">{quiz.title}</h1>
            {quiz.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {quiz.description}
              </p>
            )}
          </div>

          {passed && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-bold text-success">
              <CheckCircle2 className="h-4 w-4" />
              Passed
            </span>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Questions" value={String(served)} />
          <Stat label="To pass" value={`${quiz.passMarkPercent}%`} />
          <Stat label="Attempts" value={String(attempts.length)} />
        </dl>

        {/* Said plainly rather than buried: a student who knows the questions
            vary won't waste an attempt trying to memorise them. */}
        {quiz.questionCount > served && (
          <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            Questions are drawn from a larger set, so each attempt is different.
            You can retry as many times as you need.
          </p>
        )}

        {attempts.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Your best score so far: <strong className="text-foreground">{Math.round(best)}%</strong>
          </p>
        )}

        <div className="mt-6">
          {!isReady ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              This quiz isn&apos;t ready yet. Check back soon.
            </p>
          ) : cooldown > 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Try again in {formatCountdown(cooldown)}
                </p>
                <p className="text-xs text-muted-foreground">
                  A short wait between attempts — use it to review the lesson.
                </p>
              </div>
            </div>
          ) : (
            <Button variant="accent" size="lg" onClick={onStart} loading={busy} loadingText="Starting...">
              {passed ? "Take it again" : attempts.length ? "Try again" : "Start quiz"}
            </Button>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Taking({
  quizTitle,
  question,
  index,
  total,
  answeredCount,
  selected,
  busy,
  onChoose,
  onPrev,
  onNext,
  onSubmit,
}: {
  quizTitle: string;
  question: QuizQuestion;
  index: number;
  total: number;
  answeredCount: number;
  selected: string[];
  busy: boolean;
  onChoose: (choiceId: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const isLast = index === total - 1;
  const percent = Math.round(((index + 1) / total) * 100);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{quizTitle}</p>
          <p className="text-sm font-semibold tabular-nums">
            {index + 1} / {total}
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold leading-snug">{question.text}</h2>
        {question.isMultiSelect && (
          <p className="mt-1.5 text-xs font-medium text-accent">
            Select all that apply — you need every correct answer.
          </p>
        )}

        <div className="mt-5 space-y-2.5" role="group">
          {question.choices.map((choice) => {
            const picked = selected.includes(choice.id);
            return (
              <button
                key={choice.id}
                type="button"
                aria-pressed={picked}
                onClick={() => onChoose(choice.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  picked
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/40 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
                    // Square for multi-select, round for single — the shape
                    // says how many you may pick before you try.
                    question.isMultiSelect ? "rounded-md" : "rounded-full",
                    picked ? "border-accent bg-accent text-accent-foreground" : "border-border",
                  )}
                >
                  {picked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="text-sm">{choice.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
        <Button variant="outline" onClick={onPrev} disabled={index === 0 || busy}>
          Previous
        </Button>

        <p className="order-last w-full text-center text-xs text-muted-foreground sm:order-none sm:w-auto">
          {answeredCount} of {total} answered
        </p>

        {isLast ? (
          <Button variant="accent" onClick={onSubmit} loading={busy} loadingText="Submitting...">
            Submit quiz
          </Button>
        ) : (
          <Button variant="accent" onClick={onNext} disabled={busy}>
            Next
          </Button>
        )}
      </div>
    </section>
  );
}

function Result({
  result,
  isFinal,
  cooldown,
  onRetry,
}: {
  result: { scorePercent: number; passed: boolean; passMark: number; review: ReviewRow[] };
  isFinal: boolean;
  cooldown: number;
  onRetry: () => void;
}) {
  const { scorePercent, passed, passMark, review } = result;

  return (
    <>
      <section
        className={cn(
          "rounded-2xl border p-6 text-center",
          passed ? "border-success/30 bg-success/5" : "border-border bg-card",
        )}
      >
        <span
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            passed ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {passed ? <Award className="h-7 w-7" /> : <RotateCcw className="h-6 w-6" />}
        </span>

        <p className="mt-4 font-display text-4xl font-bold tabular-nums">
          {Math.round(scorePercent)}%
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{passMark}% needed to pass</p>

        <h1 className="mt-4 font-display text-xl font-bold">
          {passed
            ? isFinal
              ? "You've passed the final assessment"
              : "Section passed"
            : "Not quite yet"}
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {passed
            ? isFinal
              ? "Your certificate is being issued — check your certificates page."
              : "The next section is now open."
            : "Look through the answers below, then try again. Questions vary between attempts."}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {passed ? (
            <Link href={isFinal ? "/certificates" : "/dashboard/courses"}>
              <Button variant="accent">
                {isFinal ? "View certificates" : "Continue learning"}
              </Button>
            </Link>
          ) : (
            <Button variant="accent" onClick={onRetry} disabled={cooldown > 0}>
              {cooldown > 0 ? `Retry in ${formatCountdown(cooldown)}` : "Try again"}
            </Button>
          )}
        </div>
      </section>

      {/* The review is the point of failing — a score with no explanation
          teaches nothing and just invites guessing next time. */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold">Your answers</h2>

        {review.map((row, position) => (
          <div
            key={row.id}
            className={cn(
              "rounded-2xl border bg-card p-5",
              row.wasCorrect ? "border-success/30" : "border-destructive/30",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  row.wasCorrect
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {row.wasCorrect ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                )}
              </span>
              <p className="font-medium leading-snug">
                {position + 1}. {row.text}
              </p>
            </div>

            <ul className="mt-3 space-y-1.5 pl-9">
              {row.choices.map((choice) => (
                <li
                  key={choice.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                    choice.isCorrect && "bg-success/10 font-medium text-success",
                    !choice.isCorrect && choice.wasChosen && "bg-destructive/10 text-destructive",
                  )}
                >
                  {choice.isCorrect ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : choice.wasChosen ? (
                    <X className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {choice.text}
                  {choice.wasChosen && (
                    <span className="ml-auto text-[11px] opacity-70">your answer</span>
                  )}
                </li>
              ))}
            </ul>

            {row.explanation && (
              <p className="ml-9 mt-3 flex gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4 shrink-0 text-accent" />
                {row.explanation}
              </p>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
