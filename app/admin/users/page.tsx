import { PasswordResetForm, RoleForm } from "@/components/user-forms";
import { LocalDate } from "@/components/local-time";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  await requireAdmin();
  const list = await db.query.users.findMany({
    orderBy: (table, { asc }) => [asc(table.email)],
  });

  return (
    <div>
      <h1 className="font-serif text-3xl">Users</h1>
      <ul className="mt-6 grid gap-4">
        {list.map((user) => (
          <li key={user.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium">
              {user.name}{" "}
              <span className="font-normal text-ink-500">{user.email}</span>
            </p>
            <p className="text-sm text-ink-500">
              Joined <LocalDate iso={user.createdAt.toISOString()} />
            </p>
            <div className="mt-3 grid gap-3">
              <RoleForm userId={user.id} role={user.role} />
              <PasswordResetForm userId={user.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
