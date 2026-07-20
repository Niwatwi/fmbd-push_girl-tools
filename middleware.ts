import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("user_session");
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  // 1. ถ้าไม่มีคุกกี้ และพยายามเข้าหน้าแรก/หน้าทำงาน -> ดีดไปหน้า /login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. ถ้าล็อกอินอยู่แล้ว แต่จะพยายามกดเข้าหน้าล็อกอินอีก -> ดีดกลับไปหน้าแรก /
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// กำหนดให้มิดเดิลแวร์ตรวจเช็คทุกหน้า ยกเว้นไฟล์ static หรือโลโก้ภาพ
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|rvp.png).*)"],
};
