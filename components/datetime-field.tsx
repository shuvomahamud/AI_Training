"use client";

import { useMemo, useState } from "react";

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DateTimeField({
  name,
  label,
  defaultIso,
}: {
  name: string;
  label: string;
  defaultIso?: string | null;
}) {
  const [value, setValue] = useState(
    defaultIso ? toLocalInput(new Date(defaultIso)) : "",
  );
  const iso = useMemo(() => (value ? new Date(value).toISOString() : ""), [value]);

  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink-700">{label}</span>
      <input
        className="input"
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <input type="hidden" name={name} value={iso} />
    </label>
  );
}
