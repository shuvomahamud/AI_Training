"use client";

import { useActionState } from "react";
import {
  addRecordingAction,
  type ActionState,
} from "@/actions/recordings";
import { DateTimeField } from "./datetime-field";
import { Field, FormError, FormOk, SubmitButton } from "./ui";

export function AddRecordingForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    addRecordingAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <Field label="Label" name="label" required placeholder="Session 1 recording" />
      <Field
        label="Recording URL"
        name="url"
        type="url"
        required
        placeholder="https://"
      />
      <DateTimeField name="recordedAt" label="Recorded at" />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <FormOk show={state !== null && "ok" in state} message="Recording added." />
      <SubmitButton>Add recording</SubmitButton>
    </form>
  );
}

export function AddRecordingToSectionForm({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addRecordingAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <label className="grid gap-1.5 text-sm" htmlFor="sessionId">
        <span className="font-medium text-ink-700">Section</span>
        <select id="sessionId" name="sessionId" required className="input">
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </label>
      <Field label="Label" name="label" required placeholder="Session 1 recording" />
      <Field label="Recording URL" name="url" type="url" required placeholder="https://" />
      <DateTimeField name="recordedAt" label="Recorded at" />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <FormOk show={state !== null && "ok" in state} message="Recording link added." />
      <SubmitButton>Add recording link</SubmitButton>
    </form>
  );
}
