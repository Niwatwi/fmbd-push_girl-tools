"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  BarChart3,
  TrendingUp,
  Download,
  Building2,
  Printer,
  RefreshCw,
  ShoppingBag,
  Filter,
  MessageCircle,
  CheckCircle2,
  Tag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Swal from "sweetalert2";
import { getCustomerFullActivityReport } from "../dashboard/actions";

export default function CustomerReportPortal() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");

  const loadPortalData = async () => {
    setLoading(true);
    const res = await getCustomerFullActivityReport();
    if (res.success) {
      setReportData(res.data);
      setFilteredData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = [...reportData];
    if (selectedStore !== "ALL") {
      result = result.filter(
        (item) =>
          String(item.storeCode).trim() === String(selectedStore).trim(),
      );
    }
    if (selectedUser !== "ALL") {
      result = result.filter(
        (item) => String(item.userId).trim() === String(selectedUser).trim(),
      );
    }
    setFilteredData(result);
  }, [selectedStore, selectedUser, reportData]);

  const storeOptions = Array.from(
    new Map(
      reportData.map((item) => [item.storeCode, item.storeName]),
    ).entries(),
  );
  const userOptions = Array.from(
    new Map(reportData.map((item) => [item.userId, item.userName])).entries(),
  );

  // 🖼️ ดูรูปภาพใหญ่
  const handleViewImage = (url: string, label: string) => {
    Swal.fire({
      title: label || "รูปภาพกิจกรรม PG หน้าร้าน",
      imageUrl: url,
      imageAlt: label || "Activity Photo",
      imageWidth: 600,
      imageHeight: "auto",
      confirmButtonColor: "#1e3a8a",
      confirmButtonText: "ปิดหน้าต่าง",
      customClass: {
        popup: "rounded-2xl",
        image: "rounded-xl shadow-md",
      },
    });
  };

  // -------------------------------------------------------------
  // 📥 Export to Excel: เพิ่มคอลัมน์ URL รูปภาพกิจกรรมทั้งหมด
  // -------------------------------------------------------------
  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) return;

    const headers = [
      "No.",
      "รหัสสาขา",
      "ชื่อสาขา",
      "รหัสพนักงาน",
      "ชื่อพนักงาน",
      "วันที่",
      "Target (แพ็ค)",
      "Traffic",
      "Approach",
      "Closed Sales",
      "Closing Rate (%)",
      "ราคาเขียว 90 (บาท)",
      "ราคาฟ้า 90 (บาท)",
      "ราคาส้ม 100 (บาท)",
      "ราคา Cellox (บาท)",
      "ราคา Kleenex (บาท)",
      "ราคา Paseo (บาท)",
      "Stock ก่อนเริ่ม (เขียว 90)",
      "Stock ก่อนเริ่ม (ฟ้า 90)",
      "Stock ก่อนเริ่ม (ส้ม 100)",
      "ยอดขาย (เขียว 90)",
      "ยอดขาย (ฟ้า 90)",
      "ยอดขาย (ส้ม 100)",
      "ยอดขายรวม (แพ็ค)",
      "Stock หลังเลิก (เขียว 90)",
      "Stock หลังเลิก (ฟ้า 90)",
      "Stock หลังเลิก (ส้ม 100)",
      "ของแถมคงเหลือ (เขียว 40)",
      "ของแถมคงเหลือ (ส้ม 100)",
      "Feedback หน้าร้าน",
      "โปรโมชันคู่แข่ง",
      "URL รูปภาพกิจกรรมทั้งหมด", // 👈 คอลัมน์ URL รูปภาพ
    ];

    const csvRows = filteredData.map((row, idx) => {
      // ดึง URL รูปภาพทั้งหมดคั่นด้วย |
      const photoUrls =
        row.activityPhotos && row.activityPhotos.length > 0
          ? row.activityPhotos.map((p: any) => p.url).join(" | ")
          : "";

      return [
        idx + 1,
        row.storeCode,
        `"${row.storeName}"`,
        row.userEmpId,
        `"${row.userName}"`,
        row.reportDate,
        row.targetPacks,
        row.traffic,
        row.approach,
        row.closedSales,
        `${row.closingRate}%`,
        row.priceGreen,
        row.priceBlue,
        row.priceOrange,
        row.compCellox || 0,
        row.compKleenex || 0,
        row.compPaseo || 0,
        row.stockBeforeGreen,
        row.stockBeforeBlue,
        row.stockBeforeOrange,
        row.salesGreen,
        row.salesBlue,
        row.salesOrange,
        row.actualPacksTotal,
        row.stockAfterGreen,
        row.stockAfterBlue,
        row.stockAfterOrange,
        row.giftOrangeAfter,
        row.giftNourishAfter,
        `"${(row.feedback || "").replace(/"/g, '""')}"`,
        `"${(row.competitorPromo || "").replace(/"/g, '""')}"`,
        `"${photoUrls.replace(/"/g, '""')}"`, // 👈 URL รูปภาพแยกคอลัมน์
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PG_Activity_Report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPacks = filteredData.reduce((s, r) => s + r.actualPacksTotal, 0);
  const totalTraffic = filteredData.reduce((s, r) => s + r.traffic, 0);
  const totalApproach = filteredData.reduce((s, r) => s + r.approach, 0);
  const totalClosed = filteredData.reduce((s, r) => s + r.closedSales, 0);
  const avgClosingRate =
    totalApproach > 0 ? Math.round((totalClosed / totalApproach) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12">
      {/* 🛑 CSS PRINT STYLING FOR FULL-COLUMN PDF PRINT */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape; /* ตั้งค่ากระดาษ A4 แนวนอนอัตโนมัติ */
            margin: 5mm;
          }
          nav,
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            font-size: 8px !important;
            color: #000000 !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .shadow-xs,
          .shadow-sm,
          .shadow-md {
            box-shadow: none !important;
          }
          .overflow-x-auto {
            overflow: visible !important; /* ยกเลิกการซ่อน scrollbar ตอนสั่งปริ้นท์ */
          }
          table {
            width: 100% !important;
            table-layout: auto !important;
            font-size: 7.5px !important; /* ปรับขนาดฟอนต์ตารางให้กระชับพอดี A4 แนวนอน */
          }
          th,
          td {
            padding: 2px 3px !important;
            word-break: break-word !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          img {
            max-width: 24px !important;
            max-height: 24px !important;
          }
        }
      `}</style>

      {/* NAV BAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Building2 size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-400 block tracking-wider">
                CUSTOMER MARKETING PORTAL
              </span>
              <span className="text-sm font-black text-slate-800 block -mt-0.5">
                รายงานสรุปกิจกรรม PG & สถิติการขาย
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
            >
              <Download size={14} /> Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
            >
              <Printer size={14} /> ปริ้นท์ / PDF
            </button>
            <button
              onClick={loadPortalData}
              className={`p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition cursor-pointer ${
                loading ? "animate-spin" : ""
              }`}
            >
              <RefreshCw size={14} className="text-slate-600" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 🔍 FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print text-left">
          <div className="flex items-center gap-2 text-slate-700 text-xs font-black">
            <Filter size={16} className="text-blue-600" /> ตัวกรองข้อมูลสถิติ:
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-400">สาขา:</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="px-3 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs cursor-pointer"
              >
                <option value="ALL">-- ทุกสาขา --</option>
                {storeOptions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-400">พนักงาน (User):</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs cursor-pointer"
              >
                <option value="ALL">-- พนักงานทุกคน --</option>
                {userOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 📈 KPI CARDS SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                ยอดขายสะสมรวม
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalPacks.toLocaleString()} ห่อ
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                จำนวนลูกค้าเดินผ่าน (Traffic)
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalTraffic.toLocaleString()} คน
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <MessageCircle size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                เข้าไปทักทาย (Approach)
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalApproach.toLocaleString()} คน
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                อัตราปิดการขาย (Closing Rate)
              </span>
              <span className="text-lg font-black text-emerald-600 block">
                {avgClosingRate}% ({totalClosed} บิล)
              </span>
            </div>
          </div>
        </div>

        {/* 📊 3 CHARTS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-3">
              <BarChart3 size={16} className="text-blue-600" />
              1. สถิตียอดขายแยกรายสินค้า (เขียว / ฟ้า / ส้ม)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="storeName"
                    tick={{ fontSize: 9, fontWeight: "bold" }}
                  />
                  <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                  <Tooltip
                    contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="salesGreen" name="เขียว 90" fill="#10b981" />
                  <Bar dataKey="salesBlue" name="ฟ้า 90" fill="#3b82f6" />
                  <Bar dataKey="salesOrange" name="ส้ม 100" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-3">
              <TrendingUp size={16} className="text-emerald-600" />
              2. สถิติ Funnel (Traffic vs Approach vs Closed Sales)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="storeName"
                    tick={{ fontSize: 9, fontWeight: "bold" }}
                  />
                  <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                  <Tooltip
                    contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="traffic"
                    name="Traffic (ลูกค้าผ่าน)"
                    fill="#64748b"
                  />
                  <Bar
                    dataKey="approach"
                    name="Approach (ทักทาย)"
                    fill="#3b82f6"
                  />
                  <Bar
                    dataKey="closedSales"
                    name="Closed (ปิดการขาย)"
                    fill="#10b981"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-left">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-3">
              <Tag size={16} className="text-purple-600" />
              3. สถิติเปรียบเทียบราคาสินค้าหน้าร้านกับคู่แข่ง (บาท)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="storeName"
                    tick={{ fontSize: 9, fontWeight: "bold" }}
                  />
                  <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} unit="฿" />
                  <Tooltip
                    contentStyle={{ fontSize: "11px", borderRadius: "12px" }}
                    formatter={(value: any) => [`${value} บาท`, ""]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="priceGreen"
                    name="ราคาเรา (เขียว 90)"
                    fill="#10b981"
                  />
                  <Bar
                    dataKey="priceBlue"
                    name="ราคาเรา (ฟ้า 90)"
                    fill="#3b82f6"
                  />
                  <Bar
                    dataKey="priceOrange"
                    name="ราคาเรา (ส้ม 100)"
                    fill="#f97316"
                  />
                  <Bar dataKey="compCellox" name="Cellox" fill="#e11d48" />
                  <Bar dataKey="compKleenex" name="Kleenex" fill="#9333ea" />
                  <Bar dataKey="compPaseo" name="Paseo" fill="#d97706" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 📋 FULL CUSTOMER REQUESTED REPORT TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden text-left">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black text-slate-800">
                ตารางรายงานกิจกรรม PG ประจำสาขา (ตามแบบฟอร์มที่ลูกค้า Request)
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                รวมรายละเอียด Target, สต๊อกสินค้า, สต๊อกของแถม
                ข้อมูลการตลาดคู่แข่ง และรูปภาพกิจกรรม
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase border-b border-slate-200">
                {/* Row 1 Group Headers */}
                <tr>
                  <th
                    rowSpan={2}
                    className="p-2 border border-slate-200 text-center"
                  >
                    No.
                  </th>
                  <th rowSpan={2} className="p-2 border border-slate-200">
                    สาขา
                  </th>
                  <th rowSpan={2} className="p-2 border border-slate-200">
                    พนักงาน
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-slate-200 text-center"
                  >
                    วันที่
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-slate-200 text-center"
                  >
                    Target (แพ็ค)
                  </th>

                  <th
                    colSpan={3}
                    className="p-2 border border-slate-200 text-center bg-blue-50/50"
                  >
                    สถิติลูกค้า (Funnel)
                  </th>
                  <th
                    colSpan={3}
                    className="p-2 border border-slate-200 text-center bg-emerald-50/50"
                  >
                    ราคาขายหน้าร้าน
                  </th>
                  <th
                    colSpan={3}
                    className="p-2 border border-slate-200 text-center bg-rose-50/50"
                  >
                    ราคาคู่แข่ง
                  </th>
                  <th
                    colSpan={3}
                    className="p-2 border border-slate-200 text-center bg-amber-50/50"
                  >
                    Stock ก่อนเริ่ม (P)
                  </th>
                  <th
                    colSpan={3}
                    className="p-2 border border-slate-200 text-center bg-emerald-100/50"
                  >
                    จำนวนขาย (แพ็ค)
                  </th>
                  <th
                    colSpan={3}
                    className="p-2 border border-slate-200 text-center bg-slate-200/50"
                  >
                    Stock หลังเลิก (P)
                  </th>
                  <th
                    colSpan={2}
                    className="p-2 border border-slate-200 text-center bg-orange-50/50"
                  >
                    ของแถมคงเหลือ
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-slate-200 min-w-[120px]"
                  >
                    Feedback หน้าร้าน
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-slate-200 min-w-[120px]"
                  >
                    โปรคู่แข่ง
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border border-slate-200 min-w-[160px] bg-blue-100/40 text-blue-900"
                  >
                    📸 รูปภาพกิจกรรมหน้าร้าน
                  </th>
                </tr>

                {/* Row 2 Sub Headers */}
                <tr className="bg-slate-50 text-[9px]">
                  <th className="p-1.5 border border-slate-200 text-center">
                    Traffic
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    Approach
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    Closed
                  </th>

                  <th className="p-1.5 border border-slate-200 text-center">
                    เขียว 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ฟ้า 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ส้ม 100
                  </th>

                  <th className="p-1.5 border border-slate-200 text-center">
                    Cellox
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    Kleenex
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    Paseo
                  </th>

                  <th className="p-1.5 border border-slate-200 text-center">
                    เขียว 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ฟ้า 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ส้ม 100
                  </th>

                  <th className="p-1.5 border border-slate-200 text-center">
                    เขียว 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ฟ้า 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ส้ม 100
                  </th>

                  <th className="p-1.5 border border-slate-200 text-center">
                    เขียว 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ฟ้า 90
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ส้ม 100
                  </th>

                  <th className="p-1.5 border border-slate-200 text-center">
                    เขียว 40
                  </th>
                  <th className="p-1.5 border border-slate-200 text-center">
                    ส้ม 100
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-2 border border-slate-200 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-800">
                      {row.storeName}
                    </td>
                    <td className="p-2 border border-slate-200 font-medium text-slate-600">
                      {row.userName}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.reportDate}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-500">
                      {row.targetPacks}
                    </td>

                    {/* Funnel */}
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.traffic}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-blue-600 font-bold">
                      {row.approach}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-emerald-600 font-bold">
                      {row.closedSales}
                    </td>

                    {/* Prices */}
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.priceGreen}฿
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.priceBlue}฿
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.priceOrange}฿
                    </td>

                    {/* Competitor Prices */}
                    <td className="p-2 border border-slate-200 text-center font-mono text-rose-600">
                      {row.compCellox || "-"}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-rose-600">
                      {row.compKleenex || "-"}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-rose-600">
                      {row.compPaseo || "-"}
                    </td>

                    {/* Stock Before */}
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.stockBeforeGreen}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.stockBeforeBlue}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.stockBeforeOrange}
                    </td>

                    {/* Sales Qty */}
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-600 bg-emerald-50/40">
                      +{row.salesGreen}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-blue-600 bg-blue-50/40">
                      +{row.salesBlue}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono font-bold text-orange-600 bg-orange-50/40">
                      +{row.salesOrange}
                    </td>

                    {/* Stock After */}
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.stockAfterGreen}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.stockAfterBlue}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">
                      {row.stockAfterOrange}
                    </td>

                    {/* Gifts Stock Left */}
                    <td className="p-2 border border-slate-200 text-center font-mono text-amber-600 font-bold">
                      {row.giftOrangeAfter}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono text-amber-600 font-bold">
                      {row.giftNourishAfter}
                    </td>

                    {/* Qualitative */}
                    <td className="p-2 border border-slate-200 text-[9px] text-slate-500 leading-tight">
                      {row.feedback || "-"}
                    </td>
                    <td className="p-2 border border-slate-200 text-[9px] text-rose-600 leading-tight">
                      {row.competitorPromo || "-"}
                    </td>

                    {/* 📸 Thumbnail รูปภาพกิจกรรม */}
                    <td className="p-2 border border-slate-200">
                      {row.activityPhotos && row.activityPhotos.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap min-w-[160px]">
                          {row.activityPhotos.map(
                            (photo: any, pIdx: number) => (
                              <div
                                key={pIdx}
                                onClick={() =>
                                  handleViewImage(
                                    photo.url,
                                    photo.label || `รูปภาพที่ ${pIdx + 1}`,
                                  )
                                }
                                className="relative group cursor-pointer"
                                title={photo.label || "คลิกเพื่อดูรูปใหญ่"}
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.label || "Activity Photo"}
                                  className="w-8 h-8 object-cover rounded-lg border border-slate-200 group-hover:border-blue-500 group-hover:scale-110 transition shadow-xs"
                                />
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-bold px-1 rounded-full opacity-80 group-hover:opacity-100">
                                  {pIdx + 1}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
