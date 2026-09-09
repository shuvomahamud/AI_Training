import { deleteRecordingAction } from "@/actions/recordings";
import { LocalDate } from "./local-time";

export function RecordingAdminList({
  recordings,
}: {
  recordings: {
    id: string;
    label: string;
    url: string;
    recordedAt: Date | null;
  }[];
}) {
  if (recordings.length === 0) {
    return (
      <p className="rounded-lg border border-warn-border bg-warn-surface px-3 py-2 text-sm text-warn">
        No recording links yet.
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {recordings.map((recording) => (
        <li
          key={recording.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <span className="min-w-0">
            <a
              className="underline"
              href={recording.url}
              target="_blank"
              rel="noreferrer"
            >
              {recording.label}
            </a>
            {recording.recordedAt ? (
              <span className="ml-2 text-ink-500">
                <LocalDate iso={recording.recordedAt.toISOString()} />
              </span>
            ) : null}
          </span>
          <form action={deleteRecordingAction}>
            <input type="hidden" name="id" value={recording.id} />
            <button className="btn danger" type="submit">
              Delete
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
