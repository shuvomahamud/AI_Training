"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-serif text-2xl">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-600">
        The request could not be completed. Please try again.
      </p>
      <button className="btn primary mt-6" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
