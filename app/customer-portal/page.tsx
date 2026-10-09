"use client";

import { createClient } from "@supabase/supabase-js";
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
  PlusCircle,
  Edit3,
  X,
  Save,
  Image as ImageIcon,
  Upload,
  Tag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  getCustomerFullActivityReport,
  adminSaveReportWithImagesAction,
  getAdminSalarySummaryReportAction,
} from "../dashboard/actions";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

// ==========================================
// 1. Type Interfaces
// ==========================================
export interface ReportProduct {
  barcode: string;
  label: string;
  shortLabel: string;
  bgClass: string;
  color: string;
  gradStart?: string;
  gradEnd?: string;
}

export interface CompetitorItem {
  key: string;
  label: string;
  bgClass?: string;
  color?: string;
  gradStart?: string;
  gradEnd?: string;
}

// ==========================================
// 2. ประกาศตัวแปร COMPETITOR_ITEMS
// ==========================================
const COMPETITOR_ITEMS: CompetitorItem[] = [
  { key: "cellox_satin_4", label: "เซลล็อกซ์ ซาติน แพ็ค 4 (บ.)" },
  { key: "kleenex_silky_4", label: "คลีเน็กซ์ ซิลค์กี้สมูท แพ็ค 4 (บ.)" },
  { key: "scott_safesoft_4", label: "สก็อตต์เซฟซอฟท์บ๊อกซ์แพ็ค4 (บ.)" },
  { key: "zilk_cotton_6", label: "ซิลค์ คอตตอน ชำระแพ็ค 6 (บ.)" },
  { key: "cellox_2ply_6", label: "เซลล็อกซ์ 2 ชั้น ชำระแพ็ค 6 (บ.)" },
  { key: "scott_extra_6", label: "สก็อตต์ เอ็กซ์ตร้า ชำระแพ็ค 6 (บ.)" },
  { key: "zilk_cotton_24", label: "ซิลค์ คอตตอน ชำระแพ็ค 24 (บ.)" },
  { key: "cellox_2ply_24", label: "เซลล็อกซ์ 2 ชั้น ชำระแพ็ค 24 (บ.)" },
  { key: "scott_extra_24", label: "สก็อตต์ เอ็กซ์ตร้า ชำระแพ็ค 24 (บ.)" },
  { key: "maxmo_hang_200", label: "แม๊กโม่แบบแขวน 200 แผ่น (บ.)" },
  { key: "maxmo_3", label: "แม๊กซ์โม่อเนกประสงค์ แพ็ค 3 (บ.)" },
  { key: "scott_3_1", label: "สก็อตต์ อเนกประสงค์ 3+1 (บ.)" },
  { key: "maxmo_6_2_green", label: "แม๊กซ์โม่ อเนกประสงค์ 6+2 เขียว (บ.)" },
  { key: "maxmo_6_2_red", label: "แม๊กซ์โม่ อเนกประสงค์ 6+2 แดง (บ.)" },
  { key: "scott_6_2_red", label: "สก็อตต์ อเนกประสงค์ 6+2 แดง (บ.)" },
];

// ==========================================
// 3. ประกาศตัวแปร REPORT_PRODUCTS พร้อม gradStart / gradEnd
// ==========================================
const REPORT_PRODUCTS: ReportProduct[] = [
  {
    barcode: "8858678423339",
    label: "มายด์ลักซูรี่ สีเขียว 90",
    shortLabel: "เขียว 90",
    bgClass: "bg-emerald-50 min-w-[180px]",
    color: "#059669",
    gradStart: "#34d399",
    gradEnd: "#059669",
  },
  {
    barcode: "8858678423681",
    label: "มายด์ลักซูรี่ สีฟ้า 90",
    shortLabel: "ฟ้า 90",
    bgClass: "bg-blue-50 min-w-[180px]",
    color: "#2563eb",
    gradStart: "#60a5fa",
    gradEnd: "#1d4ed8",
  },
  {
    barcode: "8858678422875",
    label: "มายด์ลักซูรี่ สีส้ม 100",
    shortLabel: "ส้ม 100",
    bgClass: "bg-orange-50 min-w-[180px]",
    color: "#ea580c",
    gradStart: "#fb923c",
    gradEnd: "#c2410c",
  },
  {
    barcode: "8858678423407",
    label: "มายด์โดราเอมอน แพ็ค 5",
    shortLabel: "โดราเอมอน P5",
    bgClass: "bg-sky-50 min-w-[180px]",
    color: "#0284c7",
    gradStart: "#38bdf8",
    gradEnd: "#0369a1",
  },
  {
    barcode: "8858678423063",
    label: "เทนเดอร์ เช็ดหน้า 4+1",
    shortLabel: "เทนเดอร์ เช็ดหน้า 4+1",
    bgClass: "bg-red-50 min-w-[180px]",
    color: "#dc2626",
    gradStart: "#f87171",
    gradEnd: "#b91c1c",
  },
  {
    barcode: "8851020101213",
    label: "เทนเดอร์ ชำระ 6+2",
    shortLabel: "เทนเดอร์ ชำระ 6+2",
    bgClass: "bg-rose-50 min-w-[180px]",
    color: "#e11d48",
    gradStart: "#fb7185",
    gradEnd: "#be123c",
  },
  {
    barcode: "8851020101220",
    label: "เทนเดอร์ ชำระ 24+6",
    shortLabel: "เทนเดอร์ ชำระ 24+6",
    bgClass: "bg-rose-100 min-w-[180px]",
    color: "#be123c",
    gradStart: "#fda4af",
    gradEnd: "#881337",
  },
  {
    barcode: "8858678422769",
    label: "เทนเดอร์ อเนกประสงค์ 200",
    shortLabel: "เทนเดอร์ อเนกฯ 200",
    bgClass: "bg-amber-50 min-w-[180px]",
    color: "#d97706",
    gradStart: "#fcd34d",
    gradEnd: "#b45309",
  },
  {
    barcode: "8858678422752",
    label: "เทนเดอร์ อเนกประสงค์ 3+1",
    shortLabel: "เทนเดอร์ อเนกฯ 3+1",
    bgClass: "bg-amber-100 min-w-[180px]",
    color: "#b45309",
    gradStart: "#fde047",
    gradEnd: "#78350f",
  },
  {
    barcode: "8858678421304",
    label: "เทนเดอร์ อเนกประสงค์ 6+2",
    shortLabel: "เทนเดอร์ อเนกฯ 6+2",
    bgClass: "bg-yellow-100 min-w-[180px]",
    color: "#a16207",
    gradStart: "#fef08a",
    gradEnd: "#713f12",
  },
];

