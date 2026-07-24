"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Clock,
  Calendar,
  Layers,
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

// 🔍 Helper เช็คชื่อ Account จากชื่อสาขาหรือรหัสสาขา
function getAccountName(storeName: string = "", storeCode: string = "") {
  const name = (storeName || "").toLowerCase().replace(/\s+/g, "");
  const code = (storeCode || "").toLowerCase().replace(/\s+/g, "");
  if (name.includes("bigc") || code.includes("bigc") || code.includes("pgbc")) {
    return "BigC";
  }
  if (name.includes("tops") || code.includes("tops")) {
    return "Tops";
  }
  if (name.includes("lotus") || code.includes("lotus")) {
    return "Lotus's";
  }
  return "อื่นๆ";
}

// 🎯 Custom Tooltip สำหรับกราฟที่ 1: ยอดขายรายสินค้า
const CustomSalesTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs z-50">
        <p className="font-black text-blue-400 mb-1 border-b border-slate-700 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className="flex justify-between gap-4 py-0.5"
          >
            <span style={{ color: entry.fill }} className="font-bold">
              {entry.name}:
            </span>
            <span className="font-mono font-black">{entry.value} ห่อ</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 🎯 Custom Tooltip สำหรับกราฟที่ 2: Funnel
const CustomFunnelTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs z-50">
        <p className="font-black text-amber-400 mb-1 border-b border-slate-700 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className="flex justify-between gap-4 py-0.5"
          >
            <span style={{ color: entry.fill }} className="font-bold">
              {entry.name}:
            </span>
            <span className="font-mono font-black">{entry.value} คน</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 🎯 Custom Tooltip สำหรับกราฟที่ 3: เปรียบเทียบราคา
const CustomPriceTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs z-50">
        <p className="font-black text-purple-400 mb-1 border-b border-slate-700 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className="flex justify-between gap-4 py-0.5"
          >
            <span style={{ color: entry.fill }} className="font-bold">
              {entry.name}:
            </span>
            <span className="font-mono font-black">{entry.value} ฿</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function CustomerReportPortal() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⏰ นาฬิกา Real-time State
  const [currentTime, setCurrentTime] = useState<string>("");

  // Filter States
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 🕒 Effect สำหรับอัปเดตนาฬิกา Real-time ทุกๆ 1 วินาที
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Filter Logic ( Account, สาขา, พนักงาน, วันที่ )
  useEffect(() => {
    let result = [...reportData];

    if (selectedAccount !== "ALL") {
      result = result.filter(
        (item) =>
          getAccountName(item.storeName, item.storeCode) === selectedAccount,
      );
    }

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

    if (startDate) {
      result = result.filter((item) => item.reportDate >= startDate);
    }

    if (endDate) {
      result = result.filter((item) => item.reportDate <= endDate);
    }

    setFilteredData(result);
  }, [
    selectedAccount,
    selectedStore,
    selectedUser,
    startDate,
    endDate,
    reportData,
  ]);

  // Options สำหรับ Filter
  const accountOptions = useMemo(() => {
    return Array.from(
      new Set(
        reportData.map((item) =>
          getAccountName(item.storeName, item.storeCode),
        ),
      ),
    );
  }, [reportData]);

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

  // 🔍 Helper แยกประเภทรูปภาพเป็น 6 กลุ่ม
  const categorizePhotos = (activityPhotos: any[]) => {
    if (!Array.isArray(activityPhotos)) {
      return {
        staffHolding: [],
        customerBasket: [],
        atmosphere: [],
        product: [],
        shelf: [],
        stockScanner: [],
      };
    }

    const staffHolding = activityPhotos.filter(
      (p) =>
        p.type === "staff_holding" ||
        (p.label && p.label.includes("พนักงานถือสินค้า")),
    );
    const customerBasket = activityPhotos.filter(
      (p) =>
        p.type?.startsWith("customer_basket") ||
        (p.label && (p.label.includes("ตะกร้า") || p.label.includes("ลูกค้า"))),
    );
    const atmosphere = activityPhotos.filter(
      (p) =>
        p.type?.startsWith("atmosphere") ||
        (p.label && p.label.includes("บรรยากาศ")),
    );
    const product = activityPhotos.filter(
      (p) =>
        p.type === "img_product" || (p.label && p.label.includes("รูปสินค้า")),
    );
    const shelf = activityPhotos.filter(
      (p) =>
        p.type === "img_shelf" || (p.label && p.label.includes("รูปเชลฟ์")),
    );
    const stockScanner = activityPhotos.filter(
      (p) =>
        p.type === "img_stock_scanner" ||
        (p.label && p.label.includes("สแกนสต๊อก")),
    );

    return {
      staffHolding,
      customerBasket,
      atmosphere,
      product,
      shelf,
      stockScanner,
    };
  };

  // 📸 Helper แสดงผล Thumbnail รูปภาพ
  const renderPhotoCell = (photos: any[], defaultLabel: string) => {
    if (!photos || photos.length === 0) {
      return <span className="text-slate-300 font-mono text-[10px]">-</span>;
    }
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        {photos.map((photo: any, pIdx: number) => (
          <div
            key={pIdx}
            onClick={() =>
              handleViewImage(
                photo.url,
                photo.label || `${defaultLabel} ที่ ${pIdx + 1}`,
              )
            }
            className="relative group cursor-pointer"
            title={photo.label || "คลิกเพื่อดูรูปใหญ่"}
          >
            <img
              src={photo.url}
              alt={photo.label || defaultLabel}
              className="w-8 h-8 object-cover rounded-lg border border-slate-200 group-hover:border-blue-500 group-hover:scale-110 transition shadow-xs"
            />
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-bold px-1 rounded-full opacity-80 group-hover:opacity-100">
              {pIdx + 1}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // 📥 Export to Excel (CSV)
  const exportToExcel = () => {
    if (!filteredData || filteredData.length === 0) return;

    const headers = [
      "No.",
      "Account",
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
      "ของแถมก่อนเริ่ม (เขียว 40)",
      "ของแถมก่อนเริ่ม (ส้ม 100)",
      "จำนวนแถม (เขียว 40)",
      "จำนวนแถม (ส้ม 100)",
      "ของแถมคงเหลือ (เขียว 40)",
      "ของแถมคงเหลือ (ส้ม 100)",
      "Feedback หน้าร้าน",
      "โปรโมชันคู่แข่ง",
      "URL พนักงานถือสินค้า",
      "URL ถ่ายคู่กับลูกค้า/ตะกร้า",
      "URL บรรยากาศหน้าร้าน",
      "URL รูปสินค้า",
      "URL รูปเชลฟ์ชั้นวาง",
      "URL รูปสแกนสต๊อก",
    ];

    const csvRows = filteredData.map((row, idx) => {
      const photos = categorizePhotos(row.activityPhotos);
      const accountName = getAccountName(row.storeName, row.storeCode);

      const joinUrls = (list: any[]) =>
        list.length > 0 ? list.map((p) => p.url).join(" | ") : "";

      return [
        idx + 1,
        accountName,
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
        row.giftNourishBefore || 0,
        row.giftOrangeBefore || 0,
        row.giftNourishGiven || 0,
        row.giftOrangeGiven || 0,
        row.giftNourishAfter || 0,
        row.giftOrangeAfter || 0,
        `"${(row.feedback || "").replace(/"/g, '""')}"`,
        `"${(row.competitorPromo || "").replace(/"/g, '""')}"`,
        `"${joinUrls(photos.staffHolding).replace(/"/g, '""')}"`,
        `"${joinUrls(photos.customerBasket).replace(/"/g, '""')}"`,
        `"${joinUrls(photos.atmosphere).replace(/"/g, '""')}"`,
        `"${joinUrls(photos.product).replace(/"/g, '""')}"`,
        `"${joinUrls(photos.shelf).replace(/"/g, '""')}"`,
        `"${joinUrls(photos.stockScanner).replace(/"/g, '""')}"`,
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
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col justify-between">
      {/* 🛑 CSS PRINT STYLING FOR A4 LANDSCAPE PRINT & PDF */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 3mm;
          }
          nav,
          .no-print,
          footer {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            font-size: 7px !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            font-size: 6.5px !important;
            table-layout: auto !important;
          }
          th,
          td {
            padding: 1.5px 2px !important;
            white-space: nowrap !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          img {
            max-width: 18px !important;
            max-height: 18px !important;
          }
        }
      `}</style>

      <div>
        {/* NAV BAR - RESPONSIVE FIX FOR MOBILE */}
        <nav className="bg-blue-400 border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
          <div className="max-w-[98%] sm:max-w-[96%] mx-auto px-2 sm:px-4 min-h-[60px] py-2 flex items-center justify-between gap-2">
            {/* 🏢 โลโก้บริษัท + ชื่อบริษัท */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src="/rvp.png"
                alt="Riverpro Intertrade Logo"
                className="h-7 sm:h-9 w-auto object-contain flex-shrink-0"
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.style.display = "none";
                }}
              />
              <div className="text-left border-l border-slate-200 pl-2 sm:pl-3 min-w-0">
                <span className="text-xs sm:text-sm font-black text-slate-800 block leading-tight truncate">
                  Riverpro Intertrade Co., Ltd
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-red-600 hidden sm:block tracking-wider uppercase">
                  CUSTOMER MARKETING PORTAL PUSH GIRL PROJECTS
                </span>
              </div>
            </div>

            {/* ⏰ นาฬิกาปัจจุบัน + ปุ่มจัดการ */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-xs font-bold shadow-xs">
                <Clock size={14} className="text-blue-600 animate-pulse" />
                <span>{currentTime || "กำลังโหลดเวลา..."}</span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Download size={13} className="sm:w-3.5 sm:h-3.5" />
                  <span>
                    <span className="hidden sm:inline">Export </span>Excel
                  </span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] sm:text-xs rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
                >
                  <Printer size={13} className="sm:w-3.5 sm:h-3.5" />
                  <span>
                    PDF<span className="hidden sm:inline"> / ปริ้นท์</span>
                  </span>
                </button>
                <button
                  onClick={loadPortalData}
                  className={`p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer ${
                    loading ? "animate-spin" : ""
                  }`}
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw size={14} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-[98%] sm:max-w-[96%] mx-auto px-1 sm:px-2 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* 🔍 FILTER BAR */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print text-left">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-black">
              <Filter size={16} className="text-blue-600" /> ตัวกรองข้อมูลสถิติ:
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Account Filter */}
              <div className="flex items-center gap-1 text-xs">
                <Layers size={14} className="text-slate-400" />
                <span className="font-bold text-slate-500">Account:</span>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="px-2.5 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs cursor-pointer text-slate-700"
                >
                  <option value="ALL">-- ทุก Account --</option>
                  {accountOptions.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              {/* สาขา Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-slate-500">สาขา:</span>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="px-2.5 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs cursor-pointer text-slate-700 max-w-[160px] sm:max-w-[200px] truncate"
                >
                  <option value="ALL">-- ทุกสาขา --</option>
                  {storeOptions.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name} ({code})
                    </option>
                  ))}
                </select>
              </div>

              {/* พนักงาน Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-slate-500">พนักงาน:</span>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="px-2.5 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs cursor-pointer text-slate-700 max-w-[150px] sm:max-w-[180px] truncate"
                >
                  <option value="ALL">-- พนักงานทุกคน --</option>
                  {userOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="flex items-center gap-1 text-xs">
                <Calendar size={14} className="text-slate-400" />
                <span className="font-bold text-slate-500">วันที่:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs text-slate-700"
                />
                <span className="text-slate-400">ถึง</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1.5 border rounded-xl font-bold bg-slate-50 focus:bg-white text-xs text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* 📈 KPI CARDS SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
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

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
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

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
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

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-3">
                <BarChart3 size={16} className="text-blue-600" />
                1. สถิตียอดขายแยกรายสินค้า (เขียว / ฟ้า / ส้ม)
              </h3>
              <div className="h-60 sm:h-64 w-full">
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
                      content={<CustomSalesTooltip />}
                      cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
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

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-3">
                <TrendingUp size={16} className="text-emerald-600" />
                2. สถิติ Funnel (Traffic vs Approach vs Closed Sales)
              </h3>
              <div className="h-60 sm:h-64 w-full">
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
                      content={<CustomFunnelTooltip />}
                      cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
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

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-3">
                <Tag size={16} className="text-purple-600" />
                3. สถิติเปรียบเทียบราคาสินค้าหน้าร้านกับคู่แข่ง (บาท)
              </h3>
              <div className="h-60 sm:h-64 w-full">
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
                    <YAxis
                      tick={{ fontSize: 9, fontWeight: "bold" }}
                      unit="฿"
                    />
                    <Tooltip
                      content={<CustomPriceTooltip />}
                      cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-slate-800">
                  ตารางรายงานกิจกรรม PG ประจำสาขารายวัน (Full Report)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  รวมรายละเอียด Target, สต๊อกสินค้า, สต๊อกของแถม
                  ข้อมูลการตลาดคู่แข่ง และรูปภาพกิจกรรมแยกตามประเภท
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
                      className="p-2 border border-slate-200 text-center whitespace-nowrap"
                    >
                      NO.
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border border-slate-200 whitespace-nowrap"
                    >
                      สาขา
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border border-slate-200 whitespace-nowrap"
                    >
                      พนักงาน
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border border-slate-200 text-center whitespace-nowrap"
                    >
                      วันที่
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border border-slate-200 text-center whitespace-nowrap"
                    >
                      TARGET (แพ็ค)
                    </th>

                    <th
                      colSpan={3}
                      className="p-2 border border-slate-200 text-center bg-blue-50/50 whitespace-nowrap"
                    >
                      สถิติลูกค้า (FUNNEL)
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border border-slate-200 text-center bg-emerald-50/50 whitespace-nowrap"
                    >
                      ราคาขายหน้าร้าน
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border border-slate-200 text-center bg-rose-50/50 whitespace-nowrap"
                    >
                      ราคาคู่แข่ง
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border border-slate-200 text-center bg-amber-50/50 whitespace-nowrap"
                    >
                      STOCK ก่อนเริ่ม (P)
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border border-slate-200 text-center bg-emerald-100/50 whitespace-nowrap"
                    >
                      จำนวนขาย (แพ็ค)
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border border-slate-200 text-center bg-slate-200/50 whitespace-nowrap"
                    >
                      STOCK หลังเลิก (P)
                    </th>

                    {/* 🎁 ของแถม */}
                    <th
                      colSpan={2}
                      className="p-2 border border-slate-200 text-center bg-orange-50/50 whitespace-nowrap"
                    >
                      ของแถมก่อนเริ่ม
                    </th>
                    <th
                      colSpan={2}
                      className="p-2 border border-slate-200 text-center bg-amber-100/60 text-amber-900 whitespace-nowrap"
                    >
                      จำนวนแจกแถม
                    </th>
                    <th
                      colSpan={2}
                      className="p-2 border border-slate-200 text-center bg-orange-100/50 whitespace-nowrap"
                    >
                      ของแถมคงเหลือ
                    </th>

                    <th
                      rowSpan={2}
                      className="p-2 border border-slate-200 whitespace-nowrap"
                    >
                      FEEDBACK หน้าร้าน
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border border-slate-200 whitespace-nowrap"
                    >
                      โปรคู่แข่ง
                    </th>

                    {/* 📸 6 คอลัมน์รูปภาพ */}
                    <th
                      colSpan={6}
                      className="p-2 border border-slate-200 text-center bg-blue-100/60 text-blue-900 whitespace-nowrap"
                    >
                      📸 รูปภาพกิจกรรมหน้าร้าน & สต๊อกสินค้า
                    </th>
                  </tr>

                  {/* Row 2 Sub Headers */}
                  <tr className="bg-slate-50 text-[9px]">
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      TRAFFIC
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      APPROACH
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      CLOSED
                    </th>

                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ฟ้า 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      CELLOX
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      KLEENEX
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      PASEO
                    </th>

                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ฟ้า 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ฟ้า 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ฟ้า 90
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    {/* ของแถมก่อนเริ่ม */}
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 40
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    {/* จำนวนแจกแถม */}
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 40
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    {/* ของแถมคงเหลือ */}
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      เขียว 40
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap">
                      ส้ม 100
                    </th>

                    {/* Sub Headers สำหรับรูปภาพแยก 6 หัวข้อ */}
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap bg-blue-50/70">
                      พนักงานถือสินค้า
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap bg-blue-50/70">
                      ถ่ายคู่กับลูกค้า/ตะกร้า
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap bg-blue-50/70">
                      บรรยากาศหน้าร้าน
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap bg-blue-50/70">
                      รูปสินค้า
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap bg-blue-50/70">
                      รูปชั้นวาง (SHELF)
                    </th>
                    <th className="p-1.5 border border-slate-200 text-center whitespace-nowrap bg-blue-50/70">
                      รูปสแกนสต๊อก
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredData.map((row, idx) => {
                    const photos = categorizePhotos(row.activityPhotos);

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-2 border border-slate-200 text-center font-bold text-slate-400 whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-800 whitespace-nowrap">
                          {row.storeName}
                        </td>
                        <td className="p-2 border border-slate-200 font-medium text-slate-600 whitespace-nowrap">
                          {row.userName}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.reportDate}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-500 whitespace-nowrap">
                          {row.targetPacks}
                        </td>

                        {/* Funnel */}
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.traffic}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-blue-600 font-bold whitespace-nowrap">
                          {row.approach}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-emerald-600 font-bold whitespace-nowrap">
                          {row.closedSales}
                        </td>

                        {/* Prices */}
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.priceGreen}฿
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.priceBlue}฿
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.priceOrange}฿
                        </td>

                        {/* Competitor Prices */}
                        <td className="p-2 border border-slate-200 text-center font-mono text-rose-600 font-bold whitespace-nowrap">
                          {row.compCellox > 0 ? `${row.compCellox}฿` : "-"}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-rose-600 font-bold whitespace-nowrap">
                          {row.compKleenex > 0 ? `${row.compKleenex}฿` : "-"}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-rose-600 font-bold whitespace-nowrap">
                          {row.compPaseo > 0 ? `${row.compPaseo}฿` : "-"}
                        </td>

                        {/* Stock Before */}
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.stockBeforeGreen}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.stockBeforeBlue}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.stockBeforeOrange}
                        </td>

                        {/* Sales Qty */}
                        <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-600 bg-emerald-50/40 whitespace-nowrap">
                          +{row.salesGreen}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono font-bold text-blue-600 bg-blue-50/40 whitespace-nowrap">
                          +{row.salesBlue}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono font-bold text-orange-600 bg-orange-50/40 whitespace-nowrap">
                          +{row.salesOrange}
                        </td>

                        {/* Stock After */}
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.stockAfterGreen}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.stockAfterBlue}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono whitespace-nowrap">
                          {row.stockAfterOrange}
                        </td>

                        {/* Gifts Stock Before (ก่อนเริ่ม) */}
                        <td className="p-2 border border-slate-200 text-center font-mono text-slate-500 whitespace-nowrap">
                          {row.giftNourishBefore || 0}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-slate-500 whitespace-nowrap">
                          {row.giftOrangeBefore || 0}
                        </td>

                        {/* Gifts Given (จำนวนแจกแถม) */}
                        <td className="p-2 border border-slate-200 text-center font-mono text-amber-600 font-bold bg-amber-50/30 whitespace-nowrap">
                          {row.giftNourishGiven || 0}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-amber-600 font-bold bg-amber-50/30 whitespace-nowrap">
                          {row.giftOrangeGiven || 0}
                        </td>

                        {/* Gifts Stock After (ของแถมคงเหลือ) */}
                        <td className="p-2 border border-slate-200 text-center font-mono text-emerald-600 font-bold whitespace-nowrap">
                          {row.giftNourishAfter || 0}
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-emerald-600 font-bold whitespace-nowrap">
                          {row.giftOrangeAfter || 0}
                        </td>

                        {/* Qualitative */}
                        <td className="p-2 border border-slate-200 text-[10px] text-slate-600 whitespace-nowrap">
                          {row.feedback || "-"}
                        </td>
                        <td className="p-2 border border-slate-200 text-[10px] text-rose-600 whitespace-nowrap">
                          {row.competitorPromo || "-"}
                        </td>

                        {/* 📸 6 คอลัมน์รูปภาพแยกตามประเภท */}
                        <td className="p-2 border border-slate-200 text-center">
                          {renderPhotoCell(
                            photos.staffHolding,
                            "พนักงานถือสินค้า",
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderPhotoCell(
                            photos.customerBasket,
                            "ถ่ายคู่กับลูกค้า/ตะกร้า",
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderPhotoCell(
                            photos.atmosphere,
                            "บรรยากาศหน้าร้าน",
                          )}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderPhotoCell(photos.product, "รูปสินค้า")}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderPhotoCell(photos.shelf, "รูปเชลฟ์ชั้นวาง")}
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {renderPhotoCell(photos.stockScanner, "รูปสแกนสต๊อก")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* 🦶 FOOTER BAR */}
      <footer className="bg-blue-400 border-t border-slate-200 mt-12 py-6 no-print text-slate-600">
        <div className="max-w-[98%] sm:max-w-[96%] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/rvp.png"
              alt="Riverpro Intertrade Logo"
              className="h-7 w-auto object-contain"
              onError={(e: any) => {
                e.target.onerror = null;
                e.target.style.display = "none";
              }}
            />
            <div>
              <p className="font-black text-xs text-slate-800">
                FBMBD CONTROLLER
              </p>
              <p className="text-[10px] text-red-400 font-medium">
                Niwat Wiyasing
              </p>
              <p className="text-[10px] text-red-400 font-medium">
                Niwat_wiy@riverpro.co.th
              </p>
              <p className="text-[10px] text-red-400 font-medium">
                ระบบรายงานกิจกรรมพนักงาน PG หน้าร้าน & การตลาด
              </p>
            </div>
          </div>

          <div className="text-[11px] text-red-400 text-center sm:text-right font-medium">
            © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd. All
            Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
