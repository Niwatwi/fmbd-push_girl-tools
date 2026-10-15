"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Download,
  PackageSearch,
  Printer,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import ReportChartBuilder, {
  type ReportChartDimension,
  type ReportChartMetric,
} from "@/app/components/ReportChartBuilder";
import {
  getAdminSalarySummaryReportAction,
  getAdminUserSkuSalesReportAction,
} from "@/app/dashboard/actions";

function getLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = getLocalDateInputValue(new Date());
const monthStart = `${today.slice(0, 8)}01`;
const getProductKey = (product: any) =>
  product.key || product.skuCode || product.barcode;

const USER_SKU_CHART_DIMENSIONS: ReportChartDimension[] = [
  { key: "user", label: "พนักงาน" },
  { key: "empId", label: "รหัสพนักงาน" },
  { key: "store", label: "สาขา" },
  { key: "skuCode", label: "SKU บริษัท" },
];

const USER_SKU_CHART_METRICS: ReportChartMetric[] = [
  { key: "salesQty", label: "จำนวนขาย", aggregation: "sum" },
  { key: "salesAmount", label: "มูลค่าขาย (บาท)", aggregation: "sum" },
  { key: "unitPrice", label: "ราคาขายเฉลี่ย (บาท)", aggregation: "average" },
];