const PRICE_CHART_SERIES = [
  ...REPORT_PRODUCTS.map((prod) => ({
    dataKey: `our_${prod.barcode}`,
    name: `${prod.shortLabel} (เรา)`,
    color: prod.color,
    type: "our" as const,
    sourceKey: prod.barcode,
  })),
  ...COMPETITOR_ITEMS.map((comp, index) => ({
    dataKey: `competitor_${comp.key}`,
    name: comp.label.replace(" (บ.)", ""),
    color: [
      "#e11d48",
      "#be123c",
      "#9f1239",
      "#c2410c",
      "#d97706",
      "#a16207",
      "#4d7c0f",
      "#15803d",
      "#047857",
      "#0f766e",
      "#0891b2",
      "#1d4ed8",
      "#4338ca",
      "#6b21a8",
      "#a21caf",
    ][index],
    type: "competitor" as const,
    sourceKey: comp.key,
  })),
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 📸 Helper ย่อขนาดรูปภาพ
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

// 📸 Helper สำหรับแสดง Pop-up ดูรูปภาพขนาดใหญ่ด้วย Swal
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

// 📸 กำหนดโครงสร้างคอลัมน์รูปภาพแบบแยก 1 รูปต่อ 1 คอลัมน์
const PHOTO_COLUMNS_CONFIG = [
  { key: "staffHolding", label: "พนักงานถือสินค้า", max: 1 },
  { key: "customerBasket", label: "ถ่ายคู่กับลูกค้า/ตะกร้า", max: 2 },
  { key: "atmosphere", label: "บรรยากาศหน้าร้าน", max: 2 },
  { key: "product", label: "รูปสินค้า", max: 4 },
  { key: "shelf", label: "รูปเชลฟ์ชั้นวาง", max: 4 },
  { key: "stockScanner", label: "รูปสแกนสต๊อก", max: 2 },
];

// คำนวณจำนวนคอลัมน์รูปภาพรวมทั้งหมด (1 + 2 + 2 + 4 + 4 + 2 = 15 คอลัมน์)
const TOTAL_PHOTO_COLS = PHOTO_COLUMNS_CONFIG.reduce(
  (sum, item) => sum + item.max,
  0,
);

//  Helper เช็คชื่อ Account
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

// 📦 Helper ดึงข้อมูลสินค้าแต่ละบาร์โค้ด
function getProductInfo(row: any, barcode: string, isBigC: boolean = false) {
  const prods = row.products || row.pg_daily_report_products || row.items;

  if (Array.isArray(prods) && prods.length > 0) {
    const found = prods.find(
      (p: any) => String(p.barcode).trim() === String(barcode).trim(),
    );

    if (found) {
      const sb = Number(found.stock_before ?? found.stockBefore ?? 0);
      const sq = Number(found.sales_qty ?? found.salesQty ?? 0);
      let sa = found.stock_after ?? found.stockAfter;
      if (sa === undefined || sa === null || sa === "") {
        sa = Math.max(0, sb - sq);
      } else {
        sa = Number(sa);
      }
      const pr = Number(found.price_our ?? found.priceOur ?? 0);
      return { stockBefore: sb, salesQty: sq, stockAfter: sa, priceOur: pr };
    }
  }

  // Fallback เดิมสำหรับย้อนหลัง legacy
  if (barcode === "8858678423339") {
    const sb = Number(row.stockBeforeGreen ?? row.stock_before_green90 ?? 0);
    const sq = Number(row.salesGreen ?? row.sales_qty_green90 ?? 0);
    const sa =
      row.stockAfterGreen ??
      row.stock_after_green90 ??
      Math.max(0, sb - sq * (isBigC ? 2 : 1));
    const pr = Number(row.priceGreen ?? row.price_our_green90 ?? 150);
    return { stockBefore: sb, salesQty: sq, stockAfter: sa, priceOur: pr };
  }
  if (barcode === "8858678423681") {
    const sb = Number(row.stockBeforeBlue ?? row.stock_before_blue90 ?? 0);
    const sq = Number(row.salesBlue ?? row.sales_qty_blue90 ?? 0);
    const sa =
      row.stockAfterBlue ??
      row.stock_after_blue90 ??
      Math.max(0, sb - sq * (isBigC ? 2 : 1));
    const pr = Number(row.priceBlue ?? row.price_our_blue90 ?? 142);
    return { stockBefore: sb, salesQty: sq, stockAfter: sa, priceOur: pr };
  }
  if (barcode === "8858678422875") {
    if (isBigC)
      return {
        stockBefore: "-",
        salesQty: "-",
        stockAfter: "-",
        priceOur: "-",
      };
    const sb = Number(row.stockBeforeOrange ?? row.stock_before_orange100 ?? 0);
    const sq = Number(row.salesOrange ?? row.sales_qty_orange100 ?? 0);
    const sa =
      row.stockAfterOrange ??
      row.stock_after_orange100 ??
      Math.max(0, sb - sq * 2);
    const pr = Number(row.priceOrange ?? row.price_our_orange100 ?? 100);
    return { stockBefore: sb, salesQty: sq, stockAfter: sa, priceOur: pr };
  }

  return { stockBefore: "-", salesQty: "-", stockAfter: "-", priceOur: "-" };
}

// 💰 Helper คำนวณยอดขายรวมทุก SKU ต่อแถว (ชิ้น/แพ็ค)
function getRowTotalSalesPcs(row: any): number {
  const accountName = getAccountName(
    row.storeName || row.store_name,
    row.storeCode || row.store_code,
  );
  const isBigC = accountName === "Big C";
  const productRows = row.products || row.pg_daily_report_products || row.items;

  if (!Array.isArray(productRows) || productRows.length === 0) {
    const green = Number(
      getProductInfo(row, "8858678423339", isBigC).salesQty || 0,
    );
    const blue = Number(
      getProductInfo(row, "8858678423681", isBigC).salesQty || 0,
    );
    const orange = Number(
      getProductInfo(row, "8858678422875", isBigC).salesQty || 0,
    );

    return isBigC ? (green + blue) * 2 : green + blue + orange * 2;
  }

  let totalPcs = 0;

  REPORT_PRODUCTS.forEach((prod) => {
    const info = getProductInfo(row, prod.barcode, isBigC);
    if (typeof info.salesQty === "number" && !isNaN(info.salesQty)) {
      totalPcs += info.salesQty;
    }
  });

  return totalPcs;
}

function withPackTotals(rows: any[] = []) {
  return rows.map((row) => {
    const totalPacks = getRowTotalSalesPcs(row);

    return {
      ...row,
      actualPacksTotal: totalPacks,
      actualSetsTotal: totalPacks,
    };
  });
}

// 💵 Helper คำนวณ Commission รายวันจากยอดขายรวมทุก SKU
function calculateDailyCommission(totalSalesPcs: number): number {
  if (totalSalesPcs >= 40) {
    return 200 + Math.floor((totalSalesPcs - 40) / 10) * 100;
  }
  if (totalSalesPcs >= 30) {
    return 100;
  }
  return 0;
}

// 🏷️ Helper ดึงราคาคู่แข่ง
function getCompetitorVal(row: any, key: string) {
  const compObj = row.competitorPrices || row.compPrices;
  const competitorPrice =
    compObj && typeof compObj === "object" ? compObj[key] : undefined;
  const storedPrice = competitorPrice ?? row[key];
  if (storedPrice !== undefined && storedPrice !== null && storedPrice !== "") {
    return Number(storedPrice) || "-";
  }
  if (key === "cellox_satin_4" && row.compCellox) return Number(row.compCellox);
  if (key === "kleenex_silky_4" && row.compKleenex)
    return Number(row.compKleenex);
  if (key === "scott_safesoft_4" && row.compPaseo) return Number(row.compPaseo);
  return "-";
}

// 📌 Helper แสดงผลสต๊อก
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
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50 backdrop-blur-md max-h-60 overflow-y-auto">
        <p className="font-black text-blue-400 mb-1 border-b border-slate-700 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => {
          if (Number(entry.value) === 0) return null;
          return (
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
          );
        })}
      </div>
    );
  }
  return null;
};

// 🎯 Custom Tooltip กราฟที่ 2
const CustomFunnelTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const name = payload[0].name || label;
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50 backdrop-blur-md">
        <p className="font-black text-amber-400 mb-1 border-b border-slate-700 pb-1">
          {name}
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

