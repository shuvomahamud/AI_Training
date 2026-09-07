"use client";

import { useActionState } from "react";
import {
  requestEnrollmentAction,
  type ActionState,
} from "@/actions/enrollments";
import { FormError, SubmitButton } from "./ui";

export function EnrollmentButton({
  courseId,
  status,
}: {
  courseId: string;
  status: "none" | "pending" | "rejected";
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    requestEnrollmentAction,
    null,
  );

  if (status === "pending") {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Access requested. An admin will approve it before you can open the
        sessions.
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <FormError message={state && "error" in state ? state.error : undefined} />
      <SubmitButton>
        {status === "rejected" ? "Request access again" : "Request access"}
      </SubmitButton>
    </form>
  );
}
