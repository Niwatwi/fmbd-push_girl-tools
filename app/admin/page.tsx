"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  Wallet,
  Target,
  ArrowRight,
  Shield,
  Building2,
  ExternalLink,
} from "lucide-react";

export default function AdminHubPage() {
  const adminModules = [
    {
      title: "รายงานการลงเวลาและค่าใช้จ่าย",
      subtitle: "Attendance & Expense Report",
      description:
        "ตรวจสอบประวัติ Check-in/Check-out, พิกัด GPS, รูปถ่ายปฏิบัติงาน และคำนวณค่าแรงรายวันสำหรับฝ่ายบัญชี",
      href: "/admin/attendance-expense",
      icon: Clock,
      badge: "การลงเวลา",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      iconBg: "bg-blue-900 text-white",
      hoverBorder: "hover:border-blue-400 hover:shadow-md",
    },
    {
      title: "รายงานสรุปเงินเดือนและคอมมิชชั่น",
      subtitle: "Salary & Incentive Summary",
      description:
        "สรุปรายได้รวมพนักงาน PG (ค่าแรงรายวัน + ค่าคอมมิชชั่นสะสมตามรอบ Target ทุก 3 วัน) พร้อม Export Excel",
      href: "/admin/salary-summary",
      icon: Wallet,
      badge: "การเงิน/บัญชี",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      iconBg: "bg-emerald-600 text-white",
      hoverBorder: "hover:border-emerald-400 hover:shadow-md",
    },
    {
      title: "จัดการเป้าหมายการขายประจำสาขา",
      subtitle: "Store Target Management",
      description:
        "กำหนดเป้าหมายยอดขาย (Target Packs / Revenue) และราคาขายจำแนกราย SKU ประจำแต่ละจุดปฏิบัติงาน",
      href: "/admin/targets",
      icon: Target,
      badge: "เป้าหมายการขาย",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      iconBg: "bg-amber-600 text-white",
      hoverBorder: "hover:border-amber-400 hover:shadow-md",
    },
  ];

  return (
    <div className="min-h-screen bg-blue-500 text-slate-800 font-sans antialiased p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 🛡️ HEADER BAR */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xs">
              <Shield size={28} />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                  ระบบผู้ดูแลระบบ (Admin Management Hub)
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-600 rounded-full border border-slate-200 uppercase">
                  Push Girl Tools
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">
                ศูนย์รวมเครื่องมือจัดการข้อมูลพนักงาน PG, การลงเวลา, ค่าตอบแทน
                และเป้าหมายการขาย
              </p>
            </div>
          </div>
        </div>

        {/* 📌 MODULE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {adminModules.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group bg-white p-6 rounded-3xl border border-slate-200 shadow-xs transition-all duration-200 flex flex-col justify-between ${item.hoverBorder}`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon & Badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-3.5 rounded-2xl ${item.iconBg} shadow-xs`}
                    >
                      <IconComponent size={24} />
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  {/* Titles & Description */}
                  <div className="space-y-1.5 text-left">
                    <h2 className="text-base font-black text-slate-800 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h2>
                    <span className="text-[11px] font-bold text-slate-400 block font-mono">
                      {item.subtitle}
                    </span>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed pt-2">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Footer Button Indicator */}
                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                  <span>เข้าสู่ระบบจัดการ</span>
                  <div className="p-1.5 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 transition-colors">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 🔗 EXTERNAL LINKING NOTICE */}
        <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 text-center flex items-center justify-center gap-2">
          <ExternalLink size={15} className="text-slate-500" />
          <p className="text-xs font-medium text-slate-600">
            URL สำหรับนำไปฝังในโปรเจกต์{" "}
            <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono font-bold text-slate-800">
              fmbd-admin-tools
            </code>{" "}
            คือ:{" "}
            <span className="font-mono font-bold text-blue-600">/admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
