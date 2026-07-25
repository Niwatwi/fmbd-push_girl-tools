"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  MapPin,
  Image as ImageIcon,
  Search,
  Calendar,
  X,
  UserCheck,
  DollarSign,
  Download,
} from "lucide-react";
import { getAdminAttendanceExpenseReportAction } from "@/app/dashboard/actions";
import * as XLSX from "xlsx";

export default function AdminAttendanceExpensePage() {
  const [logsList, setLogsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 📸 State สำหรับเปิด Modal Preview รูปภาพ
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    employeeName: string;
    dateStr: string;
  } | null>(null);

  const fetchReportData = async () => {
    setLoading(true);
    const res = await getAdminAttendanceExpenseReportAction({
      startDate,
      endDate,
    });
    if (res.success) {
      setLogsList(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  // ค้นหาข้อมูลตามรายชื่อ/รหัส/สาขา
  const filteredLogs = logsList.filter(
    (item) =>
      item.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storeCode?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // คำนวณสรุปยอดรวม
  const totalShifts = filteredLogs.length;
  const totalHours = filteredLogs
    .reduce(
      (sum, item) =>
        sum + (typeof item.workedHours === "number" ? item.workedHours : 0),
      0,
    )
    .toFixed(1);
  const totalExpense = filteredLogs.reduce(
    (sum, item) => sum + Number(item.dailyWage || 0),
    0,
  );

  // 🖨️ ฟังก์ชันสั่งพิมพ์ PDF
  const handlePrint = () => {
    window.print();
  };

  // 📊 Export ข้อมูลออกเป็น Excel
  const handleExportExcel = () => {
    const exportData = filteredLogs.map((item, index) => ({
      ลำดับ: index + 1,
      รหัสพนักงาน: item.empId,
      ชื่อพนักงาน: item.displayName,
      สาขา: item.storeName,
      รหัสสาขา: item.storeCode,
      เวลาเข้างาน: item.checkInAt,
      เวลาออกงาน: item.checkOutAt,
      ชั่วโมงทำงาน: item.workedHours,
      ค่าแรงรายวัน: item.dailyWage,
      พิกัดLatitude: item.checkInLat || "-",
      พิกัดLongitude: item.checkInLon || "-",
      ลิงก์รูปเข้างาน: item.checkInPhoto || "-",
      ลิงก์รูปออกงาน: item.checkOutPhoto || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance & Expense");
    XLSX.writeFile(
      workbook,
      `Attendance_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  return (
    <div className="min-h-screen bg-blue-800 text-slate-800 font-sans antialiased p-4 md:p-8">
      {/* 🛑 CSS สำหรับปรับแต่งการสั่งพิมพ์ PDF (Hide Navigation, Show Images) */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .print-table {
            font-size: 10px !important;
          }
          .print-img {
            display: block !important;
            max-height: 48px !important;
            width: auto !important;
            object-fit: contain !important;
            border-radius: 4px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .print-badge {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP BAR / NAVIGATION (ซ่อนขณะพิมพ์) */}
        <div className="no-print bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs">
              <Clock size={24} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight">
                ระบบจัดการเวลาทำงาน & ค่าใช้จ่าย (Time Attendance & Expense)
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                สรุปวันทำงาน พิกัดลงเวลา รูปถ่าย
                และคำนวณเบี้ยเลี้ยงสำหรับส่งฝ่ายบัญชี
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> หน้าหลัก Admin
            </Link>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet size={14} /> Export Excel (ส่งบัญชี)
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer size={14} /> ปริ้นท์ PDF
            </button>

            <button
              onClick={fetchReportData}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS SUMMARY STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <UserCheck size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                จำนวนวันทำงานรวม (SHIFTS)
              </span>
              <span className="text-lg font-black text-slate-800 font-mono">
                {totalShifts}{" "}
                <span className="text-xs font-normal text-slate-500">
                  วัน/คน
                </span>
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Clock size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                ชั่วโมงทำงานสะสมรวม
              </span>
              <span className="text-lg font-black text-slate-800 font-mono">
                {totalHours}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ชั่วโมง
                </span>
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <DollarSign size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                ยอดค่าแรง/เบี้ยเลี้ยงรวม (700฿/วัน)
              </span>
              <span className="text-lg font-black text-emerald-600 font-mono">
                {totalExpense.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-500">บาท</span>
              </span>
            </div>
          </div>
        </div>

        {/* FILTER BAR (ซ่อนขณะพิมพ์) */}
        <div className="no-print bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Calendar size={14} className="text-slate-400" />
            <span>ตัวกรองข้อมูล:</span>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border rounded-xl text-xs bg-slate-50 font-bold focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-xs text-slate-400 font-bold">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border rounded-xl text-xs bg-slate-50 font-bold focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="relative flex-1 md:w-64">
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="ค้นหาชื่อ PG / รหัสพนักงาน / สาขา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 font-bold"
              />
            </div>
          </div>
        </div>

        {/* 📋 TABLE AREA */}
        <div className="print-area bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              ตารางบันทึกเวลาทำงาน & คำนวณเบี้ยเลี้ยง PG รายวัน
            </h3>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              แสดงข้อมูลทั้งหมด {filteredLogs.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                กำลังดึงข้อมูลรายงานลงเวลา...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                ไม่พบข้อมูลประวัติลงเวลาทำงานในช่วงเวลานี้
              </div>
            ) : (
              <table className="print-table w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 text-center w-12">ลำดับ</th>
                    <th className="p-3">รหัส / ชื่อพนักงาน</th>
                    <th className="p-3">สาขาปฏิบัติงาน</th>
                    <th className="p-3">เวลา CHECK-IN</th>
                    <th className="p-3">เวลา CHECK-OUT</th>
                    <th className="p-3 text-center">ชั่วโมงทำงาน</th>
                    <th className="p-3 text-right">ค่าแรงรายวัน</th>
                    <th className="p-3 text-center">พิกัด GPS</th>
                    <th className="p-3 text-center">รูปถ่ายเข้า-ออก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredLogs.map((item, index) => {
                    const hasCheckInImg = Boolean(item.checkInPhoto);
                    const hasCheckOutImg = Boolean(item.checkOutPhoto);

                    return (
                      <tr
                        key={item.id || index}
                        className="hover:bg-slate-50/60 transition"
                      >
                        <td className="p-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">
                            {item.displayName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.empId}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">
                            {item.storeName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.storeCode}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-600">
                          {item.checkInAt}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-600">
                          {item.checkOutAt}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">
                          {item.workedHours !== "-"
                            ? `${item.workedHours} ชม.`
                            : "-"}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600">
                          {Number(item.dailyWage || 0).toLocaleString()} ฿
                        </td>

                        {/* 📍 พิกัด GPS */}
                        <td className="p-3 text-center">
                          {item.checkInLat && item.checkInLon ? (
                            <a
                              href={`https://www.google.com/maps?q=${item.checkInLat},${item.checkInLon}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                            >
                              <MapPin size={12} /> แผนที่
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* 📸 รูปถ่ายเข้า-ออก (ปุ่ม Preview แบบหน้าจอปกติ + <img> แสดงตอนพิมพ์ PDF) */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* รูป Check-in */}
                            {hasCheckInImg ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: item.checkInPhoto,
                                      title: "รูปถ่าย Check-in เข้างาน",
                                      employeeName: item.displayName,
                                      dateStr: item.checkInAt,
                                    })
                                  }
                                  className="print-badge px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                                >
                                  <ImageIcon size={11} /> รูปเข้า
                                </button>
                                <img
                                  src={item.checkInPhoto}
                                  alt="Check-in"
                                  className="hidden print-img"
                                />
                              </>
                            ) : null}

                            {/* รูป Check-out */}
                            {hasCheckOutImg ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: item.checkOutPhoto,
                                      title: "รูปถ่าย Check-out เลิกงาน",
                                      employeeName: item.displayName,
                                      dateStr: item.checkOutAt,
                                    })
                                  }
                                  className="print-badge px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                                >
                                  <ImageIcon size={11} /> รูปออก
                                </button>
                                <img
                                  src={item.checkOutPhoto}
                                  alt="Check-out"
                                  className="hidden print-img"
                                />
                              </>
                            ) : null}

                            {!hasCheckInImg && !hasCheckOutImg && (
                              <span className="text-slate-300">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 🖼️ MODAL PREVIEW IMAGE POPUP */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-left">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  {previewImage.title}
                </h4>
                <p className="text-[11px] text-slate-500 font-bold">
                  {previewImage.employeeName} • {previewImage.dateStr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image Preview Area */}
            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[65vh] object-contain rounded-xl border border-slate-800 shadow-md"
              />
            </div>

            {/* Footer Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
              <a
                href={previewImage.url}
                target="_blank"
                download
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
              >
                <Download size={14} /> ดาวน์โหลดรูปต้นฉบับ
              </a>

              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
