"use client";

import { useActionState } from "react";
import { createCourseAction, updateCourseAction, type ActionState } from "@/actions/courses";
import { Field, FormError, FormOk, SubmitButton, TextArea } from "./ui";

export function CreateCourseForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    createCourseAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <Field label="Title" name="title" required />
      <TextArea label="Summary" name="summary" />
      <Field
        label="Course live URL"
        name="liveUrl"
        type="url"
        placeholder="https://meet.google.com/..."
      />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <SubmitButton>Create course</SubmitButton>
    </form>
  );
}

export function EditCourseForm({
  id,
  title,
  summary,
  liveUrl,
  slug,
}: {
  id: string;
  title: string;
  summary: string;
  liveUrl: string;
  slug: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateCourseAction,
    null,
  );
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Title" name="title" required defaultValue={title} />
      <Field label="Slug" name="slug" defaultValue={slug} />
      <TextArea label="Summary" name="summary" defaultValue={summary} />
      <Field
        label="Course live URL"
        name="liveUrl"
        type="url"
        defaultValue={liveUrl}
      />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <FormOk show={state !== null && "ok" in state} message="Course saved." />
      <SubmitButton>Save course</SubmitButton>
    </form>
  );
}
