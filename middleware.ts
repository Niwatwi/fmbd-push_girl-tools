import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔓 1. ข้ามการตรวจสอบสิทธิ์สำหรับหน้า /customer-portal (เข้าชมได้ฟรีโดยไม่ต้องล็อกอิน)
  if (pathname.startsWith("/customer-portal")) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 🔒 2. โค้ดสำหรับตรวจสอบการ Login / Session เดิมของคุณ (ถ้ามี)
  // -------------------------------------------------------------

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
     * - customer-portal (หน้าพอร์ตัลลูกค้า)
     */
    "/((?!_next/static|_next/image|favicon.ico|customer-portal|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
