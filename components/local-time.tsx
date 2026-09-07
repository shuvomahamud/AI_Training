"use client";

import { useEffect, useState } from "react";

export function LocalDate({
  iso,
  dateStyle = "medium",
  timeStyle = "short",
}: {
  iso: string;
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"] | null;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { dateStyle };
    if (timeStyle) options.timeStyle = timeStyle;
    setText(new Date(iso).toLocaleString(undefined, options));
  }, [iso, dateStyle, timeStyle]);

  return <time dateTime={iso}>{text || "…"}</time>;
}
