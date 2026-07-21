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
import { getAdminSalarySummaryReportAction } from "@/app/dashboard/actions";

export default function AdminSalarySummaryPage() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminSalarySummaryReportAction({
      startDate,
      endDate,
    });
    if (res.success) {
      setDataList(res.data);
      setFilteredData(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // Keyword Search
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredData(dataList);
      return;
    }
    const kw = searchKeyword.toLowerCase();
    const filtered = dataList.filter(
      (item) =>
        item.displayName.toLowerCase().includes(kw) ||
        item.empId.toLowerCase().includes(kw) ||
        item.storeName.toLowerCase().includes(kw),
    );
    setFilteredData(filtered);
  }, [searchKeyword, dataList]);

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
  const totalNetPayableSum = filteredData.reduce(
    (sum, item) => sum + item.totalNetSalary,
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
      "อัตราค่าแรง/วัน (บาท)",
      "รวมค่าแรงรายวัน (บาท)",
      "ยอดขายสะสม (ชุดโปร)",
      "ค่าคอมมิชชั่น/Incentive (บาท)",
      "รายได้รวมสุทธิ (บาท)",
    ];

    const rows = filteredData.map((item, idx) => [
      idx + 1,
      item.empId,
      `"${item.displayName}"`,
      `"${item.storeName}"`,
      item.workDaysCount,
      item.baseSalaryRate,
      item.totalDailyWage,
      item.totalSets,
      item.totalCommission,
      item.totalNetSalary,
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
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased p-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
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
                รวมค่าแรงรายวัน + ค่าคอมมิชชั่นสะสม สำหรับนำส่งจ่ายฝ่ายบัญชี
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
              <Download size={14} /> Export Excel (ส่งบัญชี)
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              <Printer size={14} /> ปริ้นท์ PDF
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                จำนวนพนักงาน PG ที่มีผลงาน
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
                ยอดรวมค่าแรงรายวัน
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
          </div>
        </div>

        {/* 📋 TABLE SUMMARY REPORT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              ตารางคำนวณเงินเดือนสุทธิประจำงวด (ค่าแรงรายวัน + คอมมิชชั่น)
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
                    ค่าแรง/วัน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-slate-200/50">
                    รวมค่าแรงรายวัน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    ยอดขายสะสม
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-amber-50/50">
                    ค่าคอมมิชชั่น
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right bg-emerald-100/50 text-emerald-900">
                    💰 รวมจ่ายสุทธิ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredData.map((item, idx) => (
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
                        {item.empId}
                      </div>
                    </td>
                    <td className="p-2.5 border border-slate-200 font-bold text-slate-700">
                      {item.storeName}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-blue-600">
                      {item.workDaysCount} วัน
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono">
                      {item.baseSalaryRate.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-slate-800 bg-slate-50">
                      {item.totalDailyWage.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono font-bold text-slate-600">
                      {item.totalSets} ชุด
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-bold text-amber-600 bg-amber-50/30">
                      +{item.totalCommission.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-black text-emerald-600 bg-emerald-50/50 text-xs">
                      {item.totalNetSalary.toLocaleString()} ฿
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
