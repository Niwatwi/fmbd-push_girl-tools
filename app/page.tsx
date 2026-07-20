import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PghMainHubClient from "./PghMainHubClient";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");

  // 1. ถ้าไม่มีคุกกี้เซสชัน ให้ดีดกลับไปหน้าล็อกอินทันที
  if (!sessionCookie) {
    redirect("/login");
  }

  let userData = null;
  try {
    userData = JSON.parse(sessionCookie.value);
  } catch (e) {
    redirect("/login");
  }

  // 2. ส่งข้อมูลผู้ใช้จริงไปให้ฝั่ง Client UI เรนเดอร์หน้าจอต่อ
  return <PghMainHubClient user={userData} />;
}
