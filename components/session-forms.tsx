"use client";

import { useActionState } from "react";
import {
  createSessionAction,
  updateSessionAction,
  type ActionState,
} from "@/actions/sessions";
import { DateTimeField } from "./datetime-field";
import { Field, FormError, FormOk, SubmitButton, TextArea } from "./ui";

export function CreateSessionForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    createSessionAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <Field label="Title" name="title" required />
      <Field
        label="Module title"
        name="moduleTitle"
        placeholder="Unit 1 — AI Foundations"
      />
      <TextArea label="Summary" name="summary" />
      <Field label="Session live URL" name="liveUrl" type="url" />
      <DateTimeField name="scheduledAt" label="Scheduled at" />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <SubmitButton>Add session</SubmitButton>
    </form>
  );
}

export function EditSessionForm({
  id,
  title,
  summary,
  moduleTitle,
  liveUrl,
  scheduledAt,
}: {
  id: string;
  title: string;
  summary: string;
  moduleTitle: string;
  liveUrl: string;
  scheduledAt: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateSessionAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Title" name="title" required defaultValue={title} />
      <Field label="Module title" name="moduleTitle" defaultValue={moduleTitle} />
      <TextArea label="Summary" name="summary" defaultValue={summary} />
      <Field label="Session live URL" name="liveUrl" type="url" defaultValue={liveUrl} />
      <DateTimeField name="scheduledAt" label="Scheduled at" defaultIso={scheduledAt} />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <FormOk show={state !== null && "ok" in state} message="Session saved." />
      <SubmitButton>Save session</SubmitButton>
    </form>
  );
}
