import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="border-b border-ink-200/80 bg-paper-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={user ? "/courses" : "/"} className="font-serif text-lg tracking-tight">
          Learning Portal
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="nav-link" href="/courses">
            Courses
          </Link>
          {user ? (
            <>
              <Link className="nav-link" href="/me">
                My attempts
              </Link>
              {user.role === "admin" ? (
                <Link className="nav-link" href="/admin">
                  Admin
                </Link>
              ) : null}
              <form action={logoutAction}>
                <button className="nav-link" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="nav-link" href="/login">
                Log in
              </Link>
              <Link className="btn primary !px-3 !py-1.5 !text-sm" href="/signup">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
