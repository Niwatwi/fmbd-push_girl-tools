"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  Coins,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Building2,
  Calendar,
  TrendingUp,
  Award,
  ArrowLeft,
} from "lucide-react";
import Swal from "sweetalert2";
import { getAdminSalarySummaryReportAction } from "@/app/dashboard/actions";
import { getSalaryPeriodForMonth } from "@/utils/salary-period";
import { calculatePayrollAccountingAmounts } from "@/utils/payroll-accounting";
import {
  getApprovedPayrollKpiReportAction,
  getPayrollSummaryAdjustmentsAction,
  savePayrollSummaryAdjustmentsAction,
} from "./actions";

type PayrollAdjustment = { otherExpenses: string; note: string };
type AccountingPrintKind = "WAGE" | "COMMISSION" | "KPI";

function getEmployeeKey(item: any) {
  return String(
    item.employeeCode ||
      item.empId ||
      item.employeeId ||
      item.username ||
      item.userId ||
      "",
  ).trim();
}

function getCurrentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" })
    .format(new Date())
    .slice(0, 7);
}

export default function AdminSalarySummaryPage() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("ALL");
  const [payrollPeriodMode, setPayrollPeriodMode] = useState<
    "DAILY" | "MONTHLY"
  >("MONTHLY");
  const [adjustments, setAdjustments] = useState<
    Record<string, PayrollAdjustment>
  >({});
  const [savingAdjustments, setSavingAdjustments] = useState(false);
  const [adjustmentLoadError, setAdjustmentLoadError] = useState("");
  const [printKind, setPrintKind] = useState<AccountingPrintKind | null>(null);
  const [kpiReportRows, setKpiReportRows] = useState<any[]>([]);
  const [loadingKpiReport, setLoadingKpiReport] = useState(false);

  // Filter States
  const [startDate, setStartDate] = useState<string>(
    () => getSalaryPeriodForMonth(getCurrentMonth()).payrollStartDate,
  );
  const [endDate, setEndDate] = useState<string>(
    () => getSalaryPeriodForMonth(getCurrentMonth()).payrollEndDate,
  );
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const handlePayrollPeriodModeChange = (mode: "DAILY" | "MONTHLY") => {
    setPayrollPeriodMode(mode);
    if (mode === "MONTHLY" && selectedMonth) {
      const period = getSalaryPeriodForMonth(selectedMonth);
      setStartDate(period.payrollStartDate);
      setEndDate(period.payrollEndDate);
    }
  };

  const handleSelectedMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month) {
      const period = getSalaryPeriodForMonth(month);
      setStartDate(period.payrollStartDate);
      setEndDate(period.payrollEndDate);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const payrollPeriod =
        payrollPeriodMode === "MONTHLY" && selectedMonth
          ? getSalaryPeriodForMonth(selectedMonth)
          : null;
      const [res, adjustmentRes] = await Promise.all([
        getAdminSalarySummaryReportAction({
          startDate,
          endDate,
          includeKpi: Boolean(payrollPeriod),
          commissionStartDate: payrollPeriod?.commissionStartDate,
          commissionEndDate: payrollPeriod?.commissionEndDate,
          kpiPeriodMonth: payrollPeriod?.kpiPeriodMonth,
        }),
        getPayrollSummaryAdjustmentsAction(startDate, endDate),
      ]);
      if (!res.success) {
        throw new Error(res.message || "ไม่สามารถโหลดข้อมูลสรุปเงินเดือนได้");
      }
      setDataList(res.data);
      setFilteredData(res.data);
      if (adjustmentRes.success) {
        setAdjustmentLoadError("");
        setAdjustments(
          Object.fromEntries(
            adjustmentRes.data.map((item) => [
              String(item.employee_id).trim().toLowerCase(),
              {
                otherExpenses: String(item.other_expenses || 0),
                note: String(item.note || ""),
              },
            ]),
          ),
        );
      } else {
        setAdjustments({});
        setAdjustmentLoadError(adjustmentRes.message);
      }
    } catch (error) {
      console.error("Salary summary load error:", error);
      setDataList([]);
      setFilteredData([]);
      Swal.fire(
        "โหลดข้อมูลไม่สำเร็จ",
        error instanceof Error
          ? error.message
          : "กรุณาเข้าสู่ระบบใหม่ด้วยบัญชีผู้ดูแลระบบ",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, payrollPeriodMode]);

  useEffect(() => {
    const clearPrintKind = () => setPrintKind(null);
    window.addEventListener("afterprint", clearPrintKind);
    return () => window.removeEventListener("afterprint", clearPrintKind);
  }, []);

  // Keyword Search
  useEffect(() => {
    const kw = searchKeyword.toLowerCase();
    const filtered = dataList.filter((item) => {
      const matchesEmployee =
        selectedEmployeeId === "ALL" ||
        String(item.userId) === selectedEmployeeId;
      const matchesSearch =
        !kw ||
        [
          item.displayName,
          item.empId,
          item.employeeId,
          item.employeeCode,
          item.username,
          item.userId,
          item.storeName,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(kw),
        );
      return matchesEmployee && matchesSearch;
    });
    setFilteredData(filtered);
  }, [searchKeyword, selectedEmployeeId, dataList]);

  const employeeOptions = Array.from(
    new Map(dataList.map((item) => [String(item.userId), item])).values(),
  );

  const getAdjustment = (item: any): PayrollAdjustment =>
    adjustments[getEmployeeKey(item).toLowerCase()] || {
      otherExpenses: "0",
      note: "",
    };

  const accountingRows = filteredData.map((item) => {
    const adjustment = getAdjustment(item);
    const amounts = calculatePayrollAccountingAmounts({
      wages: Number(item.totalDailyWage || 0),
      kpi: Number(item.totalKpiAmount || 0),
      commission: Number(item.totalCommission || 0),
      otherExpenses: Number(adjustment.otherExpenses || 0),
    });
    return { ...item, adjustment, ...amounts };
  });

  const updateAdjustment = (item: any, update: Partial<PayrollAdjustment>) => {
    const key = getEmployeeKey(item).toLowerCase();
    setAdjustments((current) => ({
      ...current,
      [key]: { ...getAdjustment(item), ...update },
    }));
  };

  const saveAdjustments = async () => {
    setSavingAdjustments(true);
    const result = await savePayrollSummaryAdjustmentsAction(
      startDate,
      endDate,
      dataList
        .map((item) => ({
          employeeId: getEmployeeKey(item),
          otherExpenses: Number(getAdjustment(item).otherExpenses || 0),
          note: getAdjustment(item).note,
        }))
        .filter((item) => item.employeeId),
    );
    if (!result.success) {
      Swal.fire("บันทึกไม่สำเร็จ", result.message, "error");
    } else {
      setAdjustmentLoadError("");
      Swal.fire({
        title: "บันทึกข้อมูลแล้ว",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
      });
    }
    setSavingAdjustments(false);
  };

  const getSelectedKpiEmployee = () =>
    selectedEmployeeId === "ALL"
      ? ""
      : getEmployeeKey(
          dataList.find((item) => String(item.userId) === selectedEmployeeId),
        );

  const fetchKpiReportRows = async () => {
    setLoadingKpiReport(true);
    const result = await getApprovedPayrollKpiReportAction(
      selectedMonth,
      getSelectedKpiEmployee(),
    );
    setLoadingKpiReport(false);
    if (!result.success) {
      Swal.fire("โหลด KPI ไม่สำเร็จ", result.message, "error");
      return null;
    }
    setKpiReportRows(result.data);
    return result.data;
  };

  const exportKpiReport = async () => {
    const rows = await fetchKpiReportRows();
    if (!rows) return;
    if (rows.length === 0) {
      Swal.fire("ไม่มีข้อมูล", "ไม่พบ KPI ที่อนุมัติในตัวกรองนี้", "info");
      return;
    }
    const headers = [
      "รอบ KPI",
      "แหล่งข้อมูล",
      "รหัสพนักงาน",
      "Username",
      "ชื่อพนักงาน",
      "ประเภท KPI",
      "คะแนน (%)",
      "จำนวนเงิน (บาท)",
      "สาขา",
      "หมายเหตุ",
      "เกณฑ์ประเมิน",
    ];
    const csvCell = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv =
      "\uFEFF" +
      [
        headers.map(csvCell).join(","),
        ...rows.map((item) =>
          [
            item.periodMonth,
            item.source,
            item.employeeId,
            item.username,
            item.employeeName,
            item.assessmentType,
            item.scorePercent,
            item.amount,
            item.storeName,
            item.note,
            item.criteria ? JSON.stringify(item.criteria) : "",
          ]
            .map(csvCell)
            .join(","),
        ),
      ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PG_KPI_${selectedMonth}_${selectedEmployeeId === "ALL" ? "ALL" : selectedEmployeeId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printAccountingDocument = (kind: AccountingPrintKind) => {
    setPrintKind(kind);
    window.setTimeout(() => window.print(), 100);
  };

  const printKpiReport = async () => {
    const rows = await fetchKpiReportRows();
    if (!rows) return;
    if (rows.length === 0) {
      Swal.fire("ไม่มีข้อมูล", "ไม่พบ KPI ที่อนุมัติในตัวกรองนี้", "info");
      return;
    }
    setPrintKind("KPI");
    window.setTimeout(() => window.print(), 100);
  };

  // ตัวเลขสรุปรวมทั้งหมด
  const totalStaffCount = filteredData.length;
  const totalWagesSum = filteredData.reduce(
    (sum, item) => sum + item.totalDailyWage,
    0,
  );
  const totalCommissionSum = filteredData.reduce(
    (sum, item) => sum + item.totalCommission,
    0,
  );
  const totalKpiSum = filteredData.reduce(
    (sum, item) => sum + (item.totalKpiAmount || 0),
    0,
  );
  const totalNetPayableSum = accountingRows.reduce(
    (sum, item) => sum + item.netPayable,
    0,
  );

  // 📥 Export Excel (CSV) สำหรับฝ่ายบัญชี
  const exportToExcel = () => {
    if (filteredData.length === 0) return;

    const headers = [
      "ลำดับ",
      "รหัสพนักงาน",
      "ชื่อ-นามสกุล PG",
      "จุดปฏิบัติงาน/สาขา",
      "จำนวนวันทำงาน (วัน)",
      "อัตราค่าแรง/วัน หรือเงินเดือน (บาท)",
      "รวมค่าแรงและเงินเดือน (บาท)",
      "ยอดขายสะสม (แพ็ค)",
      "ค่าคอมมิชชั่น/Incentive (บาท)",
      "KPI BA (บาท)",
      "ค่าใช้จ่ายอื่นๆ (บาท)",
      "หัก ณ ที่จ่าย 3% (บาท)",
      "ยอดจ่ายสุทธิ (บาท)",
      "หมายเหตุ",
    ];

    const rows = accountingRows.map((item, idx) => [
      idx + 1,
      item.empId,
      `"${item.displayName}"`,
      `"${item.storeName}"`,
      item.workDaysCount, // ค่าจะส่งออกเป็น 0.5, 1, 1.5 ตามจริง
      item.baseSalaryRate,
      item.totalDailyWage,
      item.totalPacks,
      item.totalCommission,
      item.totalKpiAmount || 0,
      item.adjustment.otherExpenses,
      item.withholdingTax,
      item.netPayable,
      `"${String(item.adjustment.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PG_Salary_Summary_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-blue-800 text-slate-800 font-sans antialiased p-6">
      <style jsx global>{`
        @media screen {
          .accounting-print {
            display: none;
          }
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body * {
            visibility: hidden !important;
          }
          .accounting-print,
          .accounting-print * {
            visibility: visible !important;
          }
          .accounting-print {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            padding: 5mm;
            background: #fff !important;
            color: #111827 !important;
            font-size: 9px !important;
          }
          nav,
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff !important;
            font-size: 8px !important;
          }
          main {
            max-width: 100% !important;
            padding: 0 !important;
          }
          table {
            width: 100% !important;
            font-size: 8px !important;
          }
          th,
          td {
            padding: 3px !important;
          }
          .accounting-print table {
            border-collapse: collapse;
            width: 100%;
          }
          .accounting-print th,
          .accounting-print td {
            border: 1px solid #64748b !important;
            color: #111827 !important;
            padding: 5px !important;
          }
          .accounting-signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-top: 28px;
          }
          .accounting-signatures > div {
            border-top: 1px solid #334155;
            padding-top: 5px;
            text-align: center;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-900 text-white rounded-xl">
              <Wallet size={22} />
            </div>
            <div className="text-left">
              <h1 className="text-base font-black text-slate-800">
                รายงานสรุปรายได้และเงินเดือนพนักงาน PG (Salary & Incentive
                Summary)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {payrollPeriodMode === "MONTHLY"
                  ? "ค่าแรงวันที่ 16 เดือนก่อน–15 เดือนที่เลือก; คอมมิชชั่นใช้เดือนก่อน และ KPI ใช้เดือนที่เลือกเฉพาะรายการอนุมัติแล้ว"
                  : "คอมมิชชั่นรายวันคำนวณตาม Target; ค่าแรงรวมตามช่วงวันที่เลือก"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            {/* ⬅️ ปุ่มกลับหน้าหลัก ADMIN */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} /> หน้าหลัก Admin
            </Link>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              <Download size={14} /> Export สรุปรวม
            </button>
            <button
              onClick={saveAdjustments}
              disabled={savingAdjustments || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download size={14} />
              {savingAdjustments
                ? "กำลังบันทึก..."
                : "บันทึกค่าใช้จ่าย/หมายเหตุ"}
            </button>
            <button
              onClick={() => printAccountingDocument("WAGE")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              <Printer size={14} /> พิมพ์สรุปค่าแรง
            </button>
            <button
              onClick={() => printAccountingDocument("COMMISSION")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              <Printer size={14} /> พิมพ์ค่าคอมมิชชั่น
            </button>
            <button
              onClick={exportKpiReport}
              disabled={loadingKpiReport || payrollPeriodMode !== "MONTHLY"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download size={14} /> Export KPI
            </button>
            <button
              onClick={printKpiReport}
              disabled={loadingKpiReport || payrollPeriodMode !== "MONTHLY"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-900 hover:bg-teal-950 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer size={14} /> พิมพ์ KPI
            </button>
            <button
              onClick={loadData}
              className={`p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer ${
                loading ? "animate-spin" : ""
              }`}
            >
              <RefreshCw size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* 📊 KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                จำนวนพนักงานที่มีรายได้ในงวด
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalStaffCount} คน
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                ยอดรวมค่าแรง
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalWagesSum.toLocaleString()} ฿
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Coins size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                ยอดรวมค่าคอมมิชชั่น
              </span>
              <span className="text-lg font-black text-amber-600 block">
                {totalCommissionSum.toLocaleString()} ฿
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
              <Award size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                ยอดรวม KPI BA{" "}
                {payrollPeriodMode === "MONTHLY"
                  ? "ประจำเดือน"
                  : "(เลือกรายเดือนเพื่อรวม)"}
              </span>
              <span className="text-lg font-black text-teal-700 block">
                {totalKpiSum.toLocaleString()} ฿
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/40 to-emerald-50/40 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl">
              <Award size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800 block uppercase">
                ยอดจ่ายรวมสุทธิทั้งหมด
              </span>
              <span className="text-lg font-black text-emerald-700 block">
                {totalNetPayableSum.toLocaleString()} ฿
              </span>
            </div>
          </div>
        </div>

        {/* 🔍 FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print text-left">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-blue-600" />
            <span className="text-xs font-black text-slate-700">
              ตัวกรองช่วงเวลา & พนักงาน:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => handlePayrollPeriodModeChange("DAILY")}
                aria-pressed={payrollPeriodMode === "DAILY"}
                className={`rounded-md px-3 py-1.5 font-bold ${payrollPeriodMode === "DAILY" ? "bg-blue-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                รายวัน
              </button>
              <button
                type="button"
                onClick={() => handlePayrollPeriodModeChange("MONTHLY")}
                aria-pressed={payrollPeriodMode === "MONTHLY"}
                className={`rounded-md px-3 py-1.5 font-bold ${payrollPeriodMode === "MONTHLY" ? "bg-blue-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                รอบค่าใช้จ่าย (16–15)
              </button>
            </div>

            {payrollPeriodMode === "MONTHLY" ? (
              <label className="flex items-center gap-1.5 font-bold text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                เดือนสิ้นสุดงวด
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) =>
                    handleSelectedMonthChange(event.target.value)
                  }
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
                />
                <span className="text-[10px] text-slate-500">
                  คอมมิชชั่นใช้เดือนก่อน; KPI ใช้เดือนที่เลือก
                </span>
              </label>
            ) : (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
                />
                <span className="text-slate-400">ถึง</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold"
                />
              </div>
            )}

            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-2 text-slate-400"
              />
              <input
                type="text"
                placeholder="ค้นหาชื่อ PG / รหัส / สาขา..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium w-60"
              />
            </div>

            <label className="flex items-center gap-1.5 font-bold text-slate-600">
              พนักงาน
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold max-w-56"
              >
                <option value="ALL">ทุกคน</option>
                {employeeOptions.map((item) => (
                  <option key={String(item.userId)} value={String(item.userId)}>
                    {item.displayName} ({getEmployeeKey(item)})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {adjustmentLoadError && (
          <p
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 no-print"
          >
            โหลดค่าใช้จ่ายอื่น/หมายเหตุไม่สำเร็จ กรุณาตรวจสอบ migration
            payroll_summary_adjustments: {adjustmentLoadError}
          </p>
        )}

        {/* 📋 TABLE SUMMARY REPORT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              ตารางคำนวณรายได้สุทธิประจำงวด (ค่าแรง + คอมมิชชั่น + KPI BA)
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">
              ทั้งหมด {filteredData.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase border-b border-slate-200">
                <tr>
                  <th className="p-2.5 border border-slate-200 text-center">
                    ลำดับ
                  </th>
                  <th className="p-2.5 border border-slate-200">
                    รหัส / ชื่อพนักงาน
                  </th>
                  <th className="p-2.5 border border-slate-200">
                    จุดปฏิบัติงานหลัก
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    จำนวนวันทำงาน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right">
                    ค่าแรง/วัน / เงินเดือน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-slate-200/50">
                    รวมค่าแรง / เงินเดือน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    ยอดขายสะสม
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-amber-50/50">
                    ค่าคอมมิชชั่น
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-teal-50/60">
                    KPI BA
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right">
                    ค่าใช้จ่ายอื่นๆ
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right">
                    หัก ณ ที่จ่าย 3%
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-emerald-100/50 text-emerald-900">
                    💰 ยอดจ่ายสุทธิ
                  </th>
                  <th className="p-2.5 border border-slate-200">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {accountingRows.map((item, idx) => (
                  <tr
                    key={item.userId}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="p-2.5 border border-slate-200">
                      <div className="font-bold text-slate-800">
                        {item.displayName}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        {item.employeeCode ||
                          item.empId ||
                          item.employeeId ||
                          item.username ||
                          "-"}
                      </div>
                      {item.username &&
                        item.username !==
                          (item.employeeCode ||
                            item.empId ||
                            item.employeeId) && (
                          <div className="text-[9px] font-mono text-slate-400">
                            {item.username}
                          </div>
                        )}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-bold text-slate-700">
                      {item.storeName}
                    </td>
                    {/* ปรับให้รองรับทศนิยมสวยงาม */}
                    <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-blue-600">
                      {Number(item.workDaysCount).toLocaleString("th-TH", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}{" "}
                      วัน
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono">
                      {item.baseSalaryRate.toLocaleString()} ฿
                      {item.isMonthly ? " (เงินเดือน)" : ""}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-slate-800 bg-slate-50">
                      {item.totalDailyWage.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-slate-600">
                      {item.totalPacks} แพ็ค
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-amber-600 bg-amber-50/30">
                      +{item.totalCommission.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-teal-700 bg-teal-50/30">
                      +{(item.totalKpiAmount || 0).toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`ค่าใช้จ่ายอื่น ${item.displayName}`}
                        value={item.adjustment.otherExpenses}
                        onChange={(event) =>
                          updateAdjustment(item, {
                            otherExpenses: event.target.value,
                          })
                        }
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right font-mono"
                      />
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono">
                      {item.withholdingTax.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-black text-emerald-600 bg-emerald-50/50 text-xs">
                      {item.netPayable.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200">
                      <input
                        type="text"
                        maxLength={1000}
                        aria-label={`หมายเหตุ ${item.displayName}`}
                        value={item.adjustment.note}
                        onChange={(event) =>
                          updateAdjustment(item, { note: event.target.value })
                        }
                        className="w-40 rounded border border-slate-200 px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {printKind && (
          <section className="accounting-print">
            <h1 className="mb-1 text-center text-lg font-bold">
              {printKind === "WAGE"
                ? "สรุปค่าแรงพนักงานประจำงวด"
                : printKind === "COMMISSION"
                  ? "สรุปค่าคอมมิชชั่นพนักงาน"
                  : "สรุปคะแนนและเงินค่า KPI ที่อนุมัติแล้ว"}
            </h1>
            <p className="mb-4 text-center">
              {printKind === "KPI"
                ? `รอบ KPI ${selectedMonth}`
                : `รอบค่าใช้จ่าย ${startDate} ถึง ${endDate}`}
            </p>

            {printKind === "WAGE" && (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>รหัสพนักงาน</th>
                      <th>ชื่อพนักงาน</th>
                      <th>วันทำงาน</th>
                      <th>ค่าแรง/เงินเดือน</th>
                      <th>KPI</th>
                      <th>คอมมิชชั่น</th>
                      <th>ค่าใช้จ่ายอื่นๆ</th>
                      <th>หัก ณ ที่จ่าย 3%</th>
                      <th>ยอดจ่ายสุทธิ</th>
                      <th>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountingRows.map((item, index) => (
                      <tr key={item.userId}>
                        <td>{index + 1}</td>
                        <td>{getEmployeeKey(item)}</td>
                        <td>{item.displayName}</td>
                        <td>{item.workDaysCount}</td>
                        <td>
                          {Number(item.totalDailyWage || 0).toLocaleString()}
                        </td>
                        <td>
                          {Number(item.totalKpiAmount || 0).toLocaleString()}
                        </td>
                        <td>
                          {Number(item.totalCommission || 0).toLocaleString()}
                        </td>
                        <td>
                          {Number(
                            item.adjustment.otherExpenses || 0,
                          ).toLocaleString()}
                        </td>
                        <td>{item.withholdingTax.toLocaleString()}</td>
                        <td>{item.netPayable.toLocaleString()}</td>
                        <td>{item.adjustment.note}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={8}>รวมทั้งสิ้น</th>
                      <th>
                        {accountingRows
                          .reduce((sum, item) => sum + item.withholdingTax, 0)
                          .toLocaleString()}
                      </th>
                      <th>{totalNetPayableSum.toLocaleString()}</th>
                      <th />
                    </tr>
                  </tfoot>
                </table>
                <div className="accounting-signatures">
                  <div>ผู้จัดทำ</div>
                  <div>ผู้ตรวจสอบ</div>
                  <div>ผู้อนุมัติ</div>
                </div>
              </>
            )}

            {printKind === "COMMISSION" && (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>รหัสพนักงาน</th>
                      <th>ชื่อพนักงาน</th>
                      <th>จุดปฏิบัติงาน</th>
                      <th>ยอดขายสะสม (แพ็ค)</th>
                      <th>ค่าคอมมิชชั่น (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr key={item.userId}>
                        <td>{index + 1}</td>
                        <td>{getEmployeeKey(item)}</td>
                        <td>{item.displayName}</td>
                        <td>{item.storeName}</td>
                        <td>{Number(item.totalPacks || 0).toLocaleString()}</td>
                        <td>
                          {Number(item.totalCommission || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={5}>รวมทั้งสิ้น</th>
                      <th>{totalCommissionSum.toLocaleString()}</th>
                    </tr>
                  </tfoot>
                </table>
                <div className="accounting-signatures">
                  <div>ผู้จัดทำ</div>
                  <div>ผู้ตรวจสอบ</div>
                  <div>ผู้อนุมัติ</div>
                </div>
              </>
            )}

            {printKind === "KPI" && (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>รหัสพนักงาน</th>
                      <th>ชื่อพนักงาน</th>
                      <th>แหล่งข้อมูล</th>
                      <th>ประเภท KPI</th>
                      <th>คะแนน (%)</th>
                      <th>จำนวนเงิน (บาท)</th>
                      <th>สาขา</th>
                      <th>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiReportRows.map((item, index) => (
                      <tr
                        key={`${item.source}:${item.employeeId}:${item.assessmentType}:${index}`}
                      >
                        <td>{index + 1}</td>
                        <td>{item.employeeId}</td>
                        <td>{item.employeeName}</td>
                        <td>{item.source}</td>
                        <td>{item.assessmentType}</td>
                        <td>{item.scorePercent ?? "-"}</td>
                        <td>{Number(item.amount || 0).toLocaleString()}</td>
                        <td>{item.storeName}</td>
                        <td>{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={6}>รวม KPI ที่อนุมัติ</th>
                      <th>
                        {kpiReportRows
                          .reduce(
                            (sum, item) => sum + Number(item.amount || 0),
                            0,
                          )
                          .toLocaleString()}
                      </th>
                      <th colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
                <div className="accounting-signatures">
                  <div>ผู้จัดทำ</div>
                  <div>ผู้ตรวจสอบ</div>
                  <div>ผู้อนุมัติ</div>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
