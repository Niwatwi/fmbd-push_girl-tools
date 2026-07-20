"use server";

import React, { Suspense } from "react";
import DashboardClient from "./DashboardClient";

// 🌟 ตัวจัดการฝั่ง Server: รองรับการอ่าน Query Parameters จาก URL หลังบ้าน
interface PageProps {
  searchParams: Promise<{ userId?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const userId = resolvedParams.userId
    ? parseInt(resolvedParams.userId, 10)
    : 96; // ค่าเริ่มต้นเป็น 96 ถ้าไม่พบตัวแปร

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-bold">
              กำลังโหลดข้อมูลผลงาน...
            </p>
          </div>
        </div>
      }
    >
      <DashboardClient userId={userId} />
    </Suspense>
  );
}
