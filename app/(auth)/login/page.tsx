import { LoginForm } from "@/components/auth-form";
import Link from "next/link";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">Log in</h1>
      <p className="mt-2 text-sm text-ink-600">
        New here?{" "}
        <Link className="underline" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>
          Create an account
        </Link>
        . An account does not grant course access until an admin approves you.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <LoginForm nextPath={next} />
      </div>
    </div>
  );
}
