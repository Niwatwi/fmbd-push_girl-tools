"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Target,
  TrendingUp,
  ShoppingBag,
  Award,
  ArrowLeft,
  Sparkles,
  Zap,
  Coins,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DashboardClientProps {
  userId: number;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const router = useRouter();

  // ข้อมูลส่วนตัวจำลองของพนักงาน (รอบหน้าสามารถยิงดึงจากตาราง profiles ในฐานข้อมูลได้ครับ)
  const [pgName] = useState("นางสาวพิชญา สระทองลี");
  const [storeName] = useState("Tops แจ้งวัฒนะ");

  // ยอดขายสะสมของวันนี้ (Green + Blue + Orange) ที่บันทึกผ่านฟอร์ม RVI เข้าไป
  const [todaySales] = useState({
    totalPacks: 36,
    totalRevenue: 4890,
    greenQty: 16,
    blueQty: 12,
    orangeQty: 8,
  });

  // 🎯 ตั้งเป้าหมายประจำเดือนเพื่อล่ารางวัล Incentive
  const [monthlyTarget] = useState(100); // เป้า 100 แพ็ค
  const [currentMonthlyProgress] = useState(76); // ขายสะสมไปแล้ว 76 แพ็ค

  // คำนวณเปอร์เซ็นต์ความสำเร็จของภารกิจล่ารางวัล
  const progressPercent = Math.min(
    100,
    Math.round((currentMonthlyProgress / monthlyTarget) * 100),
  );
  const remainingPacks = Math.max(0, monthlyTarget - currentMonthlyProgress);

  // คำนวณเงินรางวัลสะสมคร่าวๆ เพื่อกระตุ้นยอดขาย (สมมติแพ็คละ 10 บาท)
  const estimatedIncentive = currentMonthlyProgress * 10;

  // ข้อมูลสำหรับ Recharts ในการวาดกราฟแท่งเปรียบเทียบยอดขายแยกตามสีผลิตภัณฑ์
  const chartData = [
    { name: "สีเขียว 90", qty: todaySales.greenQty, color: "#10b981" },
    { name: "สีฟ้า 90", qty: todaySales.blueQty, color: "#3b82f6" },
    { name: "สีส้ม 100", qty: todaySales.orangeQty, color: "#f97316" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12 select-none">
      {/* HEADER BAR */}
      <header className="bg-[#1e3a8a] text-white p-4 sticky top-0 z-50 shadow-xs">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/?userId=${userId}`)}
            className="p-1 hover:bg-blue-800 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5">
              <Trophy size={16} className="text-amber-400" /> แดชบอร์ดล่ารางวัล
              Incentive
            </h1>
            <p className="text-[10px] text-blue-200 font-medium">
              รหัสพนักงาน: PG-{userId} | ติดตามผลงานเรียลไทม์
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* CARD ข้อมูลพนักงาน */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs text-left flex justify-between items-center bg-gradient-to-r from-white to-blue-50/20">
          <div>
            <h3 className="text-xs font-black text-slate-800">{pgName}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ประจำจุดปฏิบัติงาน: {storeName}
            </p>
          </div>
          <div className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 border border-amber-200">
            <Award size={12} /> ระดับ Top Seller
          </div>
        </div>

        {/* 💰 INCENTIVE TARGET PROGRESS (หลอดพลังสะสมเงินรางวัล) */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex justify-between items-start">
            <div className="text-left">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                เป้าหมายยอดขายสะสมประจำเดือน
              </p>
              <h2 className="text-xl font-black text-amber-300 mt-0.5 flex items-center gap-1.5">
                {currentMonthlyProgress} / {monthlyTarget}{" "}
                <span className="text-xs text-white/70 font-normal">แพ็ค</span>
              </h2>
            </div>
            <div className="bg-emerald-500/20 px-2.5 py-1 rounded-xl text-right border border-emerald-500/30">
              <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                <Coins size={12} /> โบนัสสะสม:{" "}
                {estimatedIncentive.toLocaleString()} ฿
              </span>
            </div>
          </div>

          {/* แถบความคืบหน้า (Progress Bar) */}
          <div className="space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(234,179,8,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold pt-0.5">
              <span>เริ่มภารกิจ</span>
              <span className="text-amber-400 font-black text-center animate-pulse">
                🔥 อีกเพียง {remainingPacks} แพ็ค จะถึงเป้าหมายใหญ่!
              </span>
              <span>พิชิตรางวัล 🎁</span>
            </div>
          </div>
        </div>

        {/* ตารางสรุปยอดขายประจำวันนี้ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs text-left space-y-1">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
              <ShoppingBag size={14} />
            </div>
            <p className="text-[10px] font-bold text-slate-400">
              ขายได้วันนี้รวม
            </p>
            <h4 className="text-base font-black text-slate-800">
              {todaySales.totalPacks} แพ็ค
            </h4>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs text-left space-y-1">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <TrendingUp size={14} />
            </div>
            <p className="text-[10px] font-bold text-slate-400">
              มูลค่ารวมหน้าร้าน
            </p>
            <h4 className="text-base font-black text-slate-800">
              {todaySales.totalRevenue.toLocaleString()} บาท
            </h4>
          </div>
        </div>

        {/* กราฟแท่งเปรียบเทียบสินค้ายอดนิยมรายวัน */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2 text-left">
            <Zap size={14} className="text-blue-600" />{" "}
            ยอดจำหน่ายแยกตามรุ่นสินค้า (วันนี้)
          </h4>

          <div className="h-40 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fontWeight: "bold", fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontWeight: "bold", fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]} barSize={38}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
