"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  TrendingUp,
  ShoppingBag,
  Award,
  ArrowLeft,
  Zap,
  Coins,
  Boxes,
  Gift,
  RefreshCw,
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
import { getUserDashboardDataAction, calculateBigCCommission } from "./actions";

interface DashboardClientProps {
  userId: number;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pgName, setPgName] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isBigC, setIsBigC] = useState(false);

  // State เป้าหมายรวม และโบนัสสะสม
  const [monthlyTarget, setMonthlyTarget] = useState<number>(240);
  const [currentMonthlyProgress, setCurrentMonthlyProgress] =
    useState<number>(0);
  const [incentiveBonus, setIncentiveBonus] = useState<number>(0);

  // ยอดขายสะสมของวันนี้
  const [todaySales, setTodaySales] = useState({
    totalPacks: 0,
    totalSets: 0,
    totalRevenue: 0,
    greenQty: 0,
    blueQty: 0,
    orangeQty: 0,
  });

  // รายละเอียดสินค้าเชิงลึก
  const [productDetails, setProductDetails] = useState<any[]>([]);
  const [giftSummary, setGiftSummary] = useState<any[]>([]);

  // 🔄 ฟังก์ชันดึงข้อมูลหลัก
  const loadUserData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);

      try {
        const res = await getUserDashboardDataAction(userId);
        if (res.success && res.profile) {
          setPgName(res.profile.display_name || `PG-${userId}`);
          setEmpCode(res.profile.employee_id || `PG-${userId}`);
          const currentStore = res.storeName || "";
          setStoreName(currentStore);

          const storeLower = currentStore.toLowerCase();
          const checkIsBigC =
            storeLower.includes("big c") ||
            storeLower.includes("bigc") ||
            res.profile?.company_tag === "BIGC";

          setIsBigC(checkIsBigC);

          if (res.storeTarget) {
            setMonthlyTarget(Number(res.storeTarget.target_packs || 240));
          }

          // 1. ประมวลผลยอดขายวันนี้ (ถ้าไม่มีข้อมูลให้เป็น 0)
          const gPacks = Number(res.todaySales?.sales_qty_green90 || 0);
          const bPacks = Number(res.todaySales?.sales_qty_blue90 || 0);
          const oPacks = Number(res.todaySales?.sales_qty_orange100 || 0);

          const gPrice = Number(res.todaySales?.price_our_green90 || 150);
          const bPrice = Number(res.todaySales?.price_our_blue90 || 142);
          const oPrice = Number(res.todaySales?.price_our_orange100 || 100);

          let gSets = 0;
          let bSets = 0;
          let oSets = 0;
          let totalPacks = 0;

          if (checkIsBigC) {
            gSets = Math.floor(gPacks / 2);
            bSets = Math.floor(bPacks / 2);
            oSets = Math.floor(oPacks / 2);
            totalPacks = gPacks + bPacks + oPacks;
          } else {
            gSets = gPacks;
            bSets = bPacks;
            oSets = oPacks;
            totalPacks = (gSets + bSets + oSets) * 2;
          }

          const totalSets = gSets + bSets + oSets;
          const totalRev = gSets * gPrice + bSets * bPrice + oSets * oPrice;

          setTodaySales({
            totalPacks: totalPacks,
            totalSets: totalSets,
            totalRevenue: totalRev,
            greenQty: gPacks,
            blueQty: bPacks,
            orangeQty: oPacks,
          });

          // 2. ตั้งค่ายอดขายสะสมประจำเดือน
          const monthlyTotalPacks = Number(
            (res as any).monthlyProgress?.total_packs || 0,
          );
          setCurrentMonthlyProgress(monthlyTotalPacks);

          // 3. คำนวณ Incentive
          const comm = await calculateBigCCommission(gSets, bSets, oSets);
          setIncentiveBonus(comm.incentiveAmount);

          // 4. ตั้งค่ารายการสินค้าลงตารางเสมอ
          setProductDetails([
            {
              name: "Mild Luxury สีเขียว 90",
              price: gPrice,
              keyedPacks: gPacks,
              actualSets: gSets,
              revenue: gSets * gPrice,
              dotColor: "bg-emerald-500",
            },
            {
              name: "Mild Luxury สีฟ้า 90",
              price: bPrice,
              keyedPacks: bPacks,
              actualSets: bSets,
              revenue: bSets * bPrice,
              dotColor: "bg-blue-500",
            },
            {
              name: "Mild Luxury สีส้ม 100",
              price: oPrice,
              keyedPacks: oPacks,
              actualSets: oSets,
              revenue: oSets * oPrice,
              dotColor: "bg-orange-500",
            },
          ]);

          // 5. รายงานของแถม
          setGiftSummary([
            {
              name: "ทิชชู่ส้มพรีเมียม",
              given: Number(res.todaySales?.gift_orange_given || 0),
            },
            {
              name: "ทิชชู่สูตรบำรุงผิว",
              given: Number(res.todaySales?.gift_nourish_given || 0),
            },
          ]);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    loadUserData();

    const handleFocus = () => {
      loadUserData();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadUserData]);

  const progressPercent = Math.min(
    100,
    Math.round((currentMonthlyProgress / (monthlyTarget || 1)) * 100),
  );
  const remainingPacks = Math.max(0, monthlyTarget - currentMonthlyProgress);

  const chartData = [
    { name: "สีเขียว 90", qty: todaySales.greenQty, color: "#10b981" },
    { name: "สีฟ้า 90", qty: todaySales.blueQty, color: "#3b82f6" },
    { name: "สีส้ม 100", qty: todaySales.orangeQty, color: "#f97316" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-800 flex items-center justify-center p-6 text-slate-500">
        <div className="text-center space-y-2">
          <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-white">
            กำลังโหลดข้อมูลแดชบอร์ดส่วนตัว...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12 select-none">
      {/* HEADER BAR */}
      <header className="bg-[#1e3a8a] text-white p-4 sticky top-0 z-50 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/?userId=${userId}`)}
              className="p-1 hover:bg-blue-800 rounded-lg transition cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="text-left">
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                <Trophy size={16} className="text-amber-400" />{" "}
                แดชบอร์ดล่ารางวัล Incentive
              </h1>
              <p className="text-[10px] text-blue-200 font-medium">
                รหัสพนักงาน: {empCode} | ติดตามผลงานเรียลไทม์
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadUserData(true)}
            disabled={refreshing}
            className="p-2 bg-blue-800/80 hover:bg-blue-700 active:scale-95 rounded-xl transition text-white border border-blue-400/30 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
          >
            <RefreshCw
              size={13}
              className={
                refreshing ? "animate-spin text-amber-300" : "text-blue-200"
              }
            />
            <span>{refreshing ? "อัปเดต..." : "รีเฟรช"}</span>
          </button>
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

        {/* 💰 INCENTIVE TARGET PROGRESS */}
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                เป้าหมายยอดขายสะสมประจำเดือน
              </p>
              <h2 className="text-xl font-black text-amber-300 mt-0.5 flex items-center gap-1.5">
                {currentMonthlyProgress} / {monthlyTarget}{" "}
                <span className="text-xs text-white/70 font-normal">
                  ชิ้น/ห่อ
                </span>
              </h2>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                (คิดเป็นยอดขายสะสม:{" "}
                <span className="text-white font-bold">
                  {todaySales.totalSets} ชุดโปร
                </span>
                )
              </p>
            </div>
            <div className="bg-emerald-500/20 px-2.5 py-1 rounded-xl text-right border border-emerald-500/30">
              <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                <Coins size={12} /> โบนัสสะสม: {incentiveBonus.toLocaleString()}{" "}
                ฿
              </span>
            </div>
          </div>

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
                {remainingPacks > 0
                  ? `🔥 อีกเพียง ${remainingPacks} ชิ้น จะถึงเป้าหมายใหญ่!`
                  : "🎉 พิชิตเป้าหมายสำเร็จแล้ว!"}
              </span>
              <span>พิชิตรางวัล 🎁</span>
            </div>
          </div>
        </div>

        {/* สรุปยอดขายวันนี้ */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs text-left space-y-1">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
              <ShoppingBag size={14} />
            </div>
            <p className="text-[10px] font-bold text-slate-400">
              ขายวันนี้ (ชุดโปร 1 แถม 1)
            </p>
            <h4 className="text-base font-black text-slate-800">
              {todaySales.totalSets} ชุด{" "}
              <span className="text-[10px] font-normal text-slate-400">
                ({todaySales.totalPacks} ชิ้น)
              </span>
            </h4>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs text-left space-y-1">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg w-fit">
              <TrendingUp size={14} />
            </div>
            <p className="text-[10px] font-bold text-slate-400">
              มูลค่ารวมหน้าร้านจริง
            </p>
            <h4 className="text-base font-black text-slate-800">
              {todaySales.totalRevenue.toLocaleString()} บาท
            </h4>
          </div>
        </div>

        {/* กราฟแท่ง */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2 text-left">
            <Zap size={14} className="text-blue-600" />{" "}
            ยอดคีย์ตัดสต๊อกจำหน่ายวันนี้ (ชิ้น)
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

        {/* 📋 ตารางรายละเอียดสรุปยอดขายหน้าร้าน */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Boxes size={14} className="text-blue-600" /> รายละเอียดสินค้า &
              สต๊อกหน้าร้าน
            </h4>
            {isBigC && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Big C: คิดเงินตามชุดโปร 1 แถม 1
              </span>
            )}
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-2.5 font-bold">สินค้า / รุ่น</th>
                  <th className="p-2.5 font-bold text-center">ราคา/ชุด</th>
                  <th className="p-2.5 font-bold text-center">ตัดสต๊อก</th>
                  <th className="p-2.5 font-bold text-center">คิดผลงาน</th>
                  <th className="p-2.5 font-bold text-right">รวมเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {productDetails.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${prod.dotColor} shrink-0`}
                        ></span>
                        <span className="font-bold text-slate-800 block text-[10px]">
                          {prod.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                      {prod.price}฿
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                      {prod.keyedPacks} ชิ้น
                    </td>
                    <td className="p-2.5 text-center font-mono font-black text-emerald-600 bg-emerald-50/50 rounded-md">
                      +{prod.actualSets} ชุด
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-blue-900">
                      {prod.revenue.toLocaleString()}฿
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🎁 ตารางคลังของแถมเฉพาะสาขา Tops */}
        {!isBigC && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs space-y-2.5 text-left">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Gift size={14} className="text-amber-500" />{" "}
              รายงานยอดแจกของแถมแคมเปญ Tops
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {giftSummary.map((gift, idx) => (
                <div
                  key={idx}
                  className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 space-y-1"
                >
                  <span className="text-[10px] font-black text-slate-800 block truncate">
                    {gift.name}
                  </span>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                    <span>แจกไปแล้ว:</span>
                    <span className="text-amber-700 font-black font-mono text-xs">
                      {gift.given} ชิ้น
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
