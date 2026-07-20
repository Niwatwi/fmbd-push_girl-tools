"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import Swal from "sweetalert2";
import { getAdminAttendanceExpenseReportAction } from "@/app/dashboard/actions";

export default function AdminAttendanceExpensePage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("ALL");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminAttendanceExpenseReportAction({
      startDate,
      endDate,
      storeCode: selectedStore,
    });
    if (res.success) {
      setLogs(res.data);
      setFilteredLogs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedStore]);

  // Keyword Search Filter
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setFilteredLogs(logs);
      return;
    }
    const kw = searchKeyword.toLowerCase();
    const filtered = logs.filter(
      (item) =>
        item.displayName.toLowerCase().includes(kw) ||
        item.empId.toLowerCase().includes(kw) ||
        item.storeName.toLowerCase().includes(kw) ||
        item.storeCode.toLowerCase().includes(kw),
    );
    setFilteredLogs(filtered);
  }, [searchKeyword, logs]);

  // สรุปตัวเลขสถิติ
  const totalDays = filteredLogs.length;
  const totalExpense = filteredLogs.reduce(
    (sum, item) => sum + item.totalExpense,
    0,
  );
  const totalHours = filteredLogs.reduce(
    (sum, item) =>
      sum + (typeof item.workedHours === "number" ? item.workedHours : 0),
    0,
  );

  // ดูรูป Check-in / GPS
  const handleViewPhoto = (url: string, title: string) => {
    Swal.fire({
      title,
      imageUrl: url,
      imageAlt: title,
      imageWidth: 500,
      confirmButtonColor: "#1e3a8a",
      confirmButtonText: "ปิดหน้าต่าง",
      customClass: { popup: "rounded-2xl" },
    });
  };

  // 📥 Export Excel (CSV) ส่งฝ่ายบัญชี
  const exportToExcel = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      "No.",
      "รหัสพนักงาน",
      "ชื่อ-นามสกุล PG",
      "รหัสสาขา",
      "สาขาปฏิบัติงาน",
      "วันที่เข้างาน",
      "เวลา Check-in",
      "เวลา Check-out",
      "ชั่วโมงทำงานรวม",
      "ค่าแรง/เบี้ยเลี้ยง (บาท)",
      "Latitude",
      "Longitude",
      "URL รูป Check-in",
      "URL รูป Check-out",
    ];

    const rows = filteredLogs.map((item, idx) => [
      idx + 1,
      item.empId,
      `"${item.displayName}"`,
      item.storeCode,
      `"${item.storeName}"`,
      item.checkInDateRaw,
      `"${item.checkInAt}"`,
      `"${item.checkOutAt}"`,
      item.workedHours,
      item.dailyWage,
      item.checkInLat,
      item.checkInLon,
      `"${item.checkInPhoto || ""}"`,
      `"${item.checkOutPhoto || ""}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Expense_Report_${new Date().toISOString().split("T")[0]}.csv`;
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

      {/* CONTAINER */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl">
              <Clock size={22} />
            </div>
            <div className="text-left">
              <h1 className="text-base font-black text-slate-800">
                ระบบจัดการเวลาทำงาน & ค่าใช้จ่าย (Time Attendance & Expense)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                สรุปวันทำงาน พิกัดลงเวลา และคำนวณเบี้ยเลี้ยงสำหรับส่งฝ่ายบัญชี
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
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

        {/* 📊 KPI SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                จำนวนวันทำงานรวม (Shifts)
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalDays.toLocaleString()} วัน/คน
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                ชั่วโมงทำงานสะสมรวม
              </span>
              <span className="text-lg font-black text-slate-800 block">
                {totalHours.toFixed(1)} ชั่วโมง
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">
                ยอดค่าแรง/เบี้ยเลี้ยงรวม (700฿/วัน)
              </span>
              <span className="text-lg font-black text-emerald-600 block">
                {totalExpense.toLocaleString()} บาท
              </span>
            </div>
          </div>
        </div>

        {/* 🔍 FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print text-left">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-blue-600" />
            <span className="text-xs font-black text-slate-700">
              ตัวกรองข้อมูล:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Range Date Filter */}
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

            {/* Keyword Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-2 text-slate-400"
              />
              <input
                type="text"
                placeholder="ค้นหาชื่อ PG / รหัสพนักงาน / สาขา..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium w-60"
              />
            </div>
          </div>
        </div>

        {/* 📋 TABLE REPORT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-left">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              ตารางบันทึกเวลาทำงาน & คำนวณเบี้ยเลี้ยง PG รายวัน
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">
              แสดงข้อมูลทั้งหมด {filteredLogs.length} รายการ
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
                    สาขาปฏิบัติงาน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    เวลา Check-in
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    เวลา Check-out
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    ชั่วโมงทำงาน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-right">
                    ค่าแรงรายวัน
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center">
                    พิกัด GPS
                  </th>
                  <th className="p-2.5 border border-slate-200 text-center no-print">
                    รูปถ่ายเข้า-ออก
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLogs.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
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
                      <span className="text-[9px] block font-mono text-slate-400">
                        {item.storeCode}
                      </span>
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-emerald-600 font-bold">
                      {item.checkInAt}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-blue-600 font-bold">
                      {item.checkOutAt}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono font-bold">
                      {item.workedHours !== "-"
                        ? `${item.workedHours} ชม.`
                        : "-"}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-mono font-black text-emerald-600 bg-emerald-50/30">
                      {item.dailyWage.toLocaleString()} ฿
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-[10px]">
                      {item.checkInLat !== "-" ? (
                        <a
                          href={`https://maps.google.com/?q=${item.checkInLat},${item.checkInLon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold"
                        >
                          <MapPin size={10} /> แผนที่ <ExternalLink size={8} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.checkInPhoto && (
                          <button
                            onClick={() =>
                              handleViewPhoto(
                                item.checkInPhoto,
                                `รูป Check-in: ${item.displayName}`,
                              )
                            }
                            className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md hover:bg-blue-100 transition cursor-pointer"
                          >
                            รูปเข้า
                          </button>
                        )}
                        {item.checkOutPhoto && (
                          <button
                            onClick={() =>
                              handleViewPhoto(
                                item.checkOutPhoto,
                                `รูป Check-out: ${item.displayName}`,
                              )
                            }
                            className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-100 transition cursor-pointer"
                          >
                            รูปออก
                          </button>
                        )}
                        {!item.checkInPhoto && !item.checkOutPhoto && (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </div>
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
