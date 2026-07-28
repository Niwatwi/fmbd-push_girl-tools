"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  RefreshCw,
  ShoppingBag,
  Filter,
  MessageCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  DollarSign,
  Percent,
  PieChart as PieChartIcon,
  PlusCircle,
  Edit3,
  X,
  Save,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Swal from "sweetalert2";
import {
  getCustomerFullActivityReport,
  adminSaveReportWithImagesAction,
  getAdminSalarySummaryReportAction,
} from "../dashboard/actions";

// 📸 Helper สำหรับย่อขนาดรูปภาพ (Compress) และแปลงเป็น Base64
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = (error) => reject(error);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = (error) => reject(error);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
  });
};

// 🔍 Helper เช็คชื่อ Account จากชื่อสาขาหรือรหัสสาขา
function getAccountName(storeName: string = "", storeCode: string = "") {
  const name = (storeName || "").toLowerCase().replace(/\s+/g, "");
  const code = (storeCode || "").toLowerCase().replace(/\s+/g, "");
  if (name.includes("bigc") || code.includes("bigc") || code.includes("pgbc")) {
    return "Big C";
  }
  if (name.includes("tops") || code.includes("tops")) {
    return "Tops";
  }
  if (name.includes("lotus") || code.includes("lotus")) {
    return "Lotus's";
  }
  return "อื่นๆ";
}

// 📌 Helper สำหรับแสดงผล สต๊อกหลังเลิก
const renderStockCell = (stockValue: number | string | null | undefined) => {
  if (
    stockValue === null ||
    stockValue === undefined ||
    stockValue === "" ||
    stockValue === "-"
  ) {
    return <span className="text-slate-300 font-mono">-</span>;
  }
  const num = Number(stockValue);
  if (isNaN(num))
    return <span className="text-slate-700 font-mono">{stockValue}</span>;

  const isLowStock = num < 3;

  return (
    <span
      className={`px-1.5 py-0.5 rounded font-black font-mono transition-all ${
        isLowStock
          ? "text-rose-600 bg-rose-100/90 border border-rose-300 animate-pulse shadow-xs"
          : "text-slate-800"
      }`}
    >
      {num}
    </span>
  );
};

// 🎯 Custom Tooltip กราฟที่ 1
const CustomSalesTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50 backdrop-blur-md">
        <p className="font-black text-blue-400 mb-1 border-b border-slate-700 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className="flex justify-between gap-4 py-0.5"
          >
            <span
              style={{ color: entry.color || entry.fill }}
              className="font-bold"
            >
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

// 🎯 Custom Tooltip กราฟที่ 2
const CustomFunnelTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50 backdrop-blur-md">
        <p className="font-black text-amber-400 mb-1 border-b border-slate-700 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className="flex justify-between gap-4 py-0.5"
          >
            <span
              style={{ color: entry.color || entry.fill }}
              className="font-bold"
            >
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

