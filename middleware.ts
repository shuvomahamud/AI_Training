import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySession(token) : null;

  if (pathname.startsWith("/admin")) {
    if (!user) return loginRedirect(request);
    if (user.role !== "admin") {
      return NextResponse.rewrite(new URL("/__not-found", request.url));
    }
  }

  if (pathname === "/me" && !user) {
    return loginRedirect(request);
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    const dest = user.role === "admin" ? "/admin" : "/courses";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/me", "/login", "/signup"],
};
