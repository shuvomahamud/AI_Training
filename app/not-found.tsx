import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-serif text-5xl text-border-strong">404</p>
      <h1 className="mt-4 font-serif text-2xl">Page not found</h1>
      <p className="mt-2 text-ink-600">
        That page is missing, or you do not have access to it.
      </p>
      <Link className="btn primary mt-6 inline-flex" href="/courses">
        Back to courses
      </Link>
    </div>
  );
}
