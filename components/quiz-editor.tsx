"use client";

import { useActionState, useState } from "react";
import {
  createQuizAction,
  updateQuizAction,
  type QuizActionState,
} from "@/actions/quizzes";
import { FormError, FormOk, SubmitButton } from "./ui";

const STARTER_QUIZ = `{
  "title": "Section quiz",
  "passingScore": 2,
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "prompt": "Replace this with a real question.",
      "options": [
        { "id": "a", "text": "The correct answer" },
        { "id": "b", "text": "An incorrect answer" }
      ],
      "correct": ["a"],
      "explanation": "Say why this is right.",
      "safetyCritical": false
    },
    {
      "id": "q2",
      "type": "truefalse",
      "prompt": "Replace this with a true/false statement.",
      "options": [
        { "id": "true", "text": "True" },
        { "id": "false", "text": "False" }
      ],
      "correct": ["true"],
      "explanation": "Say why this is true or false.",
      "safetyCritical": false
    }
  ]
}`;

function QuizJsonForm({
  action,
  hidden,
  initialJson,
  submitLabel,
}: {
  action: (state: QuizActionState, formData: FormData) => Promise<QuizActionState>;
  hidden: Record<string, string>;
  initialJson?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [json, setJson] = useState(initialJson ?? "");

  return (
    <form action={formAction} className="grid gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="json" value={json} />
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-ink-700">Quiz JSON</span>
        <textarea
          className="input min-h-64 font-mono text-xs"
          value={json}
          onChange={(event) => setJson(event.target.value)}
          required
          spellCheck={false}
        />
      </label>
      <label className="text-sm text-ink-600">
        Or upload a .json file{" "}
        <input
          className="ml-2 text-sm"
          type="file"
          accept="application/json,.json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setJson(await file.text());
            event.target.value = "";
          }}
        />
      </label>
      <FormError message={state && "error" in state ? state.error : undefined} />
      {state && "issues" in state && state.issues ? (
        <ul className="list-disc pl-5 text-sm text-danger">
          {state.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      <FormOk show={state !== null && "ok" in state} message="Quiz saved." />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

export function CreateQuizForm({ sessionId }: { sessionId: string }) {
  return (
    <QuizJsonForm
      action={createQuizAction}
      hidden={{ sessionId }}
      initialJson={STARTER_QUIZ}
      submitLabel="Add quiz"
    />
  );
}

export function EditQuizForm({
  quizId,
  initialJson,
}: {
  quizId: string;
  initialJson: string;
}) {
  return (
    <QuizJsonForm
      action={updateQuizAction}
      hidden={{ quizId }}
      initialJson={initialJson}
      submitLabel="Save as new version"
    />
  );
}
