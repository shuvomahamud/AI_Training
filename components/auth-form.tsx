"use client";

import { useActionState } from "react";
import { loginAction, signupAction, type AuthState } from "@/actions/auth";
import { Field, FormError, SubmitButton } from "./ui";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, null);
  return (
    <form action={action} className="grid gap-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      <FormError message={state?.error} />
      <SubmitButton>Log in</SubmitButton>
    </form>
  );
}

export function SignupForm({ nextPath }: { nextPath?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signupAction, null);
  return (
    <form action={action} className="grid gap-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Field label="Name" name="name" required autoComplete="name" />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <FormError message={state?.error} />
      <SubmitButton>Create account</SubmitButton>
    </form>
  );
}
