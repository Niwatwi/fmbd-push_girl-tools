import { NextResponse, type NextRequest } from "next/server";
import { verifyUserSessionToken } from "@/utils/session-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiresAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/customer-portal");
  if (!requiresAdmin) {
    return NextResponse.next();
  }

  const session = await verifyUserSessionToken(
    request.cookies.get("user_session")?.value,
  );
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * ยกเว้นการทำงานของ Middleware กับ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ไฟล์รูปภาพใน public (png, jpg, svg, ฯลฯ)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
