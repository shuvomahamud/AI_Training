"use client";

import { useMemo, useState } from "react";
import { submitQuizAction } from "@/actions/quizzes";
import type { QuizPayload } from "@/lib/quiz/schema";

type ClientQuestion = Omit<QuizPayload["questions"][number], "correct" | "explanation">;

type Result = {
  score: number;
  maxScore: number;
  passed: boolean;
  safetyCriticalPassed: boolean;
  attemptNumber: number;
  perQuestion: Array<{
    questionId: string;
    correct: boolean;
    explanation: string;
    safetyCritical: boolean;
  }>;
};

export function QuizRunner({
  quizId,
  title,
  questions,
}: {
  quizId: string;
  title: string;
  questions: ClientQuestion[];
}) {
  const startedAt = useMemo(() => new Date().toISOString(), []);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setSingle(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: [optionId] }));
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((current) => {
      const existing = current[questionId] ?? [];
      const next = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];
      return { ...current, [questionId]: next };
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await submitQuizAction({
      quizId,
      startedAt,
      answers,
    });
    setBusy(false);
    if ("error" in response) {
      setError(response.error);
      return;
    }
    setResult(response);
  }

  function reset() {
    setAnswers({});
    setResult(null);
    setError(null);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <h3 className="font-serif text-xl">{title}</h3>
      {questions.map((question, index) => {
        const feedback = result?.perQuestion.find(
          (item) => item.questionId === question.id,
        );
        const selected = answers[question.id] ?? [];
        return (
          <fieldset
            key={question.id}
            className="rounded-xl border border-ink-200 bg-white p-4"
          >
            <legend className="px-1 font-medium text-ink-900">
              {index + 1}. {question.prompt}
              {question.safetyCritical ? (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  Safety-critical
                </span>
              ) : null}
            </legend>
            <div className="mt-3 grid gap-2">
              {question.options.map((option) => {
                const inputType =
                  question.type === "multiple" ? "checkbox" : "radio";
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-paper-100"
                  >
                    <input
                      className="mt-1"
                      type={inputType}
                      name={`${question.id}`}
                      value={option.id}
                      checked={selected.includes(option.id)}
                      disabled={Boolean(result) || busy}
                      onChange={() =>
                        question.type === "multiple"
                          ? toggleMultiple(question.id, option.id)
                          : setSingle(question.id, option.id)
                      }
                    />
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>
            {feedback ? (
              <p
                className={`mt-3 text-sm ${feedback.correct ? "text-teal-800" : "text-red-800"}`}
              >
                {feedback.correct ? "Correct. " : "Not quite. "}
                {feedback.explanation}
              </p>
            ) : null}
          </fieldset>
        );
      })}

      {error ? <p className="text-sm text-red-800">{error}</p> : null}

      {result ? (
        <div className="rounded-xl border border-ink-200 bg-paper-50 p-4 text-sm">
          <p>
            Attempt {result.attemptNumber}: {result.score}/{result.maxScore}.{" "}
            {result.passed ? "Passed the score bar." : "Did not reach the passing score."}{" "}
            {result.safetyCriticalPassed
              ? "All safety-critical items were correct."
              : "One or more safety-critical items were missed."}
          </p>
          <button className="btn secondary mt-3" type="button" onClick={reset}>
            Take again
          </button>
        </div>
      ) : (
        <button className="btn primary w-fit" type="submit" disabled={busy}>
          {busy ? "Scoring…" : "Submit quiz"}
        </button>
      )}
    </form>
  );
}
