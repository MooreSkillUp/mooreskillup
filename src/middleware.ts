import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "mooreskillup.session";
const ROLE_COOKIE = "mooreskillup.role";

const PROTECTED_PREFIXES = ["/teacher", "/admin", "/dashboard", "/my-learning", "/profile", "/checkout"];

function homeRouteForRole(role: string | undefined) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "teacher") return "/teacher/dashboard";
  return "/dashboard";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/teacher/uploads" || pathname.startsWith("/teacher/uploads/")) {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const role = request.cookies.get(ROLE_COOKIE)?.value;

  if (!hasSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/teacher") && role && role !== "teacher" && role !== "admin") {
    return NextResponse.redirect(new URL(homeRouteForRole(role), request.url));
  }

  if (pathname.startsWith("/admin") && role && role !== "admin") {
    return NextResponse.redirect(new URL(homeRouteForRole(role), request.url));
  }

  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/my-learning") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/checkout")) &&
    role &&
    role !== "student"
  ) {
    return NextResponse.redirect(new URL(homeRouteForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
