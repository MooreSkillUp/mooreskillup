import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { ProgressBar } from "@/components/ui-kit/ProgressBar";
import { findQuiz, type Quiz } from "@/lib/quiz-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quiz/$id")({
  loader: ({ params }): { quiz: Quiz } => {
    const quiz = findQuiz(params.id);
    if (!quiz) throw notFound();
    return { quiz };
  },
  component: QuizPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Quiz not found</h1>
        <Link to="/courses">
          <Button variant="outline" className="mt-4">Back to courses</Button>
        </Link>
      </div>
    </AppShell>
  ),
});

function QuizPage() {
  const { quiz } = Route.useLoaderData() as { quiz: Quiz };
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = quiz.questions.length;
  const current = quiz.questions[step];
  const progress = Math.round(((step + (showFeedback ? 1 : 0)) / total) * 100);

  const score = answers.reduce(
    (acc, a, i) => acc + (a === quiz.questions[i].correctIndex ? 1 : 0),
    0,
  );
  const scorePct = Math.round((score / total) * 100);
  const passed = scorePct >= quiz.passingScore;

  const submit = () => {
    if (selected === null) return;
    setAnswers((a) => [...a, selected]);
    setShowFeedback(true);
  };

  const next = () => {
    if (step + 1 >= total) {
      setFinished(true);
    } else {
      setStep((s) => s + 1);
      setSelected(null);
      setShowFeedback(false);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers([]);
    setSelected(null);
    setShowFeedback(false);
    setFinished(false);
  };

  if (finished) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          >
            <div
              className={cn(
                "p-8 text-center text-white",
                passed
                  ? "bg-gradient-to-br from-primary to-primary-glow"
                  : "bg-gradient-to-br from-muted-foreground to-muted-foreground/70",
              )}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur"
              >
                {passed ? <Trophy className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
              </motion.div>
              <h1 className="mt-5 font-display text-3xl font-bold">
                {passed ? "Quiz passed! 🎉" : "Almost there"}
              </h1>
              <p className="mt-1 text-white/85">
                You scored <strong>{score}/{total}</strong> ({scorePct}%)
              </p>
            </div>

            <div className="space-y-5 p-6">
              {passed && (
                <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm">
                  <Sparkles className="h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <div className="font-semibold text-foreground">+{quiz.pointsReward} points earned</div>
                    <div className="text-muted-foreground">Added to your leaderboard standing.</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Question breakdown
                </div>
                {quiz.questions.map((q, i) => {
                  const ok = answers[i] === q.correctIndex;
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm"
                    >
                      <span className="truncate pr-3">
                        {i + 1}. {q.question}
                      </span>
                      {ok ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={restart} variant="outline">
                  <RotateCcw className="h-4 w-4" /> Retake quiz
                </Button>
                {passed && (
                  <Link to="/certificates" className="inline-flex">
                    <Button variant="accent">
                      View certificates <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link to="/course/$id" params={{ id: quiz.courseId }}>
                  <Button variant="ghost">Back to course</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">Quiz</div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{quiz.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{quiz.description}</p>
        </div>

        <ProgressBar value={progress} label={`Question ${step + 1} of ${total}`} />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-display text-xl font-semibold leading-snug">{current.question}</h2>
            <div className="mt-5 space-y-2.5">
              {current.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect = i === current.correctIndex;
                const showState = showFeedback && (isSelected || isCorrect);
                return (
                  <button
                    key={i}
                    disabled={showFeedback}
                    onClick={() => setSelected(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border-2 px-4 py-3.5 text-left text-sm font-medium transition-all",
                      !showFeedback &&
                        (isSelected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"),
                      showState && isCorrect && "border-success bg-success/10 text-foreground",
                      showState && !isCorrect && isSelected && "border-destructive bg-destructive/10 text-foreground",
                      showFeedback && !showState && "border-border bg-background opacity-60",
                    )}
                  >
                    <span>{opt}</span>
                    {showState && isCorrect && <CheckCircle2 className="h-5 w-5 text-success" />}
                    {showState && !isCorrect && isSelected && <XCircle className="h-5 w-5 text-destructive" />}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                    <div className="font-semibold text-foreground">Explanation</div>
                    <p className="mt-1 text-muted-foreground">{current.explanation}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Pass mark: {quiz.passingScore}% · Reward: +{quiz.pointsReward} pts
              </span>
              {!showFeedback ? (
                <Button onClick={submit} disabled={selected === null} variant="primary">
                  Submit answer
                </Button>
              ) : (
                <Button onClick={next} variant="accent">
                  {step + 1 >= total ? "See results" : "Next question"} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