// 🎯 Custom Tooltip กราฟที่ 3
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50 backdrop-blur-md">
        <p className="font-black text-purple-300 mb-1 border-b border-slate-700 pb-1">
          {data.name}
        </p>
        <div className="flex justify-between gap-4 py-0.5">
          <span className="text-slate-300 font-bold">ราคาเฉลี่ย:</span>
          <span className="font-mono font-black text-amber-400">
            {data.value} ฿
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CustomerReportPortal() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [attendanceWages, setAttendanceWages] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⏰ Real-time State
  const [currentTime, setCurrentTime] = useState<string>("");

  const [adminSalaryTotal, setAdminSalaryTotal] = useState({
    baseWage: 0,
    commission: 0,
    netTotal: 0,
  });

  // Filter States
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modal State สำหรับแก้ไข/คีย์ย้อนหลัง
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // State สำหรับรูปภาพย้อนหลังใน Modal
  const [photoFiles, setPhotoFiles] = useState<{
    staffHolding: string[];
    customerBasket: string[];
    atmosphere: string[];
    product: string[];
    shelf: string[];
    stockScanner: string[];
  }>({
    staffHolding: [],
    customerBasket: [],
    atmosphere: [],
    product: [],
    shelf: [],
    stockScanner: [],
  });

  const [editForm, setEditForm] = useState<any>({
    id: null,
    reportDate: new Date().toISOString().split("T")[0],
    userId: "",
    storeCode: "",
    traffic: 0,
    approach: 0,
    closedSales: 0,
    priceGreen: 150,
    stockBeforeGreen: 0,
    salesGreen: 0,
    stockAfterGreen: 0,
    priceBlue: 142,
    stockBeforeBlue: 0,
    salesBlue: 0,
    stockAfterBlue: 0,
    priceOrange: 100,
    stockBeforeOrange: 0,
    salesOrange: 0,
    stockAfterOrange: 0,
    giftNourishBefore: 0,
    giftNourishGiven: 0,
    giftOrangeBefore: 0,
    giftOrangeGiven: 0,
    compCellox: 0,
    compKleenex: 0,
    compPaseo: 0,
    feedback: "",
    competitorPromo: "",
    remark: "",
  });

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

  // 1. เพิ่ม State เก็บ Raw Data จาก salary summary
  const [salarySummaryData, setSalarySummaryData] = useState<any[]>([]);

  // 2. ปรับฟังก์ชัน loadPortalData
  const loadPortalData = async () => {
    setLoading(true);
    const res = await getCustomerFullActivityReport();
    const salaryRes = await getAdminSalarySummaryReportAction();

    if (res.success) {
      setReportData(res.data || []);
      setFilteredData(res.data || []);
      setAttendanceWages(res.attendanceWages || []);
    }

    if (salaryRes.success) {
      // เก็บตัว Array ไว้ใช้กรองตาม Filter
      setSalarySummaryData(salaryRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Filter Logic
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

  const filteredAttendanceWages = useMemo(() => {
    let result = [...attendanceWages];

    if (selectedUser !== "ALL") {
      result = result.filter(
        (item) => String(item.userId).trim() === String(selectedUser).trim(),
      );
    }

    if (selectedStore !== "ALL") {
      result = result.filter(
        (item) =>
          String(item.storeCode).trim() === String(selectedStore).trim(),
      );
    }

    if (selectedAccount !== "ALL") {
      result = result.filter((item) => {
        const storeObj = reportData.find((r) => r.storeCode === item.storeCode);
        const acc = storeObj
          ? getAccountName(storeObj.storeName, storeObj.storeCode)
          : getAccountName("", item.storeCode);
        return acc === selectedAccount;
      });
    }

    if (startDate) {
      result = result.filter((item) => item.date >= startDate);
    }

    if (endDate) {
      result = result.filter((item) => item.date <= endDate);
    }

    return result;
  }, [
    attendanceWages,
    selectedAccount,
    selectedStore,
    selectedUser,
    startDate,
    endDate,
    reportData,
  ]);

  const accountOptions = useMemo(() => {
    return Array.from(
      new Set(
        reportData.map((item) =>
          getAccountName(item.storeName, item.storeCode),
        ),
      ),
    );
  }, [reportData]);

  const storeOptions = useMemo(() => {
    return Array.from(
      new Map(
        reportData.map((item) => [item.storeCode, item.storeName]),
      ).entries(),
    );
  }, [reportData]);

  const userOptions = useMemo(() => {
    return Array.from(
      new Map(reportData.map((item) => [item.userId, item.userName])).entries(),
    );
  }, [reportData]);

  const chart1And2Data = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    if (selectedStore === "ALL") {
      const map = new Map<string, any>();
      filteredData.forEach((row) => {
        const acc = getAccountName(row.storeName, row.storeCode);
        if (!map.has(acc)) {
          map.set(acc, {
            displayName: acc,
            salesGreen: 0,
            salesBlue: 0,
            salesOrange: 0,
            traffic: 0,
            approach: 0,
            closedSales: 0,
          });
        }
        const item = map.get(acc);
        item.salesGreen += Number(row.salesGreen || 0);
        item.salesBlue += Number(row.salesBlue || 0);
        item.salesOrange += Number(row.salesOrange || 0);
        item.traffic += Number(row.traffic || 0);
        item.approach += Number(row.approach || 0);
        item.closedSales += Number(row.closedSales || 0);
      });
      return Array.from(map.values());
    } else {
      const map = new Map<string, any>();
      filteredData.forEach((row) => {
        const dateKey = row.reportDate || "ไม่ระบุวัน";
        if (!map.has(dateKey)) {
          map.set(dateKey, {
            displayName: dateKey,
            salesGreen: 0,
            salesBlue: 0,
            salesOrange: 0,
            traffic: 0,
            approach: 0,
            closedSales: 0,
          });
        }
        const item = map.get(dateKey);
        item.salesGreen += Number(row.salesGreen || 0);
        item.salesBlue += Number(row.salesBlue || 0);
        item.salesOrange += Number(row.salesOrange || 0);
        item.traffic += Number(row.traffic || 0);
        item.approach += Number(row.approach || 0);
        item.closedSales += Number(row.closedSales || 0);
      });
      return Array.from(map.values()).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      );
    }
  }, [filteredData, selectedStore]);

  const chart3Data = useMemo(() => {
    if (!filteredData || filteredData.length === 0)
      return { latestDate: "-", slices: [] };

    const dates = filteredData.map((r) => r.reportDate).filter(Boolean);
    const maxDate =
      dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : "";

    const latestRows = filteredData.filter((r) => r.reportDate === maxDate);
    if (latestRows.length === 0) return { latestDate: "-", slices: [] };

    const avg = (arr: number[]) => {
      const valid = arr.filter((v) => v > 0);
      return valid.length > 0
        ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
        : 0;
    };

    const priceGreenAvg = avg(latestRows.map((r) => Number(r.priceGreen || 0)));
    const priceBlueAvg = avg(latestRows.map((r) => Number(r.priceBlue || 0)));
    const priceOrangeAvg = avg(
      latestRows.map((r) => Number(r.priceOrange || 0)),
    );
    const celloxAvg = avg(latestRows.map((r) => Number(r.compCellox || 0)));
    const kleenexAvg = avg(latestRows.map((r) => Number(r.compKleenex || 0)));
    const paseoAvg = avg(latestRows.map((r) => Number(r.compPaseo || 0)));

    const slices = [
      {
        name: "เขียว 90 (เรา)",
        value: priceGreenAvg,
        fill: "url(#c3-3dGreen)",
      },
      { name: "ฟ้า 90 (เรา)", value: priceBlueAvg, fill: "url(#c3-3dBlue)" },
      {
        name: "ส้ม 100 (เรา)",
        value: priceOrangeAvg,
        fill: "url(#c3-3dOrange)",
      },
      { name: "Cellox", value: celloxAvg, fill: "url(#c3-3dCellox)" },
      { name: "Kleenex", value: kleenexAvg, fill: "url(#c3-3dKleenex)" },
      { name: "Paseo", value: paseoAvg, fill: "url(#c3-3dPaseo)" },
    ].filter((s) => s.value > 0);

    return { latestDate: maxDate, slices };
  }, [filteredData]);

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

  const renderPhotoCell = (photos: any[], defaultLabel: string) => {
    if (!photos || photos.length === 0) {
      return <span className="text-slate-300 font-mono text-[10px]">-</span>;
    }
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap justify-center">
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
      "ราคาเขียว 90 (บาท)",
      "ราคาฟ้า 90 (บาท)",
      "ราคาส้ม 100 (บาท)",
      "ราคา Cellox (บาท)",
      "ราคา Kleenex (บาท)",
      "ราคา Paseo (บาท)",
      "Feedback หน้าร้าน",
      "โปรโมชันคู่แข่ง",
      "หมายเหตุ",
    ];

    const csvRows = filteredData.map((row, idx) => {
      const accountName = getAccountName(row.storeName, row.storeCode);
      const isBigC = accountName === "Big C";

      const stockAfterGreen =
        row.stockAfterGreen !== undefined &&
        row.stockAfterGreen !== null &&
        row.stockAfterGreen !== ""
          ? Number(row.stockAfterGreen)
          : Math.max(
              0,
              Number(row.stockBeforeGreen || 0) -
                Number(row.salesGreen || 0) * (isBigC ? 2 : 1),
            );

      const stockAfterBlue =
        row.stockAfterBlue !== undefined &&
        row.stockAfterBlue !== null &&
        row.stockAfterBlue !== ""
          ? Number(row.stockAfterBlue)
          : Math.max(
              0,
              Number(row.stockBeforeBlue || 0) -
                Number(row.salesBlue || 0) * (isBigC ? 2 : 1),
            );

      const stockAfterOrange = isBigC
        ? 0
        : row.stockAfterOrange !== undefined &&
            row.stockAfterOrange !== null &&
            row.stockAfterOrange !== ""
          ? Number(row.stockAfterOrange)
          : Math.max(
              0,
              Number(row.stockBeforeOrange || 0) -
                Number(row.salesOrange || 0) * 2,
            );

      const remarkText =
        row.remark ||
        row.remark_store ||
        row.remarkStore ||
        row.remarks ||
        row.note ||
        row.notes ||
        "";

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
        row.stockBeforeGreen,
        row.stockBeforeBlue,
        isBigC ? "-" : row.stockBeforeOrange,
        row.salesGreen,
        row.salesBlue,
        isBigC ? "-" : row.salesOrange,
        row.actualPacksTotal,
        stockAfterGreen,
        stockAfterBlue,
        stockAfterOrange,
        row.giftNourishBefore || 0,
        row.giftOrangeBefore || 0,
        row.giftNourishGiven || 0,
        row.giftOrangeGiven || 0,
        row.giftNourishAfter || 0,
        row.giftOrangeAfter || 0,
        row.priceGreen,
        row.priceBlue,
        row.priceOrange,
        row.compCellox || 0,
        row.compKleenex || 0,
        row.compPaseo || 0,
        `"${(row.feedback || "").replace(/"/g, '""')}"`,
        `"${(row.competitorPromo || "").replace(/"/g, '""')}"`,
        `"${remarkText.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PG_Activity_Report_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalPacks = filteredData.reduce(
    (s, r) => s + Number(r.actualPacksTotal || 0),
    0,
  );
  const totalTraffic = filteredData.reduce(
    (s, r) => s + Number(r.traffic || 0),
    0,
  );
  const totalApproach = filteredData.reduce(
    (s, r) => s + Number(r.approach || 0),
    0,
  );
  const totalClosed = filteredData.reduce(
    (s, r) => s + Number(r.closedSales || 0),
    0,
  );
  const avgClosingRate =
    totalApproach > 0 ? Math.round((totalClosed / totalApproach) * 100) : 0;

  const totalGreenRevenue = filteredData.reduce(
    (sum, r) => sum + Number(r.salesGreen || 0) * Number(r.priceGreen || 150),
    0,
  );
  const totalBlueRevenue = filteredData.reduce(
    (sum, r) => sum + Number(r.salesBlue || 0) * Number(r.priceBlue || 142),
    0,
  );
  const totalOrangeRevenue = filteredData.reduce(
    (sum, r) => sum + Number(r.salesOrange || 0) * Number(r.priceOrange || 100),
    0,
  );

  const totalRevenue =
    totalGreenRevenue + totalBlueRevenue + totalOrangeRevenue;

  // 💵 คำนวณค่าแรงฐาน (Base Wage) มีระบบ Fallback 3 ชั้น (ถ้ารวมค่าแรงจาก log ได้ 0 จะไปคิดจากวันทำงานในรายงานแทน)
  // 🔍 กรองข้อมูล Salary Summary ตาม Filter ที่เลือกหน้าเว็บ
  const filteredSalarySummary = useMemo(() => {
    let result = [...salarySummaryData];

    if (selectedUser !== "ALL") {
      result = result.filter(
        (item) =>
          String(item.userId || item.userEmpId).trim() ===
          String(selectedUser).trim(),
      );
    }

    if (selectedStore !== "ALL") {
      result = result.filter(
        (item) =>
          String(item.storeCode).trim() === String(selectedStore).trim(),
      );
    }

    return result;
  }, [salarySummaryData, selectedUser, selectedStore]);

  // 💵 ดึง ค่าแรงฐาน (Base Wage) จาก Salary Summary ที่กรองแล้ว
  const totalBaseWage = useMemo(() => {
    if (filteredSalarySummary.length > 0) {
      return filteredSalarySummary.reduce(
        (sum, item) => sum + Number(item.totalDailyWage || item.baseWage || 0),
        0,
      );
    }

    // Fallback: หากไม่มีข้อมูลจาก salary summary ให้ใช้การคำนวณเดิม
    const uniqueUserDays = new Set<string>();
    let fallbackWage = 0;
    filteredData.forEach((r) => {
      const userDateKey = `${r.userId}_${r.reportDate}`;
      if (!uniqueUserDays.has(userDateKey)) {
        uniqueUserDays.add(userDateKey);
        fallbackWage += Number(r.dailyWage || 700);
      }
    });
    return fallbackWage;
  }, [filteredSalarySummary, filteredData]);

  // 🏆 ดึง คอมมิชชัน (Commission) จาก Salary Summary ที่กรองแล้ว
  const totalCommission = useMemo(() => {
    if (filteredSalarySummary.length > 0) {
      return filteredSalarySummary.reduce(
        (sum, item) =>
          sum + Number(item.totalCommission || item.commission || 0),
        0,
      );
    }

    // Fallback: หากไม่มีข้อมูลจาก salary summary ให้ใช้การคำนวณเดิม
    const userSalesMap = new Map<string, number>();
    filteredData.forEach((r) => {
      const uId = String(r.userId || r.userEmpId || "unknown");
      const accName = getAccountName(r.storeName, r.storeCode);
      const isBigC = accName === "Big C";
      const green = Number(r.salesGreen || 0);
      const blue = Number(r.salesBlue || 0);
      const orange = isBigC ? 0 : Number(r.salesOrange || 0);
      userSalesMap.set(
        uId,
        (userSalesMap.get(uId) || 0) + (green + blue + orange),
      );
    });

    let totalComm = 0;
    userSalesMap.forEach((totalSets) => {
      if (totalSets >= 180) {
        totalComm += 500 + Math.floor((totalSets - 180) / 15) * 100;
      } else if (totalSets >= 135) {
        totalComm += 200;
      }
    });
    return totalComm;
  }, [filteredSalarySummary, filteredData]);
  const totalStaffExpense = totalBaseWage + totalCommission;
  const netProfit = totalRevenue - totalStaffExpense;
  const profitMarginPercent =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const removePhoto = (type: keyof typeof photoFiles, index: number) => {
    setPhotoFiles((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  // 📸 Handler สำหรับจัดการ อัปโหลดไฟล์รูปภาพ
  const handleFileUpload = async (
    type: keyof typeof photoFiles,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    try {
      const fileArray = Array.from(files);
      const compressedImages = await Promise.all(
        fileArray.map((file) => compressImage(file)),
      );

      setPhotoFiles((prev) => ({
        ...prev,
        [type]: [...prev[type], ...compressedImages],
      }));
    } catch (err) {
      Swal.fire("ข้อผิดพลาด", "ไม่สามารถอ่านหรือย่อไฟล์รูปภาพได้", "error");
    }
  };

  // ✏️ แก้ไขแถวเดิม
  const handleEditRow = (row: any) => {
    const photos = categorizePhotos(row.activityPhotos);
    setPhotoFiles({
      staffHolding: photos.staffHolding.map((p: any) => p.url),
      customerBasket: photos.customerBasket.map((p: any) => p.url),
      atmosphere: photos.atmosphere.map((p: any) => p.url),
      product: photos.product.map((p: any) => p.url),
      shelf: photos.shelf.map((p: any) => p.url),
      stockScanner: photos.stockScanner.map((p: any) => p.url),
    });

    setEditForm({
      id: row.id,
      reportDate: row.reportDate || new Date().toISOString().split("T")[0],
      userId: row.userId || "",
      storeCode: row.storeCode || "",
      traffic: row.traffic || 0,
      approach: row.approach || 0,
      closedSales: row.closedSales || 0,
      priceGreen: row.priceGreen || 150,
      stockBeforeGreen: row.stockBeforeGreen || 0,
      salesGreen: row.salesGreen || 0,
      stockAfterGreen: row.stockAfterGreen || 0,
      priceBlue: row.priceBlue || 142,
      stockBeforeBlue: row.stockBeforeBlue || 0,
      salesBlue: row.salesBlue || 0,
      stockAfterBlue: row.stockAfterBlue || 0,
      priceOrange: row.priceOrange || 100,
      stockBeforeOrange: row.stockBeforeOrange || 0,
      salesOrange: row.salesOrange || 0,
      stockAfterOrange: row.stockAfterOrange || 0,
      giftNourishBefore: row.giftNourishBefore || 0,
      giftNourishGiven: row.giftNourishGiven || 0,
      giftOrangeBefore: row.giftOrangeBefore || 0,
      giftOrangeGiven: row.giftOrangeGiven || 0,
      compCellox: row.compCellox || 0,
      compKleenex: row.compKleenex || 0,
      compPaseo: row.compPaseo || 0,
      feedback: row.feedback || "",
      competitorPromo: row.competitorPromo || "",
      remark:
        row.remark ||
        row.remark_store ||
        row.remarkStore ||
        row.remarks ||
        row.note ||
        row.notes ||
        "",
    });
    setIsEditModalOpen(true);
  };

  // ➕ คีย์ย้อนหลังใหม่
  const handleCreateBackdate = () => {
    setPhotoFiles({
      staffHolding: [],
      customerBasket: [],
      atmosphere: [],
      product: [],
      shelf: [],
      stockScanner: [],
    });

    setEditForm({
      id: null,
      reportDate: new Date().toISOString().split("T")[0],
      userId: userOptions[0]?.[0] || "",
      storeCode: storeOptions[0]?.[0] || "",
      traffic: 0,
      approach: 0,
      closedSales: 0,
      priceGreen: 150,
      stockBeforeGreen: 0,
      salesGreen: 0,
      stockAfterGreen: 0,
      priceBlue: 142,
      stockBeforeBlue: 0,
      salesBlue: 0,
      stockAfterBlue: 0,
      priceOrange: 100,
      stockBeforeOrange: 0,
      salesOrange: 0,
      stockAfterOrange: 0,
      giftNourishBefore: 0,
      giftNourishGiven: 0,
      giftOrangeBefore: 0,
      giftOrangeGiven: 0,
      compCellox: 0,
      compKleenex: 0,
      compPaseo: 0,
      feedback: "",
      competitorPromo: "",
      remark: "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveByAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.userId || !editForm.storeCode) {
      Swal.fire("ข้อมูลไม่ครบถ้วน", "กรุณาเลือกพนักงานและสาขา", "warning");
      return;
    }

    setSavingAdmin(true);

    const formattedPhotos = [
      ...photoFiles.staffHolding.map((url) => ({
        url,
        base64: url,
        type: "staff_holding",
        label: "พนักงานถือสินค้า",
      })),
      ...photoFiles.customerBasket.map((url) => ({
        url,
        base64: url,
        type: "customer_basket",
        label: "ถ่ายคู่กับลูกค้า/ตะกร้า",
      })),
      ...photoFiles.atmosphere.map((url) => ({
        url,
        base64: url,
        type: "atmosphere",
        label: "บรรยากาศหน้าร้าน",
      })),
      ...photoFiles.product.map((url) => ({
        url,
        base64: url,
        type: "img_product",
        label: "รูปสินค้า",
      })),
      ...photoFiles.shelf.map((url) => ({
        url,
        base64: url,
        type: "img_shelf",
        label: "รูปเชลฟ์ชั้นวาง",
      })),
      ...photoFiles.stockScanner.map((url) => ({
        url,
        base64: url,
        type: "img_stock_scanner",
        label: "รูปสแกนสต๊อก",
      })),
    ];

    const res = await adminSaveReportWithImagesAction({
      reportId: editForm.id ? Number(editForm.id) : undefined,
      reportDateInput: editForm.reportDate,
      userId: Number(editForm.userId),
      storeCode: editForm.storeCode,
      trafficCount: Number(editForm.traffic || 0),
      approachCount: Number(editForm.approach || 0),
      closedSalesCount: Number(editForm.closedSales || 0),
      priceCompCellox: Number(editForm.compCellox || 0),
      priceCompKleenex: Number(editForm.compKleenex || 0),
      priceCompPaseo: Number(editForm.compPaseo || 0),
      feedbackStore: editForm.feedback,
      competitorPromotion: editForm.competitorPromo,
      remark: editForm.remark,
      activityPhotos: formattedPhotos,

      priceOurGreen90: Number(editForm.priceGreen || 0),
      stockBeforeGreen90: Number(editForm.stockBeforeGreen || 0),
      salesQtyGreen90: Number(editForm.salesGreen || 0),
      stockAfterGreen90: Number(editForm.stockAfterGreen || 0),

      priceOurBlue90: Number(editForm.priceBlue || 0),
      stockBeforeBlue90: Number(editForm.stockBeforeBlue || 0),
      salesQtyBlue90: Number(editForm.salesBlue || 0),
      stockAfterBlue90: Number(editForm.stockAfterBlue || 0),

      priceOurOrange100: Number(editForm.priceOrange || 0),
      stockBeforeOrange100: Number(editForm.stockBeforeOrange || 0),
      salesQtyOrange100: Number(editForm.salesOrange || 0),
      stockAfterOrange100: Number(editForm.stockAfterOrange || 0),

      giftOrangeBefore: Number(editForm.giftOrangeBefore || 0),
      giftOrangeGiven: Number(editForm.giftOrangeGiven || 0),
      giftNourishBefore: Number(editForm.giftNourishBefore || 0),
      giftNourishGiven: Number(editForm.giftNourishGiven || 0),
    });

    setSavingAdmin(false);

    if (res.success) {
      Swal.fire(
        "บันทึกสำเร็จ!",
        "ข้อมูลและรูปภาพถูกอัปเดตเรียบร้อยแล้ว",
        "success",
      );
      setIsEditModalOpen(false);
      loadPortalData();
    } else {
      Swal.fire("เกิดข้อผิดพลาด!", res.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased flex flex-col justify-between">
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
          .overflow-x-auto,
          .overflow-auto {
            overflow: visible !important;
            max-height: none !important;
          }
          table {
            width: 100% !important;
            font-size: 6.5px !important;
            table-layout: auto !important;
          }
          th,
          td {
            padding: 1.5px 2px !important;
            position: static !important;
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
        {/* NAV BAR */}
        <nav className="bg-blue-400 border-b border-slate-200 sticky top-0 z-40 shadow-xs no-print">
          <div className="max-w-[98%] sm:max-w-[96%] mx-auto px-2 sm:px-4 min-h-[60px] py-2 flex items-center justify-between gap-2">
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
              <button
                onClick={handleCreateBackdate}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap mr-2"
              >
                <PlusCircle size={14} />
                <span>คีย์รายงานย้อนหลัง</span>
              </button>

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

          {/* 💵 FINANCIAL KPI CARDS SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  ยอดขายรวมทั้งหมด
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
              </div>
              <div>
                <span className="text-xl font-black text-blue-900 block tracking-tight">
                  ฿{totalRevenue.toLocaleString()}
                </span>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between text-[10px] font-bold">
                  <span className="text-emerald-700">
                    เขียว: ฿{totalGreenRevenue.toLocaleString()}
                  </span>
                  <span className="text-blue-700">
                    ฟ้า: ฿{totalBlueRevenue.toLocaleString()}
                  </span>
                  <span className="text-orange-600">
                    ส้ม: ฿{totalOrangeRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  รายจ่ายพนักงาน PG
                </span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <Users size={18} />
                </div>
              </div>
              <div>
                <span className="text-xl font-black text-purple-900 block tracking-tight">
                  ฿{totalStaffExpense.toLocaleString()}
                </span>
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex justify-between text-[10px] font-bold text-slate-600">
                  <span>ค่าแรง: ฿{totalBaseWage.toLocaleString()}</span>
                  <span>คอมมิชชั่น: ฿{totalCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
                netProfit >= 0
                  ? "bg-emerald-50/50 border-emerald-200"
                  : "bg-rose-50/50 border-rose-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  กำไร / ขาดทุน สุทธิ
                </span>
                <div
                  className={`p-2 rounded-xl ${
                    netProfit >= 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <div>
                <span
                  className={`text-xl font-black block tracking-tight ${
                    netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {netProfit >= 0 ? "+" : ""}฿{netProfit.toLocaleString()}
                </span>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  คำนวณจาก: ยอดขายรวม - รายจ่ายพนักงาน
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  อัตราส่วนกำไร (% Margin)
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Percent size={18} />
                </div>
              </div>
              <div>
                <span
                  className={`text-xl font-black block tracking-tight ${
                    profitMarginPercent >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {profitMarginPercent.toFixed(1)}%
                </span>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  สัดส่วนกำไรต่อยอดขายรวม
                </p>
              </div>
            </div>
          </div>

          {/* 📈 OPERATIONAL KPI CARDS SUMMARY */}
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
            {/* CHART 1 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-blue-600" />
                  1. ยอดขายรายสินค้า (เขียว / ฟ้า / ส้ม)
                </h3>
                <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                  {selectedStore === "ALL" ? "แยก Account" : "แยกรายวัน"}
                </span>
              </div>
              <div className="h-60 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chart1And2Data}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="c1-3dGreen"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient
                        id="c1-3dBlue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient
                        id="c1-3dOrange"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#c2410c" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="displayName"
                      tick={{ fontSize: 10, fontWeight: "bold" }}
                    />
                    <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                    <Tooltip content={<CustomSalesTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                    />
                    <Bar
                      dataKey="salesGreen"
                      name="เขียว 90"
                      fill="url(#c1-3dGreen)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="salesBlue"
                      name="ฟ้า 90"
                      fill="url(#c1-3dBlue)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="salesOrange"
                      name="ส้ม 100"
                      fill="url(#c1-3dOrange)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-emerald-600" />
                  2. สถิติ Funnel (Traffic/Approach/Closed)
                </h3>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                  {selectedStore === "ALL" ? "แยก Account" : "แยกรายวัน"}
                </span>
              </div>
              <div className="h-60 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chart1And2Data}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="c2-3dTraffic"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                      </linearGradient>
                      <linearGradient
                        id="c2-3dBlue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient
                        id="c2-3dGreen"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="displayName"
                      tick={{ fontSize: 10, fontWeight: "bold" }}
                    />
                    <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                    <Tooltip content={<CustomFunnelTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                    />
                    <Bar
                      dataKey="traffic"
                      name="Traffic"
                      fill="url(#c2-3dTraffic)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="approach"
                      name="Approach"
                      fill="url(#c2-3dBlue)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="closedSales"
                      name="Closed Sales"
                      fill="url(#c2-3dGreen)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3 */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <PieChartIcon size={16} className="text-purple-600" />
                  3. เปรียบเทียบราคาหน้าร้าน vs คู่แข่ง (บาท)
                </h3>
                <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md">
                  ข้อมูล ณ {chart3Data.latestDate}
                </span>
              </div>
              <div className="h-60 sm:h-64 w-full relative">
                {chart3Data.slices.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                    ไม่มีข้อมูลราคาในวันที่ระบุ
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient
                          id="c3-3dGreen"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient
                          id="c3-3dBlue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient
                          id="c3-3dOrange"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#c2410c" />
                        </linearGradient>
                        <linearGradient
                          id="c3-3dCellox"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#be123c" />
                        </linearGradient>
                        <linearGradient
                          id="c3-3dKleenex"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#7e22ce" />
                        </linearGradient>
                        <linearGradient
                          id="c3-3dPaseo"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#fcd34d" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                      </defs>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                      />
                      <Pie
                        data={chart3Data.slices}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        cornerRadius={6}
                      >
                        {chart3Data.slices.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 📋 FULL CUSTOMER REPORT TABLE */}
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

            <div className="relative overflow-auto max-h-[70vh] border-t border-slate-200">
              <table className="w-full text-[10px] border-collapse min-w-[2600px]">
                <thead className="sticky top-0 z-30 bg-slate-100 text-slate-600 font-black uppercase shadow-xs">
                  <tr className="border-b border-slate-200">
                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 text-center sticky left-0 z-40 bg-slate-100 min-w-[50px] w-[50px]"
                    >
                      NO.
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 sticky left-[50px] z-40 bg-slate-100 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    >
                      สาขา
                    </th>

                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 text-center bg-amber-100 text-amber-900 min-w-[70px] no-print"
                    >
                      จัดการ
                    </th>

                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 min-w-[140px]"
                    >
                      พนักงาน
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 text-center min-w-[90px]"
                    >
                      วันที่
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 text-center min-w-[90px]"
                    >
                      TARGET (แพ็ค)
                    </th>

                    <th
                      colSpan={3}
                      className="p-2 border-r border-slate-200 text-center bg-blue-50/70 text-blue-900"
                    >
                      สถิติลูกค้า (FUNNEL)
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border-r border-slate-200 text-center bg-slate-200/60"
                    >
                      STOCK ก่อนเริ่ม (P)
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border-r border-slate-200 text-center bg-emerald-100/60 text-emerald-900"
                    >
                      จำนวนขาย (แพ็ค)
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border-r border-slate-200 text-center bg-slate-200/60"
                    >
                      STOCK หลังเลิก (P)
                    </th>

                    <th
                      colSpan={2}
                      className="p-2 border-r border-slate-200 text-center bg-orange-50/70 text-orange-900"
                    >
                      ของแถมก่อนเริ่ม
                    </th>
                    <th
                      colSpan={2}
                      className="p-2 border-r border-slate-200 text-center bg-amber-100/70 text-amber-900"
                    >
                      จำนวนแจกแถม
                    </th>
                    <th
                      colSpan={2}
                      className="p-2 border-r border-slate-200 text-center bg-orange-100/60 text-orange-900"
                    >
                      ของแถมคงเหลือ
                    </th>

                    <th
                      colSpan={3}
                      className="p-2 border-r border-slate-200 text-center bg-indigo-50/70 text-indigo-900"
                    >
                      ราคาขายหน้าร้าน
                    </th>
                    <th
                      colSpan={3}
                      className="p-2 border-r border-slate-200 text-center bg-rose-50/70 text-rose-900"
                    >
                      ราคาคู่แข่ง
                    </th>

                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 min-w-[220px] max-w-[300px]"
                    >
                      FEEDBACK หน้าร้าน
                    </th>
                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 min-w-[200px] max-w-[280px]"
                    >
                      โปรคู่แข่ง
                    </th>

                    <th
                      rowSpan={2}
                      className="p-2 border-r border-slate-200 min-w-[220px] max-w-[320px] bg-amber-100/80 text-amber-950 font-black"
                    >
                      หมายเหตุ
                    </th>

                    <th
                      colSpan={6}
                      className="p-2 border-r border-slate-200 text-center bg-blue-100/80 text-blue-950 min-w-[360px]"
                    >
                      📸 รูปภาพกิจกรรมหน้าร้าน & สต๊อกสินค้า
                    </th>
                  </tr>

                  <tr className="bg-slate-50 text-[9px] border-b border-slate-200 text-center">
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/40">
                      TRAFFIC
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/40">
                      APPROACH
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/40">
                      CLOSED
                    </th>

                    <th className="p-1.5 border-r border-slate-200">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border-r border-slate-200">ฟ้า 90</th>
                    <th className="p-1.5 border-r border-slate-200">ส้ม 100</th>

                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50/40">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50/40">
                      ฟ้า 90
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-emerald-50/40">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border-r border-slate-200">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border-r border-slate-200">ฟ้า 90</th>
                    <th className="p-1.5 border-r border-slate-200">ส้ม 100</th>

                    <th className="p-1.5 border-r border-slate-200 bg-orange-50/40">
                      เขียว 40
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-orange-50/40">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border-r border-slate-200 bg-amber-50/40">
                      เขียว 40
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-amber-50/40">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border-r border-slate-200 bg-orange-50/40">
                      เขียว 40
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-orange-50/40">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border-r border-slate-200 bg-indigo-50/40">
                      เขียว 90
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-indigo-50/40">
                      ฟ้า 90
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-indigo-50/40">
                      ส้ม 100
                    </th>

                    <th className="p-1.5 border-r border-slate-200 bg-rose-50/40">
                      CELLOX
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-rose-50/40">
                      KLEENEX
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-rose-50/40">
                      PASEO
                    </th>

                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/50">
                      พนักงานถือสินค้า
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/50">
                      ถ่ายคู่กับลูกค้า/ตะกร้า
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/50">
                      บรรยากาศหน้าร้าน
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/50">
                      รูปสินค้า
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/50">
                      รูปเชลฟ์ชั้นวาง
                    </th>
                    <th className="p-1.5 border-r border-slate-200 bg-blue-50/50">
                      รูปสแกนสต๊อก
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                  {filteredData.map((row, idx) => {
                    const photos = categorizePhotos(row.activityPhotos);
                    const accountName = getAccountName(
                      row.storeName,
                      row.storeCode,
                    );
                    const isBigC = accountName === "Big C";

                    const stockAfterGreen =
                      row.stockAfterGreen !== undefined &&
                      row.stockAfterGreen !== null &&
                      row.stockAfterGreen !== ""
                        ? Number(row.stockAfterGreen)
                        : Math.max(
                            0,
                            Number(row.stockBeforeGreen || 0) -
                              Number(row.salesGreen || 0) * (isBigC ? 2 : 1),
                          );

                    const stockAfterBlue =
                      row.stockAfterBlue !== undefined &&
                      row.stockAfterBlue !== null &&
                      row.stockAfterBlue !== ""
                        ? Number(row.stockAfterBlue)
                        : Math.max(
                            0,
                            Number(row.stockBeforeBlue || 0) -
                              Number(row.salesBlue || 0) * (isBigC ? 2 : 1),
                          );

                    const stockAfterOrange = isBigC
                      ? "-"
                      : row.stockAfterOrange !== undefined &&
                          row.stockAfterOrange !== null &&
                          row.stockAfterOrange !== ""
                        ? Number(row.stockAfterOrange)
                        : Math.max(
                            0,
                            Number(row.stockBeforeOrange || 0) -
                              Number(row.salesOrange || 0) * 2,
                          );

                    const remarkDisplay =
                      row.remark ||
                      row.remark_store ||
                      row.remarkStore ||
                      row.remarks ||
                      row.note ||
                      row.notes ||
                      "";

                    return (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-slate-50 transition text-center"
                      >
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-400 sticky left-0 z-20 bg-white min-w-[50px] w-[50px]">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-black text-slate-800 text-left sticky left-[50px] z-20 bg-white min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {row.storeName}
                        </td>

                        <td className="p-2 border-r border-slate-200 text-center no-print">
                          <button
                            onClick={() => handleEditRow(row)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[9px] transition cursor-pointer flex items-center gap-1 mx-auto"
                            title="แก้ไขรายงานแถวนี้"
                          >
                            <Edit3 size={11} /> แก้ไข
                          </button>
                        </td>

                        <td className="p-2 border-r border-slate-200 text-left font-medium text-slate-600">
                          {row.userName}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {row.reportDate}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-500">
                          {row.targetPacks}
                        </td>

                        {/* Funnel */}
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {row.traffic}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-blue-600 font-bold">
                          {row.approach}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-emerald-600 font-bold">
                          {row.closedSales}
                        </td>

                        {/* Stock Before */}
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {row.stockBeforeGreen}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {row.stockBeforeBlue}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {isBigC ? "-" : row.stockBeforeOrange}
                        </td>

                        {/* Sales Qty */}
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-emerald-600 bg-emerald-50/20">
                          +{row.salesGreen}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-600 bg-blue-50/20">
                          +{row.salesBlue}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-orange-600 bg-orange-50/20">
                          {isBigC ? "-" : `+${row.salesOrange}`}
                        </td>

                        {/* Stock After */}
                        <td className="p-2 border-r border-slate-200">
                          {renderStockCell(stockAfterGreen)}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {renderStockCell(stockAfterBlue)}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {renderStockCell(stockAfterOrange)}
                        </td>

                        {/* Gifts */}
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-500">
                          {row.giftNourishBefore || 0}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-500">
                          {row.giftOrangeBefore || 0}
                        </td>

                        <td className="p-2 border-r border-slate-200 font-mono text-amber-600 font-bold bg-amber-50/20">
                          {row.giftNourishGiven || 0}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-amber-600 font-bold bg-amber-50/20">
                          {row.giftOrangeGiven || 0}
                        </td>

                        <td className="p-2 border-r border-slate-200 font-mono text-emerald-600 font-bold">
                          {row.giftNourishAfter || 0}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-emerald-600 font-bold">
                          {row.giftOrangeAfter || 0}
                        </td>

                        {/* Prices */}
                        <td className="p-2 border-r border-slate-200 font-mono font-semibold">
                          {row.priceGreen ? `${row.priceGreen}฿` : "-"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-semibold">
                          {row.priceBlue ? `${row.priceBlue}฿` : "-"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-semibold">
                          {row.priceOrange ? `${row.priceOrange}฿` : "-"}
                        </td>

                        <td className="p-2 border-r border-slate-200 font-mono text-rose-600 font-bold">
                          {row.compCellox > 0 ? `${row.compCellox}฿` : "-"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-rose-600 font-bold">
                          {row.compKleenex > 0 ? `${row.compKleenex}฿` : "-"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-rose-600 font-bold">
                          {row.compPaseo > 0 ? `${row.compPaseo}฿` : "-"}
                        </td>

                        {/* Text Feedback & Promo */}
                        <td
                          className="p-2 border-r border-slate-200 text-left text-slate-600 min-w-[220px] max-w-[300px] whitespace-normal break-words leading-tight"
                          title={row.feedback || ""}
                        >
                          {row.feedback || "-"}
                        </td>
                        <td
                          className="p-2 border-r border-slate-200 text-left text-rose-600 min-w-[200px] max-w-[280px] whitespace-normal break-words leading-tight"
                          title={row.competitorPromo || ""}
                        >
                          {row.competitorPromo || "-"}
                        </td>

                        {/* 📌 หมายเหตุ */}
                        <td
                          className="p-2 border-r border-slate-200 text-left font-bold text-amber-900 bg-amber-50/40 min-w-[220px] max-w-[320px] whitespace-normal break-words leading-tight"
                          title={remarkDisplay}
                        >
                          {remarkDisplay || "-"}
                        </td>

                        {/* Photos */}
                        <td className="p-2 border-r border-slate-200">
                          {renderPhotoCell(
                            photos.staffHolding,
                            "พนักงานถือสินค้า",
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {renderPhotoCell(
                            photos.customerBasket,
                            "ถ่ายคู่กับลูกค้า/ตะกร้า",
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {renderPhotoCell(
                            photos.atmosphere,
                            "บรรยากาศหน้าร้าน",
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {renderPhotoCell(photos.product, "รูปสินค้า")}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {renderPhotoCell(photos.shelf, "รูปเชลฟ์ชั้นวาง")}
                        </td>
                        <td className="p-2 border-r border-slate-200">
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

      {/* 🛠️ MODAL สำหรับ ADMIN บันทึก/แก้ไข รายงานย้อนหลัง + แนบรูปภาพ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8">
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 size={16} className="text-amber-400" />
                {editForm.id
                  ? `แก้ไขรายงานกิจกรรม (ID: ${editForm.id})`
                  : "คีย์รายงานกิจกรรมย้อนหลัง (Admin)"}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveByAdmin}
              className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs"
            >
              {/* ข้อมูลทั่วไป */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold mb-1">วันที่รายงาน:</label>
                  <input
                    type="date"
                    value={editForm.reportDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reportDate: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg font-mono font-bold bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">พนักงาน (PG):</label>
                  <select
                    value={editForm.userId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, userId: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg font-bold bg-white"
                    required
                  >
                    <option value="">-- เลือกพนักงาน --</option>
                    {userOptions.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">สาขา:</label>
                  <select
                    value={editForm.storeCode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, storeCode: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg font-bold bg-white"
                    required
                  >
                    <option value="">-- เลือกสาขา --</option>
                    {storeOptions.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name} ({code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* สถิติ Funnel */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-900 block mb-2">
                  📊 สถิติลูกค้า (Funnel)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Traffic</label>
                    <input
                      type="number"
                      value={editForm.traffic}
                      onChange={(e) =>
                        setEditForm({ ...editForm, traffic: e.target.value })
                      }
                      className="w-full border p-2 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Approach
                    </label>
                    <input
                      type="number"
                      value={editForm.approach}
                      onChange={(e) =>
                        setEditForm({ ...editForm, approach: e.target.value })
                      }
                      className="w-full border p-2 rounded-lg font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">
                      Closed Sales
                    </label>
                    <input
                      type="number"
                      value={editForm.closedSales}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          closedSales: e.target.value,
                        })
                      }
                      className="w-full border p-2 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* ยอดขายและสต๊อกสินค้า */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                <span className="font-bold text-emerald-900 block">
                  📦 ยอดขายและสต๊อกสินค้า
                </span>

                <div className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-lg border">
                  <span className="font-bold text-emerald-700">เขียว 90</span>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Stock เริ่ม
                    </label>
                    <input
                      type="number"
                      value={editForm.stockBeforeGreen}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          stockBeforeGreen: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ยอดขาย</label>
                    <input
                      type="number"
                      value={editForm.salesGreen}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          salesGreen: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono text-emerald-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Stock หลังเลิก
                    </label>
                    <input
                      type="number"
                      value={editForm.stockAfterGreen}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          stockAfterGreen: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-lg border">
                  <span className="font-bold text-blue-700">ฟ้า 90</span>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Stock เริ่ม
                    </label>
                    <input
                      type="number"
                      value={editForm.stockBeforeBlue}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          stockBeforeBlue: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ยอดขาย</label>
                    <input
                      type="number"
                      value={editForm.salesBlue}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          salesBlue: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono text-blue-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Stock หลังเลิก
                    </label>
                    <input
                      type="number"
                      value={editForm.stockAfterBlue}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          stockAfterBlue: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 items-center bg-white p-2 rounded-lg border">
                  <span className="font-bold text-orange-600">ส้ม 100</span>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Stock เริ่ม
                    </label>
                    <input
                      type="number"
                      value={editForm.stockBeforeOrange}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          stockBeforeOrange: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">ยอดขาย</label>
                    <input
                      type="number"
                      value={editForm.salesOrange}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          salesOrange: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono text-orange-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">
                      Stock หลังเลิก
                    </label>
                    <input
                      type="number"
                      value={editForm.stockAfterOrange}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          stockAfterOrange: e.target.value,
                        })
                      }
                      className="w-full border p-1 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ของแถม */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="font-bold text-amber-900 block mb-2">
                  🎁 สต๊อกของแถม
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2 rounded-lg border">
                    <span className="font-bold block text-slate-700 mb-1">
                      เขียว 40
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">
                          ยกมา
                        </label>
                        <input
                          type="number"
                          value={editForm.giftNourishBefore}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              giftNourishBefore: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">
                          แจกไป
                        </label>
                        <input
                          type="number"
                          value={editForm.giftNourishGiven}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              giftNourishGiven: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono text-amber-600 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-lg border">
                    <span className="font-bold block text-slate-700 mb-1">
                      ส้ม 100
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">
                          ยกมา
                        </label>
                        <input
                          type="number"
                          value={editForm.giftOrangeBefore}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              giftOrangeBefore: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">
                          แจกไป
                        </label>
                        <input
                          type="number"
                          value={editForm.giftOrangeGiven}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              giftOrangeGiven: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono text-amber-600 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🏷️ ราคาขายหน้าร้าน & ราคาคู่แข่ง */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <span className="font-bold text-indigo-900 block">
                  🏷️ ราคาขายหน้าร้าน & ราคาคู่แข่ง (บาท)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ราคาของเรา */}
                  <div className="bg-white p-2.5 rounded-lg border">
                    <span className="font-bold block text-slate-700 mb-1.5 text-[11px]">
                      ราคาขายสินค้าของเรา
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">
                          เขียว 90
                        </label>
                        <input
                          type="number"
                          value={editForm.priceGreen}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              priceGreen: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">
                          ฟ้า 90
                        </label>
                        <input
                          type="number"
                          value={editForm.priceBlue}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              priceBlue: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono font-bold text-blue-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">
                          ส้ม 100
                        </label>
                        <input
                          type="number"
                          value={editForm.priceOrange}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              priceOrange: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono font-bold text-orange-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ราคาคู่แข่ง */}
                  <div className="bg-white p-2.5 rounded-lg border">
                    <span className="font-bold block text-slate-700 mb-1.5 text-[11px]">
                      ราคาคู่แข่งหน้าร้าน
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">
                          Cellox
                        </label>
                        <input
                          type="number"
                          value={editForm.compCellox}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              compCellox: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono text-rose-600 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">
                          Kleenex
                        </label>
                        <input
                          type="number"
                          value={editForm.compKleenex}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              compKleenex: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono text-rose-600 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">
                          Paseo
                        </label>
                        <input
                          type="number"
                          value={editForm.compPaseo}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              compPaseo: e.target.value,
                            })
                          }
                          className="w-full border p-1 rounded font-mono text-rose-600 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📸 ส่วนอัปโหลดรูปภาพกิจกรรมหน้าร้านย้อนหลัง */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-purple-600" />
                  📸 อัปโหลดรูปภาพกิจกรรมหน้าร้าน (Admin)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "staffHolding", label: "1. พนักงานถือสินค้า" },
                    {
                      key: "customerBasket",
                      label: "2. ถ่ายคู่กับลูกค้า/ตะกร้า",
                    },
                    { key: "atmosphere", label: "3. บรรยากาศหน้าร้าน" },
                    { key: "product", label: "4. รูปสินค้า" },
                    { key: "shelf", label: "5. รูปเชลฟ์ชั้นวาง" },
                    { key: "stockScanner", label: "6. รูปสแกนสต๊อก" },
                  ].map((field) => {
                    const k = field.key as keyof typeof photoFiles;
                    return (
                      <div
                        key={k}
                        className="bg-white p-2.5 rounded-lg border border-slate-200"
                      >
                        <span className="font-bold text-slate-700 block mb-1.5 text-[11px]">
                          {field.label}
                        </span>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {photoFiles[k].map((url, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={url}
                                alt={field.label}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(k, imgIdx)}
                                className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 shadow-xs cursor-pointer"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <label className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-dashed border-slate-300 rounded-lg cursor-pointer transition text-[10px] font-bold">
                          <Upload size={12} />
                          <span>เพิ่มรูปภาพ</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) =>
                              handleFileUpload(k, e.target.files)
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ข้อความเพิ่มเติม */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">
                    Feedback หน้าร้าน:
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.feedback}
                    onChange={(e) =>
                      setEditForm({ ...editForm, feedback: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">
                    โปรโมชันคู่แข่ง:
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.competitorPromo}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        competitorPromo: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">หมายเหตุ:</label>
                  <textarea
                    rows={2}
                    value={editForm.remark}
                    onChange={(e) =>
                      setEditForm({ ...editForm, remark: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg bg-amber-50/50 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Save size={14} />
                  {savingAdmin ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
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
              <p className="text-[10px] text-white font-medium">
                Niwat Wiyasing
              </p>
              <p className="text-[10px] text-white font-medium">
                Niwat_wiy@riverpro.co.th
              </p>
              <p className="text-[10px] text-white font-medium">
                ระบบรายงานกิจกรรมพนักงาน PG หน้าร้าน & การตลาด
              </p>
            </div>
          </div>

          <div className="text-[11px] text-white text-center sm:text-right font-medium">
            © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd. All
            Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