export default function CustomerReportPortal() {
  const [reportData, setReportData] = useState<any[]>([]);
  const [attendanceWages, setAttendanceWages] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportProducts, setReportProducts] = useState<any[]>([]);

  const fetchProductsData = async () => {
    const { data, error } = await supabase
      .from("products") // หรือชื่อตารางสินค้าของคุณ
      .select("*")
      .eq("is_active", true);

    if (!error && data) {
      // แปลงข้อมูลให้อยู่ในโครงสร้างที่รองรับการแสดงผล
      return data.map((item, index) => ({
        barcode: item.barcode,
        label: item.name,
        shortLabel: item.short_name || item.name,
        bgClass: "bg-slate-100 min-w-[180px] max-w-[300px]",
        color: item.color || "#3b82f6",
        gradStart: item.grad_start || "#60a5fa",
        gradEnd: item.grad_end || "#1d4ed8",
      }));
    }
    return [];
  };

  const [currentTime, setCurrentTime] = useState<string>("");

  // Filter States
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [selectedPromotion, setSelectedPromotion] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

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
    promotionId: "",
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
    compCellox: 0,
    compKleenex: 0,
    compPaseo: 0,
    competitorPrices: {},
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

  const [salarySummaryData, setSalarySummaryData] = useState<any[]>([]);

  // 🏷️ ดึงรอบโปรโมชั่นจาก Supabase โดยตรง
  const fetchPromotionsData = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return { success: true, data };
      }
    } catch (e) {
      console.warn("Unable to fetch promotions:", e);
    }
    return { success: false, data: [] };
  };

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const res = await getCustomerFullActivityReport();
      if (!res.success) {
        throw new Error(res.message || "ไม่สามารถโหลดรายงานกิจกรรมได้");
      }

      const normalizedRows = withPackTotals(res.data || []);
      setReportData(normalizedRows);
      setFilteredData(normalizedRows);
      setAttendanceWages((res as any).attendanceWages || []);

      const promoRes = await fetchPromotionsData();
      if (promoRes.success) {
        setPromotions(promoRes.data || []);
      }
    } catch (error: any) {
      console.error("Customer portal data load error:", error);
      Swal.fire(
        "โหลดข้อมูลไม่สำเร็จ",
        error.message || "กรุณาเข้าสู่ระบบใหม่ด้วยบัญชีผู้ดูแลระบบ",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  useEffect(() => {
    const selectedPromo = promotions.find(
      (promotion) => String(promotion.id) === String(selectedPromotion),
    );
    const promoStartDate = selectedPromo?.start_date?.split("T")[0] || "";
    const promoEndDate = selectedPromo?.end_date?.split("T")[0] || "";
    const startDates = [startDate, promoStartDate].filter(Boolean).sort();
    const endDates = [endDate, promoEndDate].filter(Boolean).sort();
    const effectiveStartDate = startDates[startDates.length - 1];
    const effectiveEndDate = endDates[0];

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      effectiveStartDate > effectiveEndDate
    ) {
      setSalarySummaryData([]);
      return;
    }

    let active = true;
    getAdminSalarySummaryReportAction({
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    }).then((result) => {
      if (!active) return;
      setSalarySummaryData(result.success ? result.data || [] : []);
    });

    return () => {
      active = false;
    };
  }, [startDate, endDate, selectedPromotion, promotions]);

  // 🔍 กรองข้อมูลตาม Account, สาขา, พนักงาน, รอบโปรโมชั่น และวันที่
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

    // 🏷️ กรองตามรอบโปรโมชั่น
    if (selectedPromotion !== "ALL") {
      const promoObj = promotions.find(
        (p) => String(p.id) === String(selectedPromotion),
      );
      if (promoObj && promoObj.start_date && promoObj.end_date) {
        result = result.filter(
          (item) =>
            item.reportDate >= promoObj.start_date &&
            item.reportDate <= promoObj.end_date,
        );
      }
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
    selectedPromotion,
    startDate,
    endDate,
    reportData,
    promotions,
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

  // 📊 ประมวลผลข้อมูลสำหรับ กราฟที่ 1 (ยอดขายครบทุก 10 SKU) และ กราฟที่ 2 (Funnel)
  const chart1And2Data = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    if (selectedStore === "ALL") {
      const map = new Map<string, any>();
      filteredData.forEach((row) => {
        const acc = getAccountName(row.storeName, row.storeCode);
        const isBigC = acc === "Big C";

        if (!map.has(acc)) {
          const initObj: any = {
            displayName: acc,
            traffic: 0,
            approach: 0,
            closedSales: 0,
          };
          REPORT_PRODUCTS.forEach((p) => {
            initObj[`sales_${p.barcode}`] = 0;
          });
          map.set(acc, initObj);
        }

        const item = map.get(acc);
        item.traffic += Number(row.traffic || 0);
        item.approach += Number(row.approach || 0);
        item.closedSales += Number(row.closedSales || 0);

        REPORT_PRODUCTS.forEach((prod) => {
          const info = getProductInfo(row, prod.barcode, isBigC);
          if (typeof info.salesQty === "number" && !isNaN(info.salesQty)) {
            item[`sales_${prod.barcode}`] += info.salesQty;
          }
        });
      });
      return Array.from(map.values());
    } else {
      const map = new Map<string, any>();
      filteredData.forEach((row) => {
        const dateKey = row.reportDate || "ไม่ระบุวัน";
        const accountName = getAccountName(row.storeName, row.storeCode);
        const isBigC = accountName === "Big C";

        if (!map.has(dateKey)) {
          const initObj: any = {
            displayName: dateKey,
            traffic: 0,
            approach: 0,
            closedSales: 0,
          };
          REPORT_PRODUCTS.forEach((p) => {
            initObj[`sales_${p.barcode}`] = 0;
          });
          map.set(dateKey, initObj);
        }

        const item = map.get(dateKey);
        item.traffic += Number(row.traffic || 0);
        item.approach += Number(row.approach || 0);
        item.closedSales += Number(row.closedSales || 0);

        REPORT_PRODUCTS.forEach((prod) => {
          const info = getProductInfo(row, prod.barcode, isBigC);
          if (typeof info.salesQty === "number" && !isNaN(info.salesQty)) {
            item[`sales_${prod.barcode}`] += info.salesQty;
          }
        });
      });
      return Array.from(map.values()).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      );
    }
  }, [filteredData, selectedStore]);

  // 📊 ประมวลผลราคาของสินค้าและคู่แข่งแยกเป็นรายวันและราย SKU
  const chart3Data = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const dateMap = new Map<string, any>();
    filteredData.forEach((row) => {
      if (!row.reportDate) return;

      if (!dateMap.has(row.reportDate)) {
        const daily: any = { date: row.reportDate };
        PRICE_CHART_SERIES.forEach((series) => {
          daily[`${series.dataKey}_total`] = 0;
          daily[`${series.dataKey}_count`] = 0;
        });
        dateMap.set(row.reportDate, daily);
      }

      const daily = dateMap.get(row.reportDate);
      const accountName = getAccountName(row.storeName, row.storeCode);
      PRICE_CHART_SERIES.forEach((series) => {
        const price =
          series.type === "our"
            ? Number(
                getProductInfo(row, series.sourceKey, accountName === "Big C")
                  .priceOur,
              )
            : Number(getCompetitorVal(row, series.sourceKey));
        if (Number.isFinite(price) && price > 0) {
          daily[`${series.dataKey}_total`] += price;
          daily[`${series.dataKey}_count`] += 1;
        }
      });
    });

    return Array.from(dateMap.values())
      .map((daily) => {
        const result: any = { date: daily.date };
        PRICE_CHART_SERIES.forEach((series) => {
          const count = daily[`${series.dataKey}_count`];
          result[series.dataKey] =
            count > 0
              ? Number((daily[`${series.dataKey}_total`] / count).toFixed(2))
              : null;
        });
        return result;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const chart2Data = useMemo(() => {
    const totals = chart1And2Data.reduce(
      (sum, row) => ({
        traffic: sum.traffic + Number(row.traffic || 0),
        approach: sum.approach + Number(row.approach || 0),
        closedSales: sum.closedSales + Number(row.closedSales || 0),
      }),
      { traffic: 0, approach: 0, closedSales: 0 },
    );

    return [
      {
        name: "Traffic",
        value: totals.traffic,
        fill: "#64748b",
        depthFill: "#334155",
      },
      {
        name: "Approach",
        value: totals.approach,
        fill: "#2563eb",
        depthFill: "#1e40af",
      },
      {
        name: "Closed Sales",
        value: totals.closedSales,
        fill: "#059669",
        depthFill: "#047857",
      },
    ].filter((item) => item.value > 0);
  }, [chart1And2Data]);

  const chart4Data = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const dateMap = new Map<string, any>();

    filteredData.forEach((row) => {
      const dateKey = row.reportDate || "ไม่ระบุวัน";
      if (!dateMap.has(dateKey)) {
        const init: any = { date: dateKey };
        REPORT_PRODUCTS.forEach((prod) => {
          init[`sales_${prod.barcode}`] = 0;
        });
        dateMap.set(dateKey, init);
      }

      const current = dateMap.get(dateKey);
      const acc = getAccountName(row.storeName, row.storeCode);
      const isBigC = acc === "Big C";

      REPORT_PRODUCTS.forEach((prod) => {
        const info = getProductInfo(row, prod.barcode, isBigC);
        if (typeof info.salesQty === "number" && !isNaN(info.salesQty)) {
          current[`sales_${prod.barcode}`] += info.salesQty;
        }
      });
    });

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [filteredData]);

  const salesAlertSummary = useMemo(() => {
    const productTotals = new Map<
      string,
      { product: ReportProduct; total: number; observations: number }
    >(
      REPORT_PRODUCTS.map((product) => [
        product.barcode,
        { product, total: 0, observations: 0 },
      ]),
    );
    const storeTotals = new Map<string, { name: string; total: number }>();
    let lowStockCount = 0;
    const lowStockItems: Array<{
      product: ReportProduct;
      stockAfter: number;
      storeName: string;
      reportDate: string;
    }> = [];

    filteredData.forEach((row) => {
      const accountName = getAccountName(row.storeName, row.storeCode);
      const storeCode = String(
        row.storeCode || row.storeName || "ไม่ระบุสาข",
      ).trim();
      if (!storeTotals.has(storeCode)) {
        storeTotals.set(storeCode, {
          name: row.storeName || storeCode,
          total: 0,
        });
      }

      REPORT_PRODUCTS.forEach((product) => {
        const info = getProductInfo(
          row,
          product.barcode,
          accountName === "Big C",
        );
        const productTotal = productTotals.get(product.barcode)!;

        if (
          typeof info.salesQty === "number" &&
          Number.isFinite(info.salesQty)
        ) {
          productTotal.total += info.salesQty;
          productTotal.observations += 1;
          storeTotals.get(storeCode)!.total += info.salesQty;
        }

        if (
          typeof info.stockAfter === "number" &&
          Number.isFinite(info.stockAfter) &&
          info.stockAfter < 3
        ) {
          lowStockCount += 1;
          lowStockItems.push({
            product,
            stockAfter: info.stockAfter,
            storeName: row.storeName || storeCode,
            reportDate: row.reportDate || "ไม่ระบุวันที่",
          });
        }
      });
    });

    const rankedProducts = Array.from(productTotals.values())
      .filter((item) => item.observations > 0)
      .sort((a, b) => b.total - a.total);
    const rankedStores = Array.from(storeTotals.values()).sort(
      (a, b) => b.total - a.total,
    );

    return {
      lowStockCount,
      lowStockItems,
      highestProduct: rankedProducts[0] || null,
      lowestProduct: rankedProducts[rankedProducts.length - 1] || null,
      highestStore: rankedStores[0] || null,
      lowestStore: rankedStores[rankedStores.length - 1] || null,
    };
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

  const categorizePhotos = (activityPhotos: any[], row?: any) => {
    const normalizedPhotos = Array.isArray(activityPhotos)
      ? activityPhotos
      : [];
    const productRows = Array.isArray(row?.pg_daily_report_products)
      ? row.pg_daily_report_products
      : Array.isArray(row?.products)
        ? row.products
        : [];

    const productPhotoEntries: any[] = [];
    for (const product of productRows) {
      if (!product || typeof product !== "object") continue;
      const productLabel = product.descriptions || product.barcode || "สินค้า";
      [
        [product.img_product, "img_product", `รูปสินค้า: ${productLabel}`],
        [product.img_shelf, "img_shelf", `รูปเชลฟ์ชั้นวาง: ${productLabel}`],
        [
          product.img_stock_scanner,
          "img_stock_scanner",
          `รูปสแกนสต๊อก: ${productLabel}`,
        ],
      ].forEach(([url, type, label]) => {
        if (url && typeof url === "string" && url.trim()) {
          productPhotoEntries.push({ url, type, label });
        }
      });
    }

    const allPhotos = [...normalizedPhotos, ...productPhotoEntries];

    const staffHolding = allPhotos.filter(
      (p) =>
        p.type === "staff_holding" ||
        (p.label && p.label.includes("พนักงานถือสินค้า")),
    );
    const customerBasket = allPhotos.filter(
      (p) =>
        p.type?.startsWith("customer_basket") ||
        (p.label && (p.label.includes("ตะกร้า") || p.label.includes("ลูกค้า"))),
    );
    const atmosphere = allPhotos.filter(
      (p) =>
        p.type?.startsWith("atmosphere") ||
        (p.label && p.label.includes("บรรยากาศ")),
    );
    const product = allPhotos.filter(
      (p) =>
        p.type === "img_product" || (p.label && p.label.includes("รูปสินค้า")),
    );
    const shelf = allPhotos.filter(
      (p) =>
        p.type === "img_shelf" || (p.label && p.label.includes("รูปเชลฟ์")),
    );
    const stockScanner = allPhotos.filter(
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

  useEffect(() => {
    fetchProductsData();
  }, []);

  const renderPhotoCell = (photos: any[], defaultLabel: string) => {
    if (!photos || photos.length === 0) {
      return <span className="text-slate-300 font-mono text-[10px]">-</span>;
    }
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap justify-center max-w-[180px] mx-auto">
        {photos.map((photo: any, pIdx: number) => (
          <div
            key={pIdx}
            onClick={() =>
              handleViewImage(
                photo.url,
                photo.label || `${defaultLabel} ที่ ${pIdx + 1}`,
              )
            }
            className="photo-preview-shell relative group cursor-pointer rounded-xl p-1.5 transition duration-200"
            title={photo.label || "คลิกเพื่อดูรูปใหญ่"}
          >
            <img
              src={photo.url}
              alt={photo.label || defaultLabel}
              className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg border border-slate-200 group-hover:border-blue-500 group-hover:scale-105 transition-transform shadow-sm"
            />
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
              {pIdx + 1}
            </span>
          </div>
        ))}
      </div>
    );
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

  // 💰 ยอดขายรวมคำนวณจากทุก 10 SKU
  const totalRevenue = useMemo(() => {
    return filteredData.reduce((sum, row) => {
      const accountName = getAccountName(row.storeName, row.storeCode);
      const isBigC = accountName === "Big C";
      let rowRev = 0;
      REPORT_PRODUCTS.forEach((prod) => {
        const info = getProductInfo(row, prod.barcode, isBigC);
        if (
          typeof info.salesQty === "number" &&
          typeof info.priceOur === "number" &&
          !isNaN(info.salesQty) &&
          !isNaN(info.priceOur)
        ) {
          rowRev += info.salesQty * info.priceOur;
        }
      });
      return sum + rowRev;
    }, 0);
  }, [filteredData]);

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

    if (selectedAccount !== "ALL") {
      result = result.filter(
        (item) =>
          getAccountName(item.storeName, item.storeCode) === selectedAccount,
      );
    }

    return result;
  }, [salarySummaryData, selectedAccount, selectedUser, selectedStore]);

  const totalBaseWage = useMemo(() => {
    if (filteredSalarySummary.length > 0) {
      return filteredSalarySummary.reduce(
        (sum, item) => sum + Number(item.totalDailyWage || item.baseWage || 0),
        0,
      );
    }

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

  const totalCommission = useMemo(() => {
    if (filteredSalarySummary.length > 0) {
      return filteredSalarySummary.reduce(
        (sum, item) =>
          sum + Number(item.totalCommission || item.commission || 0),
        0,
      );
    }

    let totalComm = 0;
    filteredData.forEach((row) => {
      const rowTotalSales = getRowTotalSalesPcs(row);
      totalComm += calculateDailyCommission(rowTotalSales);
    });

    return totalComm;
  }, [filteredSalarySummary, filteredData]);

  const totalStaffExpense = totalBaseWage + totalCommission;
  const netProfit = totalRevenue - totalStaffExpense;
  const profitMarginPercent =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const summaryStats = [
    {
      label: "รายงานแสดง",
      value: `${filteredData.length.toLocaleString()} รายการ`,
      tone: "bg-blue-50 text-blue-700",
      icon: BarChart3,
    },
    {
      label: "ประสิทธิภาพปิดการขาย",
      value: `${avgClosingRate}%`,
      tone: "bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },
    {
      label: "คาดการณ์กำไรสุทธิ",
      value: `฿${netProfit.toLocaleString()}`,
      tone:
        netProfit >= 0
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700",
      icon: TrendingUp,
    },
    {
      label: "อัปเดตล่าสุด",
      value: currentTime || "กำลังโหลด...",
      tone: "bg-slate-100 text-slate-700",
      icon: Calendar,
    },
  ];

  const removePhoto = (type: keyof typeof photoFiles, index: number) => {
    setPhotoFiles((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

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
      promotionId: row.promotionId || "",
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
      compCellox: row.compCellox || 0,
      compKleenex: row.compKleenex || 0,
      compPaseo: row.compPaseo || 0,
      competitorPrices: row.competitorPrices || {},
      products:
        row.pg_daily_report_products ||
        row.products ||
        row.report_products ||
        [],
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
      promotionId: promotions[0]?.id || "",
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
      compCellox: 0,
      compKleenex: 0,
      compPaseo: 0,
      competitorPrices: {},
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
    try {
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
        promotionId: editForm.promotionId
          ? Number(editForm.promotionId)
          : undefined,
        trafficCount: Number(editForm.traffic || 0),
        approachCount: Number(editForm.approach || 0),
        closedSalesCount: Number(editForm.closedSales || 0),
        priceCompCellox: Number(editForm.compCellox || 0),
        priceCompKleenex: Number(editForm.compKleenex || 0),
        priceCompPaseo: Number(editForm.compPaseo || 0),
        competitorPrices: editForm.competitorPrices || {},
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
        products: Array.isArray(editForm.products) ? editForm.products : [],
      });

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
    } catch (error: any) {
      console.error("Admin report save error:", error);
      Swal.fire(
        "บันทึกไม่สำเร็จ",
        error.message || "กรุณาเข้าสู่ระบบใหม่ด้วยบัญชีผู้ดูแลระบบ",
        "error",
      );
    } finally {
      setSavingAdmin(false);
    }
  };

  const fetchImageAsBuffer = async (
    url: string,
  ): Promise<{ buffer: ArrayBuffer; extension: "jpeg" | "png" } | null> => {
    if (!url || !url.startsWith("http")) return null;

    try {
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const isPng = url.toLowerCase().includes(".png");
        return { buffer, extension: isPng ? "png" : "jpeg" };
      }
    } catch (e) {
      console.warn(
        "Direct fetch failed for CORS, trying canvas fallback:",
        url,
      );
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          async (blob) => {
            if (!blob) return resolve(null);
            const buffer = await blob.arrayBuffer();
            resolve({ buffer, extension: "jpeg" });
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const getPhotoUrlsArray = (item: any, category: string): string[] => {
    if (!item) return [];
    const urls: string[] = [];

    let activityPhotos: any[] = [];
    const rawActivityPhotos =
      item.activity_photos || item.activityPhotos || item.photos;

    if (rawActivityPhotos) {
      if (typeof rawActivityPhotos === "string") {
        try {
          const parsed = JSON.parse(rawActivityPhotos);
          activityPhotos =
            typeof parsed === "string" ? JSON.parse(parsed) : parsed;
        } catch (e) {
          activityPhotos = [];
        }
      } else if (Array.isArray(rawActivityPhotos)) {
        activityPhotos = rawActivityPhotos;
      }
    }

    const directPhotoMap = [
      ["photo_staff_holding", "staff_holding"],
      ["photo_cheer_sales", "cheer_sales"],
      ["photo_customer_basket_1", "customer_basket"],
      ["photo_customer_basket_2", "customer_basket"],
      ["photo_atmosphere_1", "atmosphere"],
      ["photo_atmosphere_2", "atmosphere"],
    ];

    for (const [fieldName, typeName] of directPhotoMap) {
      const photoUrl = item[fieldName];
      if (photoUrl && typeof photoUrl === "string" && photoUrl.trim()) {
        if (
          (category === "staff_holding" && typeName === "staff_holding") ||
          (category === "customer_basket" && typeName === "customer_basket") ||
          (category === "atmosphere" && typeName === "atmosphere")
        ) {
          urls.push(photoUrl);
        }
      }
    }

    if (Array.isArray(activityPhotos)) {
      activityPhotos.forEach((p: any) => {
        const type = (p.type || p.photoType || "").toLowerCase();
        const url = p.url || p.path || "";
        if (!url) return;

        if (category === "staff_holding" && type.includes("staff_holding"))
          urls.push(url);
        else if (
          category === "customer_basket" &&
          type.includes("customer_basket")
        )
          urls.push(url);
        else if (category === "atmosphere" && type.includes("atmosphere"))
          urls.push(url);
      });
    }

    const productsList =
      item.pg_daily_report_products ||
      item.products ||
      item.report_products ||
      item.items ||
      [];

    if (Array.isArray(productsList) && productsList.length > 0) {
      productsList.forEach((prod: any) => {
        if (category === "img_product" && prod.img_product)
          urls.push(prod.img_product);
        if (category === "img_shelf" && prod.img_shelf)
          urls.push(prod.img_shelf);
        if (
          category === "img_stock_scanner" &&
          (prod.img_stock_scanner || prod.img_scanner)
        ) {
          urls.push(prod.img_stock_scanner || prod.img_scanner);
        }
      });
    } else {
      if (category === "img_product" && item.img_product)
        urls.push(item.img_product);
      if (category === "img_shelf" && item.img_shelf) urls.push(item.img_shelf);
      if (
        category === "img_stock_scanner" &&
        (item.img_stock_scanner || item.img_scanner)
      ) {
        urls.push(item.img_stock_scanner || item.img_scanner);
      }
    }

    return Array.from(new Set(urls.filter(Boolean)));
  };

  const handleExportExcel = async () => {
    const dataToExport: any[] =
      filteredData && filteredData.length > 0 ? filteredData : reportData;

    if (!dataToExport || dataToExport.length === 0) {
      Swal.fire("เตือน", "ไม่มีข้อมูลสำหรับ Export", "warning");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("PG Full Report");

      const excelColumns: any[] = [
        { header: "NO.", key: "no", width: 6 },
        { header: "สาขา", key: "storeName", width: 25 },
        { header: "พนักงาน", key: "userName", width: 22 },
        { header: "วันที่", key: "reportDate", width: 14 },
        { header: "TARGET (แพ็ค)", key: "target", width: 14 },
        { header: "TRAFFIC", key: "traffic", width: 10 },
        { header: "APPROACH", key: "approach", width: 10 },
        { header: "CLOSED", key: "closedSales", width: 10 },
      ];

      REPORT_PRODUCTS.forEach((prod) => {
        excelColumns.push({
          header: `สต๊อกก่อน (${prod.shortLabel})`,
          key: `sb_${prod.barcode}`,
          width: 14,
        });
      });

      REPORT_PRODUCTS.forEach((prod) => {
        excelColumns.push({
          header: `ขาย (${prod.shortLabel})`,
          key: `sq_${prod.barcode}`,
          width: 12,
        });
      });

      REPORT_PRODUCTS.forEach((prod) => {
        excelColumns.push({
          header: `สต๊อกหลัง (${prod.shortLabel})`,
          key: `sa_${prod.barcode}`,
          width: 14,
        });
      });

      REPORT_PRODUCTS.forEach((prod) => {
        excelColumns.push({
          header: `ราคา (${prod.shortLabel})`,
          key: `pr_${prod.barcode}`,
          width: 12,
        });
      });

      COMPETITOR_ITEMS.forEach((comp) => {
        excelColumns.push({
          header: comp.label,
          key: `comp_${comp.key}`,
          width: 15,
        });
      });

      excelColumns.push(
        { header: "FEEDBACK หน้าร้าน", key: "feedback", width: 30 },
        { header: "โปรคู่แข่ง", key: "competitorPromo", width: 30 },
        { header: "หมายเหตุ", key: "remark", width: 25 },
        {
          header: "รูปพนักงานถือสินค้า",
          key: "photo_staff_holding",
          width: 45,
        },
        {
          header: "รูปถ่ายคู่กับลูกค้า/ตะกร้า",
          key: "photo_customer_basket",
          width: 45,
        },
        { header: "รูปบรรยากาศหน้าร้าน", key: "photo_atmosphere", width: 45 },
        { header: "รูปสินค้า", key: "photo_img_product", width: 45 },
        { header: "รูปเชลฟ์ชั้นวาง", key: "photo_img_shelf", width: 45 },
        { header: "รูปสแกนสต๊อก", key: "photo_img_stock_scanner", width: 45 },
      );

      worksheet.columns = excelColumns;

      const baseColCount = 8 + 10 + 10 + 10 + 10 + 15 + 3;
      const photoCategoryMap = [
        { key: "staff_holding", colIndex: baseColCount },
        { key: "customer_basket", colIndex: baseColCount + 1 },
        { key: "atmosphere", colIndex: baseColCount + 2 },
        { key: "img_product", colIndex: baseColCount + 3 },
        { key: "img_shelf", colIndex: baseColCount + 4 },
        { key: "img_stock_scanner", colIndex: baseColCount + 5 },
      ];

      for (let i = 0; i < dataToExport.length; i++) {
        const item = dataToExport[i];
        const excelRowIndex = i + 1;

        const accountName = getAccountName(item.storeName, item.storeCode);
        const isBigC = accountName === "Big C";

        const rowObj: any = {
          no: i + 1,
          storeName: item.storeName || item.store_code || "-",
          userName: item.userName || item.user_id || "-",
          reportDate: item.reportDate || item.report_date || "-",
          target: Number(item.targetPacks ?? item.target ?? 0),
          traffic: Number(item.traffic ?? item.traffic_count ?? 0),
          approach: Number(item.approach ?? item.approach_count ?? 0),
          closedSales: Number(item.closedSales ?? item.closed_sales_count ?? 0),
        };

        REPORT_PRODUCTS.forEach((prod) => {
          const info = getProductInfo(item, prod.barcode, isBigC);
          rowObj[`sb_${prod.barcode}`] = info.stockBefore;
          rowObj[`sq_${prod.barcode}`] = info.salesQty;
          rowObj[`sa_${prod.barcode}`] = info.stockAfter;
          rowObj[`pr_${prod.barcode}`] = info.priceOur;
        });

        COMPETITOR_ITEMS.forEach((comp) => {
          rowObj[`comp_${comp.key}`] = getCompetitorVal(item, comp.key);
        });

        rowObj.feedback = item.feedback || item.feedback_store || "-";
        rowObj.competitorPromo =
          item.competitorPromo || item.competitor_promotion || "-";
        rowObj.remark = item.remark || item.remark_store || "-";

        const row = worksheet.addRow(rowObj);
        row.height = 65;
        row.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };

        const IMG_WIDTH = 55;
        const IMG_HEIGHT = 55;
        const EMU_PER_PX = 9525;

        const photosByCategory = await Promise.all(
          photoCategoryMap.map(async (cat) => {
            const validUrls = getPhotoUrlsArray(item, cat.key).slice(0, 10);
            const images = await Promise.all(
              validUrls.map((url) => fetchImageAsBuffer(url)),
            );
            return { cat, validUrls, images };
          }),
        );

        for (const { cat, validUrls, images } of photosByCategory) {
          const totalImgs = validUrls.length;

          for (let imgIdx = 0; imgIdx < totalImgs; imgIdx++) {
            const imageData = images[imgIdx];
            if (imageData) {
              try {
                const imageId = workbook.addImage({
                  buffer: imageData.buffer,
                  extension: imageData.extension,
                });

                const pixelLeft =
                  totalImgs === 1 ? 40 : 10 + imgIdx * (IMG_WIDTH + 30);
                const pixelTop = 10;

                worksheet.addImage(imageId, {
                  tl: {
                    nativeCol: cat.colIndex,
                    nativeColOff: pixelLeft * EMU_PER_PX,
                    nativeRow: excelRowIndex,
                    nativeRowOff: pixelTop * EMU_PER_PX,
                  } as any,
                  ext: { width: IMG_WIDTH, height: IMG_HEIGHT },
                  editAs: "oneCell",
                });
              } catch (err) {
                console.error("Embed Image Error:", err);
              }
            }
          }
        }
      }

      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E40AF" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(
        blob,
        `PG_Report_Full_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (error) {
      console.error("Customer portal Excel export failed:", error);
      Swal.fire(
        "Export ไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    }
  };

  return (
    <div className="portal-shell min-h-screen text-slate-800 font-sans antialiased flex flex-col justify-between">
      <style jsx global>{`
        .portal-shell {
          background:
            radial-gradient(
              circle at top left,
              rgba(96, 165, 250, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at top right,
              rgba(14, 165, 233, 0.12),
              transparent 25%
            ),
            linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%);
        }

        .portal-topbar {
          background: linear-gradient(
            135deg,
            #0f172a 0%,
            #1d4ed8 45%,
            #0ea5e9 100%
          );
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
        }

        .portal-panel {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(8px);
        }

        .portal-card {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .portal-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
        }

        .portal-table-row {
          background: rgba(255, 255, 255, 0.92);
        }

        .portal-table-row:nth-child(even) {
          background: rgba(248, 250, 252, 0.9);
        }

        .portal-table-row:hover {
          background: linear-gradient(
            90deg,
            rgba(239, 246, 255, 0.95) 0%,
            rgba(255, 255, 255, 1) 100%
          );
        }

        .photo-preview-shell {
          background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          border: 1px solid rgba(148, 163, 184, 0.28);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
        }

        .photo-preview-shell:hover {
          border-color: rgba(37, 99, 235, 0.5);
          box-shadow: 0 8px 18px rgba(59, 130, 246, 0.12);
        }

        .portal-button-primary {
          background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.22);
        }

        .portal-button-primary:hover {
          filter: brightness(1.02);
        }

        .portal-button-soft {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .portal-table-wrap {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

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
        <nav className="portal-topbar sticky top-0 z-40 no-print">
          <div className="max-w-[98%] sm:max-w-[96%] mx-auto px-2 sm:px-4 min-h-[64px] py-2 flex items-center justify-between gap-2">
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
                <span className="text-xs sm:text-sm font-black text-white block leading-tight truncate">
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
                  onClick={handleExportExcel}
                  className="portal-button-primary flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl hover:brightness-105 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="portal-button-soft flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-slate-800 font-bold text-[11px] sm:text-xs rounded-xl transition cursor-pointer whitespace-nowrap"
                >
                  <Printer size={13} className="sm:w-3.5 sm:h-3.5" />
                  <span>
                    PDF<span className="hidden sm:inline"> / ปริ้นท์</span>
                  </span>
                </button>
                <button
                  onClick={loadPortalData}
                  className={`portal-button-soft p-1.5 sm:p-2 rounded-xl transition cursor-pointer ${
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
          <div className="portal-panel p-3 sm:p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 no-print text-left">
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

              {/* 🏷️ ตัวกรองรอบโปรโมชั่น */}
              <div className="flex items-center gap-1 text-xs">
                <Tag size={14} className="text-amber-500" />
                <span className="font-bold text-slate-500">รอบโปรโมชั่น:</span>
                <select
                  value={selectedPromotion}
                  onChange={(e) => setSelectedPromotion(e.target.value)}
                  className="px-2.5 py-1.5 border border-amber-300 rounded-xl font-bold bg-amber-50 focus:bg-white text-xs cursor-pointer text-slate-800 max-w-[180px] truncate"
                >
                  <option value="ALL">-- ทุกรอบโปรโมชั่น --</option>
                  {promotions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title || p.name || `รอบโปรโมชั่น #${p.id}`} (
                      {p.start_date} ~ {p.end_date})
                    </option>
                  ))}
                </select>
              </div>

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

          <div className="portal-panel p-3 sm:p-4 rounded-3xl no-print">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {summaryStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border border-slate-200 ${stat.tone} p-3 flex items-center gap-3`}
                  >
                    <div className="p-2 rounded-xl bg-white/80 shadow-xs">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-sm font-black leading-tight break-words">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 💵 FINANCIAL KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            <div className="portal-card p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  ยอดขายรวมทั้งหมด (10 SKU)
                </span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
              </div>
              <div>
                <span className="text-xl font-black text-blue-900 block tracking-tight">
                  ฿{totalRevenue.toLocaleString()}
                </span>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  คำนวณสะสมตามยอดขายจริงครบทุกรายการสินค้า
                </p>
              </div>
            </div>

            <div className="portal-card p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  รายจ่ายพนักงาน PG (ทำจ่ายทุก 3 วัน: ศุกร์-อาทิตย์)
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
                  <span className="text-purple-700">
                    คอมมิชชั่น: ฿{totalCommission.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`portal-card p-4 rounded-2xl flex flex-col justify-between ${
                netProfit >= 0
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-rose-200 bg-rose-50/50"
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
                  คำนวณจาก: ยอดขายรวม - (ค่าแรง + คอมมิชชั่น)
                </p>
              </div>
            </div>

            <div className="portal-card p-4 rounded-2xl flex flex-col justify-between">
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
                  เกณฑ์ คอมมิชชั่น: 30ชิ้น=100฿ | 40ชิ้น=200฿ | เกิน
                  40ชิ้น+100฿/10ชิ้น
                </p>
              </div>
            </div>
          </div>

          {/* 📈 OPERATIONAL KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            <div className="portal-card p-4 rounded-2xl flex items-center gap-3">
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

            <div className="portal-card p-4 rounded-2xl flex items-center gap-3">
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

            <div className="portal-card p-4 rounded-2xl flex items-center gap-3">
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

            <div className="portal-card p-4 rounded-2xl flex items-center gap-3">
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

          {/* 📣 STOCK AND SALES ALERTS */}
          <section className="text-left" aria-label="แจ้งเตือนและอันดับยอดขาย">
            <h2 className="mb-2 text-xs font-black text-slate-700">
              แจ้งเตือนและอันดับยอดขาย
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <div
                className="portal-card group relative z-0 p-4 rounded-2xl border-rose-200 bg-rose-50/50 hover:z-50 focus-within:z-50"
                tabIndex={0}
                aria-label="สินค้าเหลือน้อยกว่า 3 ชิ้น เลื่อนเมาส์หรือโฟกัสเพื่อดูรายการและสต๊อกจริง"
                title={salesAlertSummary.lowStockItems
                  .map(
                    (item) =>
                      `${item.product.shortLabel}: ${item.stockAfter} ชิ้น | ${item.storeName} | ${item.reportDate}`,
                  )
                  .join("\n")}
              >
                <p className="text-[10px] font-bold text-rose-700">
                  สินค้าเหลือน้อยกว่า 3 ชิ้น
                </p>
                <p className="mt-1 text-xl font-black text-rose-700">
                  {salesAlertSummary.lowStockCount.toLocaleString()} รายการ
                </p>
                <p className="text-[10px] font-bold text-slate-500">
                  นับรายการสินค้า-สาขาที่สต๊อกหลังขายต่ำกว่า 3
                </p>
                <div
                  id="low-stock-tooltip"
                  role="tooltip"
                  className="invisible absolute left-0 top-full z-[60] mt-2 max-h-64 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-rose-200 bg-white p-3 text-left opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                >
                  <p className="mb-2 border-b border-slate-100 pb-2 text-xs font-black text-slate-800">
                    รายการสินค้าและสต๊อกคงเหลือจริง
                  </p>
                  {salesAlertSummary.lowStockItems.length > 0 ? (
                    <div className="space-y-2">
                      {salesAlertSummary.lowStockItems.map((item, index) => (
                        <div
                          key={`${item.product.barcode}-${item.storeName}-${item.reportDate}-${index}`}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800">
                              {item.product.shortLabel}
                            </p>
                            <p className="break-words text-[10px] text-slate-500">
                              {item.storeName} | {item.reportDate}
                            </p>
                          </div>
                          <span className="shrink-0 font-black text-rose-700">
                            {item.stockAfter.toLocaleString()} ชิ้น
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      ไม่พบสินค้าเหลือน้อยกว่า 3 ชิ้น
                    </p>
                  )}
                </div>
              </div>

              <div className="portal-card p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500">
                  สินค้าขายสูงสุด
                </p>
                <p className="mt-1 text-sm font-black text-emerald-700 break-words">
                  {salesAlertSummary.highestProduct?.product.shortLabel ||
                    "ไม่มีข้อมูล"}
                </p>
                <p className="text-[10px] font-bold text-slate-500">
                  {salesAlertSummary.highestProduct
                    ? `${salesAlertSummary.highestProduct.total.toLocaleString()} ชิ้น`
                    : "-"}
                </p>
              </div>

              <div className="portal-card p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500">
                  สินค้าขายต่ำสุด
                </p>
                <p className="mt-1 text-sm font-black text-amber-700 break-words">
                  {salesAlertSummary.lowestProduct?.product.shortLabel ||
                    "ไม่มีข้อมูล"}
                </p>
                <p className="text-[10px] font-bold text-slate-500">
                  {salesAlertSummary.lowestProduct
                    ? `${salesAlertSummary.lowestProduct.total.toLocaleString()} ชิ้น`
                    : "-"}
                </p>
              </div>

              <div className="portal-card p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500">
                  สาขาขายสูงสุด
                </p>
                <p className="mt-1 text-sm font-black text-blue-700 break-words">
                  {salesAlertSummary.highestStore?.name || "ไม่มีข้อมูล"}
                </p>
                <p className="text-[10px] font-bold text-slate-500">
                  {salesAlertSummary.highestStore
                    ? `${salesAlertSummary.highestStore.total.toLocaleString()} ชิ้น`
                    : "-"}
                </p>
              </div>

              <div className="portal-card p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500">
                  สาขาขายต่ำสุด
                </p>
                <p className="mt-1 text-sm font-black text-orange-700 break-words">
                  {salesAlertSummary.lowestStore?.name || "ไม่มีข้อมูล"}
                </p>
                <p className="text-[10px] font-bold text-slate-500">
                  {salesAlertSummary.lowestStore
                    ? `${salesAlertSummary.lowestStore.total.toLocaleString()} ชิ้น`
                    : "-"}
                </p>
              </div>
            </div>
          </section>

          {/* 📊 CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* CHART 1: ยอดขายครบทั้ง 10 SKU */}
            <div className="portal-card p-4 sm:p-5 rounded-2xl text-left">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <BarChart3 size={16} className="text-blue-600" />
                  1. ยอดขายรวมแยกรายสินค้า (ครบทุก 10 SKU)
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
                      {REPORT_PRODUCTS.map((prod) => (
                        <linearGradient
                          key={`grad_${prod.barcode}`}
                          id={`c1-grad-${prod.barcode}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={prod.gradStart} />
                          <stop offset="100%" stopColor={prod.gradEnd} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="displayName"
                      tick={{ fontSize: 10, fontWeight: "bold" }}
                    />
                    <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                    <Tooltip content={<CustomSalesTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }}
                    />
                    {REPORT_PRODUCTS.map((prod) => (
                      <Bar
                        key={prod.barcode}
                        dataKey={`sales_${prod.barcode}`}
                        name={prod.shortLabel}
                        fill={`url(#c1-grad-${prod.barcode})`}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: Funnel */}
            <div className="portal-card p-4 sm:p-5 rounded-2xl text-left">
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
                  <PieChart>
                    <Tooltip content={<CustomFunnelTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                    />
                    <Pie
                      data={chart2Data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="52%"
                      innerRadius={43}
                      outerRadius={76}
                      paddingAngle={2}
                      legendType="none"
                      isAnimationActive={false}
                    >
                      {chart2Data.map((entry) => (
                        <Cell
                          key={`depth-${entry.name}`}
                          fill={entry.depthFill}
                          stroke={entry.depthFill}
                        />
                      ))}
                    </Pie>
                    <Pie
                      data={chart2Data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={43}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {chart2Data.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.fill}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 3: ราคาเปรียบเทียบทุก SKU เรา vs ทุกรายการคู่แข่ง */}
            <div className="portal-card p-4 sm:p-5 rounded-2xl text-left">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-sky-600" />
                  3. เปรียบเทียบราคาหน้าร้านทุก SKU vs คู่แข่ง (บาท)
                </h3>
                <span className="text-[9px] bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-md">
                  {chart3Data.length} วัน · {PRICE_CHART_SERIES.length} เส้น
                </span>
              </div>
              <div className="h-80 sm:h-96 w-full relative">
                {chart3Data.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                    ไม่มีข้อมูลราคาในวันที่ระบุ
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chart3Data}
                      margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fontWeight: "bold" }}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fontWeight: "bold" }}
                        tickFormatter={(value) => `${value} ฿`}
                      />
                      <Tooltip
                        formatter={(value, name) => [`${value} ฿`, name]}
                        labelFormatter={(label) => `วันที่ ${label}`}
                      />
                      <Legend
                        wrapperStyle={{
                          fontSize: "9px",
                          fontWeight: "bold",
                          lineHeight: "18px",
                        }}
                      />
                      {PRICE_CHART_SERIES.map((series) => (
                        <Line
                          key={series.dataKey}
                          type="monotone"
                          dataKey={series.dataKey}
                          name={series.name}
                          stroke={series.color}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* CHART 4: แนวโน้มยอดขาย SKU ตามวัน */}
            <div className="portal-card p-4 sm:p-5 rounded-2xl text-left">
              <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-amber-600" />
                  4. แนวโน้มยอดขาย SKU ตามวัน
                </h3>
                <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">
                  {chart4Data.length} วัน
                </span>
              </div>
              <div className="h-60 sm:h-64 w-full">
                {chart4Data.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                    ไม่มีข้อมูลแนวโน้มสินค้า
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chart4Data}
                      margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fontWeight: "bold" }}
                      />
                      <YAxis tick={{ fontSize: 9, fontWeight: "bold" }} />
                      <Tooltip />
                      <Legend
                        wrapperStyle={{ fontSize: "9px", fontWeight: "bold" }}
                      />
                      {REPORT_PRODUCTS.map((prod, index) => (
                        <Line
                          key={prod.barcode}
                          type="monotone"
                          dataKey={`sales_${prod.barcode}`}
                          name={prod.shortLabel}
                          stroke={prod.color}
                          strokeWidth={index === 0 ? 2.5 : 2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 📋 FULL CUSTOMER REPORT TABLE */}
          {filteredData.length === 0 && !loading ? (
            <div className="portal-panel rounded-3xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-500 mb-3">
                <Filter size={26} />
              </div>
              <h3 className="text-base font-black text-slate-800">
                ไม่พบข้อมูลรายงานตามเงื่อนไขที่เลือก
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                กรุณาเปลี่ยนเงื่อนไขตัวกรอง
                หรือกดรีเฟรชข้อมูลใหม่เพื่อโหลดรายงานอีกครั้ง
              </p>
            </div>
          ) : (
            <div className="portal-panel rounded-3xl overflow-hidden text-left">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-slate-800">
                    ตารางรายงานกิจกรรม PG ประจำสาขารายวัน (Full Report)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    รวมรายละเอียด Target, สต๊อกสินค้าครบ 10 รายการ,
                    ราคาเปรียบเทียบ 15 รายการ และรูปภาพกิจกรรม (แยก 1 รูปต่อ 1
                    คอลัมน์)
                  </p>
                </div>
              </div>

              <div className="portal-table-wrap relative overflow-auto max-h-[70vh] border-t border-slate-200">
                <table className="w-full text-[10px] border-collapse min-w-[3200px]">
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
                        className="p-2 border-r border-blue-400 text-center sticky left-[50px] z-40 bg-blue-200 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
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
                        className="p-2 border-r border-blue-400 text-center bg-blue-200 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                      >
                        พนักงาน
                      </th>
                      <th
                        rowSpan={2}
                        className="p-2 border-r border-blue-400 text-center bg-blue-200 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                      >
                        วันที่
                      </th>
                      <th
                        rowSpan={2}
                        className="p-2 border-r border-blue-400 text-center bg-green-200 min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
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
                        colSpan={10}
                        className="p-5 border-r border-slate-200 text-center bg-yellow-100/60"
                      >
                        STOCK ก่อนเริ่ม (P)
                      </th>
                      <th
                        colSpan={10}
                        className="p-2 border-r border-slate-200 text-center bg-emerald-100/60 text-emerald-900"
                      >
                        จำนวนขาย (แพ็ค)
                      </th>
                      <th
                        colSpan={10}
                        className="p-5 border-r border-slate-200 text-center bg-yellow-100/60"
                      >
                        STOCK หลังเลิก (P)
                      </th>

                      <th
                        colSpan={10}
                        className="p-2 border-r border-slate-200 text-center bg-indigo-50/70 text-indigo-900"
                      >
                        ราคาขายหน้าร้าน
                      </th>
                      <th
                        colSpan={15}
                        className="p-2 border-r border-slate-200 text-center bg-rose-50/70 text-rose-900"
                      >
                        ราคาคู่แข่ง
                      </th>

                      <th
                        rowSpan={2}
                        className="p-2 border-r border-slate-200 text-center min-w-[220px] max-w-[300px]"
                      >
                        FEEDBACK หน้าร้าน
                      </th>
                      <th
                        rowSpan={2}
                        className="p-2 border-r border-slate-200 text-center min-w-[200px] max-w-[280px]"
                      >
                        โปรคู่แข่ง
                      </th>

                      <th
                        rowSpan={2}
                        className="p-2 border-r border-slate-200 text-center min-w-[220px] max-w-[320px] bg-amber-100/80 text-amber-950 font-black"
                      >
                        หมายเหตุ
                      </th>

                      {/* --- บรรทัดบนของ Header รูปภาพ --- */}
                      <th
                        colSpan={TOTAL_PHOTO_COLS}
                        className="p-2 border-r border-slate-200 text-center bg-blue-100/80 text-blue-950 min-w-[1200px]"
                      >
                        📸 รูปภาพกิจกรรมหน้าร้าน & สต๊อกสินค้า (แยกรูปละ 1
                        คอลัมน์)
                      </th>
                    </tr>

                    <tr className="bg-slate-50 text-[9px] border-b border-slate-200 text-center">
                      <th className="p-1.5 border-r border-slate-200 bg-amber-50/40">
                        TRAFFIC
                      </th>
                      <th className="p-1.5 border-r border-slate-200 bg-amber-50/40">
                        APPROACH
                      </th>
                      <th className="p-1.5 border-r border-slate-200 bg-amber-50/40">
                        CLOSED
                      </th>

                      {/* Stock Before (10) */}
                      {REPORT_PRODUCTS.map((p) => (
                        <th
                          key={`sb_head_${p.barcode}`}
                          className={`p-5.0 border-r border-slate-200 ${p.bgClass}`}
                        >
                          {p.label}
                        </th>
                      ))}

                      {/* Sales Qty (10) */}
                      {REPORT_PRODUCTS.map((p) => (
                        <th
                          key={`sq_head_${p.barcode}`}
                          className={`p-5.0 border-r border-slate-200 ${p.bgClass}`}
                        >
                          {p.label}
                        </th>
                      ))}

                      {/* Stock After (10) */}
                      {REPORT_PRODUCTS.map((p) => (
                        <th
                          key={`sa_head_${p.barcode}`}
                          className={`p-5.0 border-r border-slate-200 ${p.bgClass}`}
                        >
                          {p.label}
                        </th>
                      ))}

                      {/* Our Prices (10) */}
                      {REPORT_PRODUCTS.map((p) => (
                        <th
                          key={`pr_head_${p.barcode}`}
                          className={`p-5.0 border-r border-slate-200 ${p.bgClass}`}
                        >
                          {p.label} (บ.)
                        </th>
                      ))}

                      {/* Competitor Prices (15) */}
                      {COMPETITOR_ITEMS.map((comp) => (
                        <th
                          key={`comp_head_${comp.key}`}
                          className={`p-5.0 border-r border-slate-200 min-w-[180px] max-w-[300px] ${comp.bgClass}`}
                        >
                          {comp.label}
                        </th>
                      ))}

                      {/* --- บรรทัดล่างของ Header (กระจายหัวคอลัมน์ย่อยของรูปภาพ) --- */}
                      {PHOTO_COLUMNS_CONFIG.map((cat) =>
                        Array.from({ length: cat.max }).map((_, i) => (
                          <th
                            key={`${cat.key}_head_${i}`}
                            className="p-2 border-r border-slate-200 bg-blue-50/60 min-w-[85px] max-w-[100px] text-center text-[9px]"
                          >
                            {cat.label} {cat.max > 1 ? `#${i + 1}` : ""}
                          </th>
                        )),
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                    {filteredData.map((row, idx) => {
                      const photos = categorizePhotos(row.activityPhotos, row);
                      const accountName = getAccountName(
                        row.storeName,
                        row.storeCode,
                      );
                      const isBigC = accountName === "Big C";
                      const safeStoreName =
                        row.storeName || row.storeCode || "ไม่ระบุสาขา";
                      const safeUserName =
                        row.userName || row.userId || "ไม่ระบุพนักงาน";
                      const safeReportDate =
                        row.reportDate || row.report_date || "ไม่ระบุวันที่";

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
                          className="portal-table-row transition text-center"
                        >
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-400 sticky left-0 z-20 bg-white min-w-[50px] w-[50px]">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-black text-slate-800 text-left sticky left-[50px] z-20 bg-white min-w-[160px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            {safeStoreName}
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
                            {safeUserName}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono">
                            {safeReportDate}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-extrabold text-slate-700 bg-emerald-50/30">
                            {row.targetPacks ?? "-"}
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

                          {/* Stock Before (10 Columns) */}
                          {REPORT_PRODUCTS.map((prod) => {
                            const info = getProductInfo(
                              row,
                              prod.barcode,
                              isBigC,
                            );
                            return (
                              <td
                                key={`sb_${prod.barcode}`}
                                className="p-2 border-r border-slate-200 font-mono bg-slate-50/50"
                              >
                                {info.stockBefore}
                              </td>
                            );
                          })}

                          {/* Sales Qty (10 Columns) */}
                          {REPORT_PRODUCTS.map((prod) => {
                            const info = getProductInfo(
                              row,
                              prod.barcode,
                              isBigC,
                            );
                            return (
                              <td
                                key={`sq_${prod.barcode}`}
                                className="p-2 border-r border-slate-200 font-mono font-black text-emerald-700 bg-emerald-100/60"
                              >
                                {info.salesQty !== "-" &&
                                Number(info.salesQty) > 0
                                  ? `+${info.salesQty}`
                                  : info.salesQty}
                              </td>
                            );
                          })}

                          {/* Stock After (10 Columns) */}
                          {REPORT_PRODUCTS.map((prod) => {
                            const info = getProductInfo(
                              row,
                              prod.barcode,
                              isBigC,
                            );
                            return (
                              <td
                                key={`sa_${prod.barcode}`}
                                className="p-2 border-r border-slate-200 bg-amber-50/40"
                              >
                                {renderStockCell(info.stockAfter)}
                              </td>
                            );
                          })}

                          {/* Prices Our (10 Columns) */}
                          {REPORT_PRODUCTS.map((prod) => {
                            const info = getProductInfo(
                              row,
                              prod.barcode,
                              isBigC,
                            );
                            return (
                              <td
                                key={`pr_${prod.barcode}`}
                                className="p-2 border-r border-slate-200 font-mono font-black text-indigo-700 bg-indigo-50/60"
                              >
                                {info.priceOur !== "-"
                                  ? `${info.priceOur}฿`
                                  : "-"}
                              </td>
                            );
                          })}

                          {/* Competitor Prices (15 Columns) */}
                          {COMPETITOR_ITEMS.map((comp) => {
                            const val = getCompetitorVal(row, comp.key);
                            return (
                              <td
                                key={`comp_${comp.key}`}
                                className="p-2 border-r border-slate-200 font-mono text-rose-700 font-black bg-rose-50/50"
                              >
                                {val !== "-" ? `${val}฿` : "-"}
                              </td>
                            );
                          })}

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

                          {/* Remark */}
                          <td
                            className="p-2 border-r border-slate-200 text-left text-amber-900 bg-amber-50/30 min-w-[220px] max-w-[320px] whitespace-normal break-words leading-tight font-medium"
                            title={remarkDisplay}
                          >
                            {remarkDisplay || "-"}
                          </td>

                          {/* 📸 Photo Columns (Splitting photos across dedicated columns) */}
                          {PHOTO_COLUMNS_CONFIG.map((cat) => {
                            const categoryPhotos =
                              photos[cat.key as keyof typeof photos] || [];
                            return Array.from({ length: cat.max }).map(
                              (_, i) => {
                                const photo = categoryPhotos[i];
                                return (
                                  <td
                                    key={`${cat.key}_col_${i}`}
                                    className="p-1.5 border-r border-slate-200 text-center min-w-[90px] max-w-[120px] bg-blue-50/20 align-middle"
                                  >
                                    {photo ? (
                                      renderPhotoCell(
                                        [photo],
                                        `${cat.label} ${i + 1}`,
                                      )
                                    ) : (
                                      <span className="text-slate-300 font-mono text-[10px]">
                                        -
                                      </span>
                                    )}
                                  </td>
                                );
                              },
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 🛠️ MODAL สำหรับ ADMIN บันทึก/แก้ไข รายงานย้อนหลัง + แนบรูปภาพ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-8">
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
              className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs"
            >
              {/* 1. ข้อมูลทั่วไป & เลือกรอบโปรโมชั่น */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    วันที่รายงาน:
                  </label>
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
                  <label className="block font-bold mb-1 text-slate-700">
                    พนักงาน (PG):
                  </label>
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
                  <label className="block font-bold mb-1 text-slate-700">
                    สาขา:
                  </label>
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
                <div>
                  <label className="block font-bold mb-1 text-amber-900">
                    รอบโปรโมชั่น:
                  </label>
                  <select
                    value={editForm.promotionId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, promotionId: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg font-bold bg-amber-50 text-slate-800"
                  >
                    <option value="">-- ไม่ระบุ / ตามวัน --</option>
                    {promotions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || p.name || `รอบ #${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. สถิติ Funnel */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-900 block mb-2">
                  📊 สถิติลูกค้า (Funnel)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Traffic (เดินผ่าน)
                    </label>
                    <input
                      type="number"
                      value={editForm.traffic}
                      onChange={(e) =>
                        setEditForm({ ...editForm, traffic: e.target.value })
                      }
                      className="w-full border p-2 rounded-lg font-mono bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Approach (ทักทาย)
                    </label>
                    <input
                      type="number"
                      value={editForm.approach}
                      onChange={(e) =>
                        setEditForm({ ...editForm, approach: e.target.value })
                      }
                      className="w-full border p-2 rounded-lg font-mono bg-white font-bold text-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">
                      Closed Sales (ปิดการขาย)
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
                      className="w-full border p-2 rounded-lg font-mono bg-white font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* 3. ยอดขาย สต๊อก และราคาขายสินค้าเรา (ครบทั้ง 10 SKU) */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 block">
                    📦 ยอดขาย สต๊อก และราคาขายสินค้าเรา (ครบทั้ง 10 รายการ)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    10 SKU
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {REPORT_PRODUCTS.map((prod) => {
                    // Helper ดึงค่า
                    const getProdVal = (
                      field:
                        | "stockBefore"
                        | "salesQty"
                        | "stockAfter"
                        | "priceOur",
                    ) => {
                      if (Array.isArray(editForm.products)) {
                        const found = editForm.products.find(
                          (p: any) => p.barcode === prod.barcode,
                        );
                        if (found && found[field] !== undefined)
                          return found[field];
                      }
                      if (prod.barcode === "8858678423339") {
                        if (field === "stockBefore")
                          return editForm.stockBeforeGreen ?? "";
                        if (field === "salesQty")
                          return editForm.salesGreen ?? "";
                        if (field === "stockAfter")
                          return editForm.stockAfterGreen ?? "";
                        if (field === "priceOur")
                          return editForm.priceGreen ?? 150;
                      }
                      if (prod.barcode === "8858678423681") {
                        if (field === "stockBefore")
                          return editForm.stockBeforeBlue ?? "";
                        if (field === "salesQty")
                          return editForm.salesBlue ?? "";
                        if (field === "stockAfter")
                          return editForm.stockAfterBlue ?? "";
                        if (field === "priceOur")
                          return editForm.priceBlue ?? 142;
                      }
                      if (prod.barcode === "8858678422875") {
                        if (field === "stockBefore")
                          return editForm.stockBeforeOrange ?? "";
                        if (field === "salesQty")
                          return editForm.salesOrange ?? "";
                        if (field === "stockAfter")
                          return editForm.stockAfterOrange ?? "";
                        if (field === "priceOur")
                          return editForm.priceOrange ?? 100;
                      }
                      return editForm[`${field}_${prod.barcode}`] ?? "";
                    };

                    // Helper บันทึกค่า
                    const setProdVal = (field: string, val: any) => {
                      let updated = { ...editForm };
                      if (prod.barcode === "8858678423339") {
                        if (field === "stockBefore")
                          updated.stockBeforeGreen = val;
                        if (field === "salesQty") updated.salesGreen = val;
                        if (field === "stockAfter")
                          updated.stockAfterGreen = val;
                        if (field === "priceOur") updated.priceGreen = val;
                      } else if (prod.barcode === "8858678423681") {
                        if (field === "stockBefore")
                          updated.stockBeforeBlue = val;
                        if (field === "salesQty") updated.salesBlue = val;
                        if (field === "stockAfter")
                          updated.stockAfterBlue = val;
                        if (field === "priceOur") updated.priceBlue = val;
                      } else if (prod.barcode === "8858678422875") {
                        if (field === "stockBefore")
                          updated.stockBeforeOrange = val;
                        if (field === "salesQty") updated.salesOrange = val;
                        if (field === "stockAfter")
                          updated.stockAfterOrange = val;
                        if (field === "priceOur") updated.priceOrange = val;
                      }

                      updated[`${field}_${prod.barcode}`] = val;

                      let prods = Array.isArray(updated.products)
                        ? [...updated.products]
                        : [];
                      const idx = prods.findIndex(
                        (p: any) => p.barcode === prod.barcode,
                      );
                      if (idx >= 0) {
                        prods[idx] = { ...prods[idx], [field]: val };
                      } else {
                        prods.push({ barcode: prod.barcode, [field]: val });
                      }
                      updated.products = prods;

                      setEditForm(updated);
                    };

                    return (
                      <div
                        key={prod.barcode}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 hover:border-emerald-300 transition"
                      >
                        <div className="sm:col-span-4">
                          <span className="font-bold text-slate-800 block text-[11px] leading-tight">
                            {prod.label}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {prod.barcode}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] text-slate-500 block font-bold">
                            Stock เริ่ม
                          </label>
                          <input
                            type="number"
                            value={getProdVal("stockBefore")}
                            onChange={(e) =>
                              setProdVal("stockBefore", e.target.value)
                            }
                            className="w-full border p-1 rounded font-mono text-xs"
                            placeholder="0"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] text-slate-500 block font-bold">
                            ยอดขาย (แพ็ค)
                          </label>
                          <input
                            type="number"
                            value={getProdVal("salesQty")}
                            onChange={(e) =>
                              setProdVal("salesQty", e.target.value)
                            }
                            className="w-full border p-1 rounded font-mono text-xs text-emerald-600 font-bold bg-emerald-50/30"
                            placeholder="0"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] text-slate-500 block font-bold">
                            Stock หลังเลิก
                          </label>
                          <input
                            type="number"
                            value={getProdVal("stockAfter")}
                            onChange={(e) =>
                              setProdVal("stockAfter", e.target.value)
                            }
                            className="w-full border p-1 rounded font-mono text-xs"
                            placeholder="0"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[9px] text-slate-500 block font-bold">
                            ราคาขาย (บาท)
                          </label>
                          <input
                            type="number"
                            value={getProdVal("priceOur")}
                            onChange={(e) =>
                              setProdVal("priceOur", e.target.value)
                            }
                            className="w-full border p-1 rounded font-mono text-xs font-bold text-slate-700"
                            placeholder="บาท"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. ราคาขายสินค้าคู่แข่ง (ครบทั้ง 15 รายการ) */}
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 block">
                    🏷️ ราคาขายสินค้าคู่แข่งหน้าร้าน (ครบทั้ง 15 รายการ)
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                    15 Items
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                  {COMPETITOR_ITEMS.map((comp) => {
                    const getCompVal = () => {
                      if (
                        editForm.competitorPrices &&
                        editForm.competitorPrices[comp.key] !== undefined
                      ) {
                        return editForm.competitorPrices[comp.key];
                      }
                      if (comp.key === "cellox_satin_4" && editForm.compCellox)
                        return editForm.compCellox;
                      if (
                        comp.key === "kleenex_silky_4" &&
                        editForm.compKleenex
                      )
                        return editForm.compKleenex;
                      if (comp.key === "scott_safesoft_4" && editForm.compPaseo)
                        return editForm.compPaseo;
                      return editForm[comp.key] ?? "";
                    };

                    const setCompVal = (val: any) => {
                      let updated = { ...editForm };
                      let compPrices = { ...(updated.competitorPrices || {}) };
                      compPrices[comp.key] = val;
                      updated.competitorPrices = compPrices;

                      if (comp.key === "cellox_satin_4")
                        updated.compCellox = val;
                      if (comp.key === "kleenex_silky_4")
                        updated.compKleenex = val;
                      if (comp.key === "scott_safesoft_4")
                        updated.compPaseo = val;

                      setEditForm(updated);
                    };

                    return (
                      <div
                        key={comp.key}
                        className="bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <label
                          className="block text-[9px] font-bold text-slate-700 truncate mb-1"
                          title={comp.label}
                        >
                          {comp.label}
                        </label>
                        <input
                          type="number"
                          value={getCompVal()}
                          onChange={(e) => setCompVal(e.target.value)}
                          className="w-full border p-1 rounded font-mono text-xs text-rose-600 font-bold"
                          placeholder="บาท"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. 📸 ส่วนอัปโหลดรูปภาพกิจกรรมหน้าร้าน */}
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

              {/* 6. ข้อความเพิ่มเติม / Feedback / หมายเหตุ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    Feedback หน้าร้าน:
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.feedback}
                    onChange={(e) =>
                      setEditForm({ ...editForm, feedback: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg bg-white"
                    placeholder="เสียงตอบรับจากลูกค้าหรือหน้าร้าน..."
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
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
                    placeholder="รายละเอียดโปรโมชันคู่แข่ง..."
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    หมายเหตุ:
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.remark}
                    onChange={(e) =>
                      setEditForm({ ...editForm, remark: e.target.value })
                    }
                    className="w-full border p-2 rounded-lg bg-amber-50/50 font-medium"
                    placeholder="หมายเหตุเพิ่มเติม..."
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
