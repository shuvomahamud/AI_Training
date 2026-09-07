import { SignupForm } from "@/components/auth-form";
import Link from "next/link";

export const metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-3xl">Create an account</h1>
      <p className="mt-2 text-sm text-ink-600">
        Already registered?{" "}
        <Link className="underline" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
          Log in
        </Link>
      </p>
      <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <SignupForm nextPath={next} />
      </div>
    </div>
  );
}
