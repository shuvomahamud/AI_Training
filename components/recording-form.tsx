"use client";

import { useActionState } from "react";
import {
  addRecordingAction,
  type ActionState,
} from "@/actions/recordings";
import { DateTimeField } from "./datetime-field";
import { Field, FormError, FormOk, SubmitButton } from "./ui";

export function AddRecordingForm({
  courseId,
  courses,
}: {
  courseId?: string;
  courses?: { id: string; title: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    addRecordingAction,
    null,
  );
  const picker = courses && courses.length > 0;

  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      {picker ? (
        <label className="grid gap-1.5 text-sm" htmlFor="courseId">
          <span className="font-medium text-ink-700">Course</span>
          <select
            id="courseId"
            name="courseId"
            required
            defaultValue={courseId}
            className="input"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="courseId" value={courseId ?? ""} />
      )}
      <Field label="Label" name="label" required placeholder="Live session recording" />
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
