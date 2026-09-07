"use client";

import { useActionState } from "react";
import {
  resetUserPasswordAction,
  updateUserRoleAction,
  type ActionState,
} from "@/actions/users";
import { Field, FormError, FormOk, SubmitButton } from "./ui";

export function RoleForm({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updateUserRoleAction,
    null,
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink-700">Role</span>
        <select className="input" name="role" defaultValue={role}>
          <option value="learner">Learner</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <SubmitButton variant="secondary">Update role</SubmitButton>
      <FormError message={state && "error" in state ? state.error : undefined} />
    </form>
  );
}

export function PasswordResetForm({ userId }: { userId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    resetUserPasswordAction,
    null,
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Field label="New password" name="password" type="password" required />
      <SubmitButton variant="secondary">Reset password</SubmitButton>
      <FormError message={state && "error" in state ? state.error : undefined} />
      <FormOk show={state !== null && "ok" in state} message="Password updated." />
    </form>
  );
}
