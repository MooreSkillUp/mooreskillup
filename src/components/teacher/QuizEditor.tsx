"use client";

import { useState } from "react";
import { AlertTriangle, Check, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { emptyQuestion, type TeacherQuestion, type TeacherQuiz } from "@/lib/teacher-quizzes";
import { cn } from "@/lib/utils";

/**
 * Writing a quiz.
 *
 * Two things this has to get right, because both strand students rather than
 * merely annoying them:
 *
 * 1. A question with no correct answer can never be passed. The server refuses
 *    to serve a quiz containing one, so the editor warns here rather than
 *    letting a teacher publish and wonder why nothing happens.
 * 2. Serving fewer questions than were written is what makes unlimited retries
 *    safe. It is explained in place, because a teacher who does not know that
 *    writes exactly five questions and wonders why students memorise them.
 */
export function QuizEditor({
  quiz,
  onUpdateQuiz,
  onSaveQuestion,
  onDeleteQuestion,
  onDeleteQuiz,
}: {
  quiz: TeacherQuiz;
  onUpdateQuiz: (patch: Record<string, unknown>) => Promise<void>;
  onSaveQuestion: (question: TeacherQuestion) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onDeleteQuiz: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<TeacherQuestion | null>(null);
  const [busy, setBusy] = useState(false);

  const unanswerable = quiz.questions.filter((q) => !q.choices.some((c) => c.isCorrect));
  const served = quiz.questionsPerAttempt || quiz.questionCount;

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await onSaveQuestion({ ...draft, order: draft.order ?? quiz.questions.length });
      setDraft(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{quiz.title || "Untitled quiz"}</h4>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                quiz.isReady
                  ? "bg-success/15 text-success"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              )}
            >
              {quiz.isReady ? "Live" : quiz.isPublished ? "Not usable" : "Draft"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quiz.questionCount} written · {served} served each attempt · {quiz.passMarkPercent}% to
            pass
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onDeleteQuiz()}
          className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete quiz"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* A published quiz the server will not serve is the one failure mode that
          silently blocks a student, so it is called out loudly. */}
      {quiz.isPublished && !quiz.isReady && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {quiz.questionCount === 0
            ? "This quiz has no questions yet, so students won't see it."
            : `${unanswerable.length} question${
                unanswerable.length === 1 ? " has" : "s have"
              } no correct answer marked. Students can't pass it until that is fixed.`}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Input
          label="Pass mark (%)"
          type="number"
          min={1}
          max={100}
          value={String(quiz.passMarkPercent)}
          onChange={(event) =>
            void onUpdateQuiz({ passMarkPercent: Number(event.target.value) || 70 })
          }
        />
        <Input
          label="Questions per attempt"
          type="number"
          min={0}
          value={String(quiz.questionsPerAttempt)}
          onChange={(event) =>
            void onUpdateQuiz({ questionsPerAttempt: Number(event.target.value) || 0 })
          }
        />
        <label className="flex items-end gap-2.5 pb-2 text-sm">
          <input
            type="checkbox"
            checked={quiz.isPublished}
            onChange={(event) => void onUpdateQuiz({ isPublished: event.target.checked })}
            className="h-4 w-4 rounded border-border accent-[var(--color-accent)]"
          />
          Visible to students
        </label>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Write more questions than you serve — each attempt then draws a different set, so students
        can retry freely without memorising the answers. Set to 0 to serve every question.
      </p>

      <ul className="mt-5 space-y-2">
        {quiz.questions.map((question, index) => {
          const noAnswer = !question.choices.some((c) => c.isCorrect);
          return (
            <li
              key={question.id ?? index}
              className={cn(
                "rounded-xl border p-3",
                noAnswer ? "border-amber-500/40 bg-amber-500/5" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {index + 1}. {question.text || "Untitled question"}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {question.choices.map((choice, choiceIndex) => (
                      <span
                        key={choiceIndex}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                          choice.isCorrect
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {choice.isCorrect && <Check className="h-3 w-3" strokeWidth={3} />}
                        {choice.text || "(empty)"}
                      </span>
                    ))}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraft({ ...question })}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Edit
                  </button>
                  {question.id && (
                    <button
                      type="button"
                      onClick={() => void onDeleteQuestion(question.id as string)}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {draft ? (
        <QuestionForm
          draft={draft}
          busy={busy}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={save}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setDraft(emptyQuestion(quiz.questions.length))}
        >
          <Plus className="h-4 w-4" />
          Add question
        </Button>
      )}
    </div>
  );
}

function QuestionForm({
  draft,
  busy,
  onChange,
  onCancel,
  onSave,
}: {
  draft: TeacherQuestion;
  busy: boolean;
  onChange: (next: TeacherQuestion) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const hasCorrect = draft.choices.some((c) => c.isCorrect);
  const filled = draft.text.trim() && draft.choices.filter((c) => c.text.trim()).length >= 2;

  const setChoice = (index: number, patch: { text?: string; isCorrect?: boolean }) =>
    onChange({
      ...draft,
      choices: draft.choices.map((choice, i) => (i === index ? { ...choice, ...patch } : choice)),
    });

  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <Textarea
        value={draft.text}
        onChange={(event) => onChange({ ...draft, text: event.target.value })}
        placeholder="What do you want to ask?"
        className="min-h-20 bg-background"
      />

      <div className="mt-3 space-y-2">
        {draft.choices.map((choice, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* Tick every correct answer. More than one turns this into a
                select-all, which the student UI adapts to on its own. */}
            <button
              type="button"
              onClick={() => setChoice(index, { isCorrect: !choice.isCorrect })}
              aria-pressed={choice.isCorrect}
              aria-label={choice.isCorrect ? "Marked correct" : "Mark as correct"}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
                choice.isCorrect
                  ? "border-success bg-success text-white"
                  : "border-border hover:border-success/50",
              )}
            >
              {choice.isCorrect && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </button>

            <Input
              value={choice.text}
              onChange={(event) => setChoice(index, { text: event.target.value })}
              placeholder={`Option ${index + 1}`}
              className="flex-1"
            />

            {draft.choices.length > 2 && (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...draft, choices: draft.choices.filter((_, i) => i !== index) })
                }
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                aria-label="Remove option"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({ ...draft, choices: [...draft.choices, { text: "", isCorrect: false }] })
        }
        className="mt-2 text-xs font-semibold text-primary transition-colors hover:text-accent"
      >
        + Add option
      </button>

      <Textarea
        value={draft.explanation}
        onChange={(event) => onChange({ ...draft, explanation: event.target.value })}
        placeholder="Explain the answer — shown after they submit, right or wrong."
        className="mt-3 min-h-16 bg-background"
      />

      {!hasCorrect && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Mark at least one option correct, or nobody can pass this question.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="accent"
          size="sm"
          disabled={!filled || !hasCorrect}
          loading={busy}
          loadingText="Saving..."
          onClick={onSave}
        >
          Save question
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
