"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  confirm,
  variant = "danger",
}: {
  children: React.ReactNode;
  confirm: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn("btn", variant)}
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? "Deleting…" : children}
    </button>
  );
}
