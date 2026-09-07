"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  autoComplete,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  children?: React.ReactNode;
}) {
  const id = name;
  return (
    <label className="grid gap-1.5 text-sm" htmlFor={id}>
      <span className="font-medium text-ink-700">{label}</span>
      {children ?? (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="input"
        />
      )}
    </label>
  );
}

export function TextArea({
  label,
  name,
  required,
  defaultValue,
  rows = 4,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink-700">{label}</span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        className="input min-h-24"
      />
    </label>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button className={cn("btn", variant)} type="submit" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function FormOk({ show, message }: { show?: boolean; message: string }) {
  if (!show) return null;
  return (
    <p className="rounded-md border border-success-border bg-success-surface px-3 py-2 text-sm text-success">
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-paper-50 px-6 py-10 text-center">
      <p className="font-medium text-ink-800">{title}</p>
      {children ? (
        <div className="mt-2 text-sm text-ink-600">{children}</div>
      ) : null}
    </div>
  );
}
