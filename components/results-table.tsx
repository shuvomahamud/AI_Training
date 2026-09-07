"use client";

import { Fragment, useMemo, useState } from "react";
import { LocalDate } from "./local-time";

type AttemptRow = {
  id: string;
  learner: string;
  email: string;
  quizTitle: string;
  versionNumber: number;
  score: number;
  maxScore: number;
  passed: boolean;
  safetyCriticalPassed: boolean;
  submittedAt: string;
  answers: Record<string, string[]>;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; text: string }>;
    correct: string[];
  }>;
};

export function ResultsTable({ attempts }: { attempts: AttemptRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<string, AttemptRow[]>();
    for (const attempt of attempts) {
      const list = map.get(attempt.email) ?? [];
      list.push(attempt);
      map.set(attempt.email, list);
    }
    return [...map.entries()];
  }, [attempts]);

  if (attempts.length === 0) {
    return <p className="text-sm text-ink-600">No attempts yet.</p>;
  }

  return (
    <div className="grid gap-6">
      {grouped.map(([email, rows]) => (
        <section key={email} className="overflow-x-auto rounded-xl border border-border">
          <header className="border-b border-border bg-paper-50 px-4 py-2 text-sm">
            <span className="font-medium">{rows[0].learner}</span>{" "}
            <span className="text-ink-500">{email}</span>
          </header>
          <table className="w-full text-left text-sm">
            <thead className="text-ink-500">
              <tr>
                <th className="px-4 py-2 font-medium">Quiz</th>
                <th className="px-4 py-2 font-medium">Ver.</th>
                <th className="px-4 py-2 font-medium">Score</th>
                <th className="px-4 py-2 font-medium">Passed</th>
                <th className="px-4 py-2 font-medium">Safety</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr className="border-t border-ink-100">
                    <td className="px-4 py-2">
                      <button
                        className="text-left font-medium underline-offset-2 hover:underline"
                        type="button"
                        onClick={() =>
                          setOpenId((current) => (current === row.id ? null : row.id))
                        }
                      >
                        {row.quizTitle}
                      </button>
                    </td>
                    <td className="px-4 py-2">{row.versionNumber}</td>
                    <td className="px-4 py-2">
                      {row.score}/{row.maxScore}
                    </td>
                    <td className="px-4 py-2">{row.passed ? "Yes" : "No"}</td>
                    <td className="px-4 py-2">
                      {row.safetyCriticalPassed ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-2">
                      <LocalDate iso={row.submittedAt} />
                    </td>
                  </tr>
                  {openId === row.id ? (
                    <tr key={`${row.id}-detail`} className="border-t border-ink-100 bg-paper-50">
                      <td className="px-4 py-3" colSpan={6}>
                        <ul className="grid gap-3">
                          {row.questions.map((question) => {
                            const given = row.answers[question.id] ?? [];
                            return (
                              <li key={question.id}>
                                <p className="font-medium">{question.prompt}</p>
                                <p className="text-ink-600">
                                  Answered:{" "}
                                  {given
                                    .map(
                                      (id) =>
                                        question.options.find((option) => option.id === id)
                                          ?.text ?? id,
                                    )
                                    .join(", ") || "—"}
                                </p>
                                <p className="text-ink-600">
                                  Correct:{" "}
                                  {question.correct
                                    .map(
                                      (id) =>
                                        question.options.find((option) => option.id === id)
                                          ?.text ?? id,
                                    )
                                    .join(", ")}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