export default function AdminUserSkuSalesPage() {
  const [data, setData] = useState<any[]>([]);
  const [salaryData, setSalaryData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expenseWarning, setExpenseWarning] = useState("");
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      const [result, salaryResult] = await Promise.all([
        getAdminUserSkuSalesReportAction(params),
        getAdminSalarySummaryReportAction(params),
      ]);
      if (!result.success) {
        throw new Error(result.message || "ไม่สามารถโหลดสรุปยอดขายราย SKU ได้");
      }
      setData(result.data || []);
      setProducts(result.products || []);
      setSalaryData(salaryResult.success ? salaryResult.data || [] : []);
      setExpenseWarning(
        salaryResult.success
          ? ""
          : salaryResult.message || "โหลดข้อมูลค่าแรงและคอมมิชชั่นไม่สำเร็จ",
      );
    } catch (error) {
      Swal.fire(
        "โหลดข้อมูลไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();
    if (!keyword) return data;
    return data.filter((item) =>
      [item.displayName, item.empId, item.storeName, item.userId].some(
        (value) =>
          String(value || "")
            .toLocaleLowerCase()
            .includes(keyword),
      ),
    );
  }, [data, search]);

  const totalSalesQty = filteredData.reduce(
    (sum, item) => sum + Number(item.totalSalesQty || 0),
    0,
  );
  const totalSalesAmount = filteredData.reduce(
    (sum, item) => sum + Number(item.totalSalesAmount || 0),
    0,
  );

  const salaryByUser = useMemo(
    () =>
      new Map(
        salaryData.map((item) => [String(item.userId ?? item.userEmpId), item]),
      ),
    [salaryData],
  );

  const userSummaries = useMemo(
    () =>
      filteredData.map((item) => {
        const expense = salaryByUser.get(String(item.userId));
        const baseWage = Number(expense?.totalDailyWage || 0);
        const commission = Number(expense?.totalCommission || 0);
        const totalExpense = baseWage + commission;
        const revenue = Number(item.totalSalesAmount || 0);
        const hasExpense = Boolean(expense);
        const netProfit = hasExpense ? revenue - totalExpense : null;

        return {
          ...item,
          expenseAvailable: hasExpense,
          baseWage,
          commission,
          totalExpense,
          netProfit,
          expensePercent:
            hasExpense && revenue > 0 ? (totalExpense / revenue) * 100 : null,
          profitMargin:
            hasExpense && revenue > 0 && netProfit !== null
              ? (netProfit / revenue) * 100
              : null,
          productLines: products
            .map((product) => {
              const sales = item.salesBySku?.[getProductKey(product)];
              return {
                product,
                quantity: Number(sales?.quantity || 0),
                amount: Number(sales?.amount || 0),
              };
            })
            .filter((line) => line.quantity !== 0 || line.amount !== 0),
        };
      }),
    [filteredData, products, salaryByUser],
  );

  const totalBaseWage = userSummaries.reduce(
    (sum, item) => sum + (item.expenseAvailable ? item.baseWage : 0),
    0,
  );
  const totalCommission = userSummaries.reduce(
    (sum, item) => sum + (item.expenseAvailable ? item.commission : 0),
    0,
  );
  const totalExpense = totalBaseWage + totalCommission;
  const usersMissingExpense = userSummaries.filter(
    (item) => !item.expenseAvailable,
  ).length;
  const totalProfit =
    usersMissingExpense === 0 ? totalSalesAmount - totalExpense : null;
  const totalExpensePercent =
    totalSalesAmount > 0 ? (totalExpense / totalSalesAmount) * 100 : null;
  const totalProfitMargin =
    totalProfit !== null && totalSalesAmount > 0
      ? (totalProfit / totalSalesAmount) * 100
      : null;

  const userSkuChartRows = useMemo(
    () =>
      filteredData.flatMap((item) =>
        products.map((product) => {
          const sales = item.salesBySku?.[getProductKey(product)];
          const salesQty = Number(sales?.quantity || 0);
          const salesAmount = Number(sales?.amount || 0);
          return {
            user: item.displayName || item.empId || "ไม่ระบุพนักงาน",
            empId: item.empId || "ไม่ระบุรหัส",
            store: item.storeName || "ไม่ระบุสาขา",
            skuCode: getProductKey(product),
            salesQty,
            salesAmount,
            unitPrice: salesQty > 0 ? salesAmount / salesQty : null,
          };
        }),
      ),
    [filteredData, products],
  );

  const exportToExcel = async () => {
    if (userSummaries.length === 0) {
      Swal.fire("ไม่มีข้อมูล", "ไม่พบยอดขายสำหรับส่งออก", "warning");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Riverpro Intertrade";
      workbook.created = new Date();

      const pivot = workbook.addWorksheet("Pivot User-SKU");
      const pivotColumnDefinitions: any[] = [
        { header: "ประเภทแถว", key: "rowType", width: 16 },
        { header: "รหัสพนักงาน", key: "empId", width: 18 },
        { header: "ชื่อพนักงาน", key: "displayName", width: 28 },
        { header: "สาขา", key: "storeName", width: 28 },
        { header: "สินค้า", key: "productName", width: 38 },
        { header: "SKU บริษัท", key: "skuCode", width: 20 },
        { header: "Barcode", key: "barcode", width: 18 },
        { header: "จำนวนขาย", key: "quantity", width: 14 },
        { header: "ยอดขาย (บาท)", key: "salesAmount", width: 18 },
        { header: "ค่าแรง (บาท)", key: "baseWage", width: 16 },
        { header: "คอมมิชชั่น (บาท)", key: "commission", width: 18 },
        { header: "ค่าใช้จ่ายรวม (บาท)", key: "totalExpense", width: 20 },
        { header: "รายจ่าย/ยอดขาย (%)", key: "expensePercent", width: 20 },
        { header: "กำไร/ขาดทุน (บาท)", key: "netProfit", width: 21 },
        { header: "กำไร/ขาดทุน (%)", key: "profitMargin", width: 20 },
        { header: "สถานะค่าใช้จ่าย", key: "expenseStatus", width: 32 },
      ];
      pivot.columns = pivotColumnDefinitions.map(({ key, width }) => ({
        key,
        width,
      }));
      pivot.addRow({
        rowType: `ช่วงวันที่ ${startDate} ถึง ${endDate}`,
      });
      pivot.mergeCells(1, 1, 1, pivot.columnCount);
      pivot.getRow(1).font = { bold: true, size: 12 };
      pivot.addRow(pivotColumnDefinitions.map((column) => column.header));

      userSummaries.forEach((item) => {
        const identity = {
          empId: item.empId || "-",
          displayName: item.displayName || "-",
          storeName: item.storeName || "-",
        };
        pivot.addRow({ rowType: "พนักงาน", ...identity });
        item.productLines.forEach(({ product, quantity, amount }: any) => {
          pivot.addRow({
            rowType: "รายสินค้า",
            ...identity,
            productName: product.name,
            skuCode: getProductKey(product),
            barcode: product.barcode,
            quantity,
            salesAmount: amount,
          });
        });
        pivot.addRow({
          rowType: "รวมพนักงาน",
          ...identity,
          productName: "รวมยอดขายและค่าใช้จ่าย",
          quantity: item.totalSalesQty || 0,
          salesAmount: item.totalSalesAmount || 0,
          baseWage: item.expenseAvailable ? item.baseWage : null,
          commission: item.expenseAvailable ? item.commission : null,
          totalExpense: item.expenseAvailable ? item.totalExpense : null,
          expensePercent: item.expensePercent,
          netProfit: item.netProfit,
          profitMargin: item.profitMargin,
          expenseStatus: item.expenseAvailable
            ? "ครบ"
            : "ไม่พบข้อมูลลงเวลาในช่วงนี้",
        });
      });

      pivot.addRow({
        rowType: "รวมทั้งหมด",
        productName: "Grand Total",
        quantity: totalSalesQty,
        salesAmount: totalSalesAmount,
        baseWage: usersMissingExpense === 0 ? totalBaseWage : null,
        commission: usersMissingExpense === 0 ? totalCommission : null,
        totalExpense: usersMissingExpense === 0 ? totalExpense : null,
        expensePercent: usersMissingExpense === 0 ? totalExpensePercent : null,
        netProfit: totalProfit,
        profitMargin: totalProfitMargin,
        expenseStatus:
          usersMissingExpense === 0
            ? "ครบทุก User"
            : `ค่าใช้จ่ายขาด ${usersMissingExpense} User`,
      });

      const userSummary = workbook.addWorksheet("สรุปค่าใช้จ่าย User");
      userSummary.columns = [
        { header: "รหัสพนักงาน", key: "empId", width: 18 },
        { header: "ชื่อพนักงาน", key: "displayName", width: 28 },
        { header: "สาขา", key: "storeName", width: 28 },
        { header: "จำนวนขาย", key: "quantity", width: 14 },
        { header: "ยอดขาย (บาท)", key: "salesAmount", width: 18 },
        { header: "ค่าแรง (บาท)", key: "baseWage", width: 16 },
        { header: "คอมมิชชั่น (บาท)", key: "commission", width: 18 },
        { header: "ค่าใช้จ่ายรวม (บาท)", key: "totalExpense", width: 20 },
        { header: "รายจ่าย/ยอดขาย (%)", key: "expensePercent", width: 20 },
        { header: "กำไร/ขาดทุน (บาท)", key: "netProfit", width: 21 },
        { header: "กำไร/ขาดทุน (%)", key: "profitMargin", width: 20 },
        { header: "สถานะค่าใช้จ่าย", key: "expenseStatus", width: 32 },
      ];
      userSummaries.forEach((item) => {
        userSummary.addRow({
          empId: item.empId || "-",
          displayName: item.displayName || "-",
          storeName: item.storeName || "-",
          quantity: item.totalSalesQty || 0,
          salesAmount: item.totalSalesAmount || 0,
          baseWage: item.expenseAvailable ? item.baseWage : null,
          commission: item.expenseAvailable ? item.commission : null,
          totalExpense: item.expenseAvailable ? item.totalExpense : null,
          expensePercent: item.expensePercent,
          netProfit: item.netProfit,
          profitMargin: item.profitMargin,
          expenseStatus: item.expenseAvailable
            ? "ครบ"
            : "ไม่พบข้อมูลลงเวลาในช่วงนี้",
        });
      });
      userSummary.addRow({
        displayName: "รวมทั้งหมด",
        quantity: totalSalesQty,
        salesAmount: totalSalesAmount,
        baseWage: usersMissingExpense === 0 ? totalBaseWage : null,
        commission: usersMissingExpense === 0 ? totalCommission : null,
        totalExpense: usersMissingExpense === 0 ? totalExpense : null,
        expensePercent: usersMissingExpense === 0 ? totalExpensePercent : null,
        netProfit: totalProfit,
        profitMargin: totalProfitMargin,
        expenseStatus:
          usersMissingExpense === 0
            ? "ครบทุก User"
            : `ค่าใช้จ่ายขาด ${usersMissingExpense} User`,
      });

      const detail = workbook.addWorksheet("รายละเอียด User-SKU");
      detail.columns = [
        { header: "รหัสพนักงาน", key: "empId", width: 18 },
        { header: "ชื่อพนักงาน", key: "displayName", width: 28 },
        { header: "สาขา", key: "storeName", width: 28 },
        { header: "SKU บริษัท", key: "skuCode", width: 20 },
        { header: "Barcode", key: "barcode", width: 18 },
        { header: "สินค้า", key: "productName", width: 38 },
        { header: "จำนวนขาย", key: "quantity", width: 14 },
        { header: "ยอดขาย (บาท)", key: "salesAmount", width: 18 },
      ];
      userSummaries.forEach((item) => {
        item.productLines.forEach(({ product, quantity, amount }: any) => {
          detail.addRow({
            empId: item.empId || "-",
            displayName: item.displayName || "-",
            storeName: item.storeName || "-",
            skuCode: getProductKey(product),
            barcode: product.barcode,
            productName: product.name,
            quantity,
            salesAmount: amount,
          });
        });
      });

      [pivot, userSummary, detail].forEach((sheet) => {
        const headerRow = sheet === pivot ? 2 : 1;
        sheet.views = [{ state: "frozen", ySplit: headerRow }];
        const header = sheet.getRow(headerRow);
        header.font = { bold: true, color: { argb: "FFFFFFFF" } };
        header.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF155E75" },
        };
        header.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
        header.height = 32;
        sheet.autoFilter = {
          from: { row: headerRow, column: 1 },
          to: { row: sheet.rowCount, column: sheet.columnCount },
        };
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRow) return;
          row.alignment = { vertical: "middle", wrapText: rowNumber < 3 };
          if (
            row.getCell(1).value === "รวมพนักงาน" ||
            row.getCell(1).value === "รวมทั้งหมด"
          ) {
            row.font = { bold: true };
            row.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE0F2FE" },
            };
          }
        });
      });

      [pivot, userSummary].forEach((sheet) => {
        [9, 10, 11, 12, 13, 14, 15].forEach((column) => {
          if (column <= sheet.columnCount) {
            sheet.getColumn(column).numFmt = "#,##0.00;[Red]-#,##0.00;0";
          }
        });
      });
      pivot.getColumn(13).numFmt = '0.00"%"';
      pivot.getColumn(15).numFmt = '0.00"%"';
      userSummary.getColumn(9).numFmt = '0.00"%"';
      userSummary.getColumn(11).numFmt = '0.00"%"';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, `PG_User_SKU_Sales_${startDate}_${endDate}.xlsx`);
    } catch (error) {
      Swal.fire(
        "Export ไม่สำเร็จ",
        error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        "error",
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-800 p-3 text-white">
              <PackageSearch size={22} />
            </div>
            <div>
              <h1 className="text-base font-black">
                สรุปยอดขายราย User แยก SKU
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                สรุปยอดจากรายงานกิจกรรมตามช่วงวันที่
                เพื่อพิจารณาอนุมัติและส่งบัญชี
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold hover:bg-slate-100"
            >
              <ArrowLeft size={14} /> หน้าหลัก Admin
            </Link>
            <button
              onClick={exportToExcel}
              disabled={loading || filteredData.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} /> Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900"
            >
              <Printer size={14} /> PDF / ปริ้นท์
            </button>
            <button
              onClick={loadData}
              title="รีเฟรชข้อมูล"
              className={`rounded-lg border border-slate-200 p-2 hover:bg-slate-50 ${loading ? "animate-spin" : ""}`}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 no-print">
          <label className="text-xs font-bold text-slate-600">
            <span className="mb-1 flex items-center gap-1.5">
              <Calendar size={14} /> ตั้งแต่วันที่
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            <span className="mb-1 block">ถึงวันที่</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2"
            />
          </label>
          <label className="relative min-w-[240px] flex-1 text-xs font-bold text-slate-600">
            <span className="mb-1 block">ค้นหาพนักงานหรือสาขา</span>
            <Search
              size={15}
              className="absolute bottom-2.5 left-3 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ชื่อ, รหัสพนักงาน, สาขา"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3"
            />
          </label>
          {startDate > endDate && (
            <p className="text-xs font-bold text-rose-600">
              วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด
            </p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <Users className="text-cyan-800" size={20} />
            <div>
              <p className="text-[11px] font-bold text-slate-500">จำนวน User</p>
              <p className="text-lg font-black">
                {filteredData.length.toLocaleString()} คน
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <PackageSearch className="text-emerald-700" size={20} />
            <div>
              <p className="text-[11px] font-bold text-slate-500">
                ยอดขายรวมทุก SKU
              </p>
              <p className="text-lg font-black">
                {totalSalesQty.toLocaleString()} ชิ้น/แพ็ค
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-lg font-black text-amber-700">฿</span>
            <div>
              <p className="text-[11px] font-bold text-slate-500">
                มูลค่าตามราคาที่บันทึก
              </p>
              <p className="text-lg font-black">
                {totalSalesAmount.toLocaleString()} บาท
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold text-slate-500">ค่าแรงรวม</p>
            <p className="mt-1 text-lg font-black">
              {usersMissingExpense === 0
                ? `${totalBaseWage.toLocaleString()} บาท`
                : "ข้อมูลไม่ครบ"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold text-slate-500">
              คอมมิชชั่นรวม
            </p>
            <p className="mt-1 text-lg font-black">
              {usersMissingExpense === 0
                ? `${totalCommission.toLocaleString()} บาท`
                : "ข้อมูลไม่ครบ"}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[11px] font-bold text-amber-800">
              ค่าใช้จ่ายรวม
            </p>
            <p className="mt-1 text-lg font-black text-amber-900">
              {usersMissingExpense === 0
                ? `${totalExpense.toLocaleString()} บาท`
                : "ข้อมูลไม่ครบ"}
            </p>
            <p className="text-[10px] font-bold text-amber-800">
              รายจ่าย/ยอดขาย{" "}
              {totalExpensePercent === null
                ? "-"
                : `${totalExpensePercent.toFixed(2)}%`}
            </p>
          </div>
          <div
            className={`rounded-xl border p-4 ${totalProfit === null ? "border-slate-200 bg-white" : totalProfit >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
          >
            <p className="text-[11px] font-bold text-slate-500">
              กำไร/ขาดทุนสุทธิ
            </p>
            <p
              className={`mt-1 text-lg font-black ${totalProfit === null ? "text-slate-500" : totalProfit >= 0 ? "text-emerald-800" : "text-rose-800"}`}
            >
              {totalProfit === null
                ? "คำนวณไม่ได้"
                : `${totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString()} บาท`}
            </p>
            <p className="text-[10px] font-bold text-slate-500">
              Margin{" "}
              {totalProfitMargin === null
                ? "-"
                : `${totalProfitMargin.toFixed(2)}%`}
            </p>
          </div>
        </section>

        {(expenseWarning || usersMissingExpense > 0) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
            {expenseWarning ||
              `ไม่พบข้อมูลลงเวลาสำหรับ ${usersMissingExpense} User; ระบบจะไม่คำนวณกำไรรวมเพื่อป้องกันการแสดงตัวเลขคลาดเคลื่อน`}
          </div>
        )}

        <ReportChartBuilder
          title="กราฟวิเคราะห์ยอดขายราย User และ SKU"
          rows={userSkuChartRows}
          dimensions={USER_SKU_CHART_DIMENSIONS}
          metrics={USER_SKU_CHART_METRICS}
          defaultDimension="user"
          defaultMetric="salesQty"
          defaultSeries="skuCode"
        />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
            <h2 className="text-sm font-black">
              สรุปยอดขายและค่าใช้จ่ายแยกตาม User / SKU
            </h2>
            <span className="text-xs font-bold text-slate-500">
              {loading
                ? "กำลังโหลดข้อมูล..."
                : `${filteredData.length} User · ${products.length} SKU`}
            </span>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1500px] border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                <tr>
                  <th className="border-b border-r border-slate-200 p-2 text-left">
                    พนักงาน
                  </th>
                  <th className="border-b border-r border-slate-200 p-2 text-left">
                    สินค้า
                  </th>
                  <th className="border-b border-r border-slate-200 p-2 text-left">
                    SKU บริษัท
                  </th>
                  <th className="border-b border-r border-slate-200 p-2 text-right">
                    จำนวนขาย
                  </th>
                  <th className="border-b border-r border-slate-200 bg-emerald-50 p-2 text-right">
                    ยอดขาย (บาท)
                  </th>
                  <th className="border-b border-r border-slate-200 p-2 text-right">
                    ค่าแรง (บาท)
                  </th>
                  <th className="border-b border-r border-slate-200 p-2 text-right">
                    คอมมิชชั่น (บาท)
                  </th>
                  <th className="border-b border-r border-slate-200 bg-amber-50 p-2 text-right">
                    ค่าใช้จ่ายรวม
                  </th>
                  <th className="border-b border-r border-slate-200 bg-amber-50 p-2 text-right">
                    รายจ่าย/ยอดขาย
                  </th>
                  <th className="border-b border-r border-slate-200 p-2 text-right">
                    กำไร/ขาดทุน (บาท)
                  </th>
                  <th className="border-b border-slate-200 p-2 text-right">
                    กำไร/ขาดทุน (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {userSummaries.map((item) => (
                  <React.Fragment key={item.userId || item.empId}>
                    <tr className="bg-slate-100 font-black text-slate-800">
                      <td
                        colSpan={11}
                        className="border-b border-slate-200 p-2.5"
                      >
                        {item.displayName}{" "}
                        <span className="font-mono text-[10px] text-slate-500">
                          {item.empId} · {item.storeName || "ไม่ระบุสาขา"}
                        </span>
                      </td>
                    </tr>
                    {item.productLines.map(
                      ({ product, quantity, amount }: any) => (
                        <tr
                          key={`${item.userId}-${getProductKey(product)}`}
                          className="odd:bg-white even:bg-slate-50"
                        >
                          <td className="border-b border-r border-slate-100 px-2 py-1.5"></td>
                          <td className="border-b border-r border-slate-100 px-2 py-1.5">
                            {product.name}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-1.5 font-mono text-[10px]">
                            {getProductKey(product)}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-1.5 text-right font-mono">
                            {quantity.toLocaleString()}
                          </td>
                          <td className="border-b border-r border-slate-100 bg-emerald-50/40 px-2 py-1.5 text-right font-mono">
                            {amount.toLocaleString()}
                          </td>
                          <td
                            colSpan={6}
                            className="border-b border-slate-100 px-2 py-1.5 text-center text-slate-300"
                          >
                            -
                          </td>
                        </tr>
                      ),
                    )}
                    <tr className="bg-cyan-50 font-black">
                      <td className="border-b border-r border-slate-200 p-2">
                        รวม User
                      </td>
                      <td className="border-b border-r border-slate-200 p-2">
                        รวมสินค้า
                      </td>
                      <td className="border-b border-r border-slate-200 p-2"></td>
                      <td className="border-b border-r border-slate-200 p-2 text-right font-mono">
                        {Number(item.totalSalesQty || 0).toLocaleString()}
                      </td>
                      <td className="border-b border-r border-slate-200 bg-emerald-100 p-2 text-right font-mono">
                        {Number(item.totalSalesAmount || 0).toLocaleString()}
                      </td>
                      <td className="border-b border-r border-slate-200 p-2 text-right font-mono">
                        {item.expenseAvailable
                          ? item.baseWage.toLocaleString()
                          : "-"}
                      </td>
                      <td className="border-b border-r border-slate-200 p-2 text-right font-mono">
                        {item.expenseAvailable
                          ? item.commission.toLocaleString()
                          : "-"}
                      </td>
                      <td className="border-b border-r border-slate-200 bg-amber-100 p-2 text-right font-mono">
                        {item.expenseAvailable
                          ? item.totalExpense.toLocaleString()
                          : "-"}
                      </td>
                      <td className="border-b border-r border-slate-200 bg-amber-100 p-2 text-right font-mono">
                        {item.expensePercent === null
                          ? "-"
                          : `${item.expensePercent.toFixed(2)}%`}
                      </td>
                      <td
                        className={`border-b border-r border-slate-200 p-2 text-right font-mono ${item.netProfit === null ? "text-slate-400" : item.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {item.netProfit === null
                          ? "-"
                          : `${item.netProfit >= 0 ? "+" : ""}${item.netProfit.toLocaleString()}`}
                      </td>
                      <td
                        className={`border-b border-slate-200 p-2 text-right font-mono ${item.profitMargin === null ? "text-slate-400" : item.profitMargin >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                      >
                        {item.profitMargin === null
                          ? "-"
                          : `${item.profitMargin.toFixed(2)}%`}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                {!loading && userSummaries.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-8 text-center font-medium text-slate-500"
                    >
                      ไม่พบยอดขายตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
              {userSummaries.length > 0 && (
                <tfoot className="sticky bottom-0 bg-slate-100 font-black">
                  <tr>
                    <td className="border-t border-r border-slate-300 p-2">
                      Grand Total
                    </td>
                    <td className="border-t border-r border-slate-300 p-2"></td>
                    <td className="border-t border-r border-slate-300 p-2"></td>
                    <td className="border-t border-r border-slate-300 p-2 text-right font-mono">
                      {totalSalesQty.toLocaleString()}
                    </td>
                    <td className="border-t border-r border-slate-300 bg-emerald-100 p-2 text-right font-mono">
                      {totalSalesAmount.toLocaleString()}
                    </td>
                    <td className="border-t border-r border-slate-300 p-2 text-right font-mono">
                      {usersMissingExpense === 0
                        ? totalBaseWage.toLocaleString()
                        : "-"}
                    </td>
                    <td className="border-t border-r border-slate-300 p-2 text-right font-mono">
                      {usersMissingExpense === 0
                        ? totalCommission.toLocaleString()
                        : "-"}
                    </td>
                    <td className="border-t border-r border-slate-300 bg-amber-100 p-2 text-right font-mono">
                      {usersMissingExpense === 0
                        ? totalExpense.toLocaleString()
                        : "-"}
                    </td>
                    <td className="border-t border-r border-slate-300 bg-amber-100 p-2 text-right font-mono">
                      {totalExpensePercent === null || usersMissingExpense > 0
                        ? "-"
                        : `${totalExpensePercent.toFixed(2)}%`}
                    </td>
                    <td
                      className={`border-t border-r border-slate-300 p-2 text-right font-mono ${totalProfit === null ? "text-slate-500" : totalProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {totalProfit === null
                        ? "-"
                        : `${totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString()}`}
                    </td>
                    <td className="border-t border-slate-300 p-2 text-right font-mono">
                      {totalProfitMargin === null
                        ? "-"
                        : `${totalProfitMargin.toFixed(2)}%`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
            รายจ่ายรวมคำนวณจากค่าแรงและคอมมิชชั่นตามรายงานเงินเดือน;
            ค่าใช้จ่ายแสดงเฉพาะแถวรวม User เพื่อไม่ให้นับซ้ำในแต่ละ SKU
          </p>
        </section>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            font-size: 8px !important;
          }
          main {
            min-height: 0 !important;
            padding: 0 !important;
          }
          section {
            break-inside: avoid;
          }
          table {
            font-size: 7px !important;
          }
          th,
          td {
            padding: 3px !important;
          }
        }
      `}</style>
    </main>
  );
}
