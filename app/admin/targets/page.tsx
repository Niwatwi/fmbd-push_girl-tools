"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  Store,
  Save,
  Edit3,
  PlusCircle,
  RefreshCw,
  LayoutDashboard,
  Trash2,
  Search,
  Calculator,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getStoreTargets,
  saveStoreTargetAction,
  getAvailableStores,
  deleteStoreTargetAction,
} from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

export default function AdminTargetManagement() {
  const router = useRouter();
  const [targetsList, setTargetsList] = useState<any[]>([]);
  const [masterStores, setMasterStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // States สำหรับตั้งเป้าหมายระดับร้านค้า (Store Target)
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [targetSets, setTargetSets] = useState<number>(60); // เป้าหมายจำนวนชุด (default 60)
  const [targetRevenue, setTargetRevenue] = useState<number>(8760); // เป้าหมายยอดขาย (บาท)

  const [isEditing, setIsEditing] = useState(false);

  // 🔍 เช็คประเภทห้างจาก storeCode หรือ storeName
  const isBigC =
    storeCode.toLowerCase().includes("pgbc") ||
    storeCode.toLowerCase().includes("bigc") ||
    storeName.toLowerCase().includes("bigc");

  const isTops =
    storeCode.toLowerCase().includes("pgto") ||
    storeCode.toLowerCase().includes("tops") ||
    storeName.toLowerCase().includes("tops");

  // คำนวณจำนวนชิ้นอัตโนมัติ (1 แถม 1 = 2 ชิ้นต่อชุด)
  const totalPacksIncludeFree = targetSets * 2;

  // คำนวณมูลค่าประมาณการตาม Rule เมื่อเปลี่ยนจำนวนชุด
  const recalculateRevenue = (sets: number, isBigCStore: boolean) => {
    // BigC: ราคาเฉลี่ย เขียว (150) + ฟ้า (142) / 2 = 146 บาท/ชุด
    // Tops: ราคาเฉลี่ย เขียว (150) + ฟ้า (142) + ส้ม (100) / 3 = 130.67 บาท/ชุด
    const avgPrice = isBigCStore ? 146 : 130.67;
    return Math.round(sets * avgPrice);
  };

  const initPageData = async () => {
    setLoading(true);
    const storesRes = await getAvailableStores();
    const targetsRes = await getStoreTargets();

    if (storesRes.success) setMasterStores(storesRes.data);
    if (targetsRes.success) setTargetsList(targetsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    initPageData();
  }, []);

  // 🔄 เลือกสาขา -> คำนวณ Preset เป้าหมายอัตโนมัติ
  const handleStoreChange = (selectedCode: string) => {
    setStoreCode(selectedCode);
    const foundStore = masterStores.find((s) => s.store_code === selectedCode);
    const name = foundStore ? foundStore.store_name : "";
    setStoreName(name);

    const checkBigC =
      selectedCode.toLowerCase().includes("pgbc") ||
      selectedCode.toLowerCase().includes("bigc") ||
      name.toLowerCase().includes("bigc");

    setTargetSets(60);
    setTargetRevenue(recalculateRevenue(60, checkBigC));
  };

  const handleSetsChange = (sets: number) => {
    setTargetSets(sets);
    setTargetRevenue(recalculateRevenue(sets, isBigC));
  };

  const handleEditClick = (item: any) => {
    setIsEditing(true);
    setStoreCode(item.store_code);
    setStoreName(item.store_name);

    const isBigCStore =
      item.store_code?.toLowerCase().includes("pgbc") ||
      item.store_code?.toLowerCase().includes("bigc") ||
      item.store_name?.toLowerCase().includes("bigc");

    const green = Number(item.target_green90 || 0);
    const blue = Number(item.target_blue90 || 0);
    const orange = Number(item.target_orange100 || 0);

    const calculatedSets = isBigCStore
      ? green + blue || (item.target_packs ? Number(item.target_packs) / 2 : 60)
      : green + blue + orange ||
        (item.target_packs ? Number(item.target_packs) / 2 : 60);

    setTargetSets(calculatedSets);
    setTargetRevenue(
      Number(
        item.target_revenue || recalculateRevenue(calculatedSets, isBigCStore),
      ),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = async (code: string, name: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบเป้าหมาย?",
      text: `คุณต้องการลบเป้าหมายสาขา ${name} (${code}) ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await deleteStoreTargetAction(code);
      if (res.success) {
        Swal.fire(
          "ลบสำเร็จ",
          `ลบเป้าหมายสาขา ${name} เรียบร้อยแล้ว`,
          "success",
        );
        initPageData();
      } else {
        Swal.fire("เกิดข้อผิดพลาด", res.message, "error");
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setStoreCode("");
    setStoreName("");
    setTargetSets(60);
    setTargetRevenue(8760);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeCode) {
      Swal.fire(
        "ข้อมูลไม่ครบ",
        "กรุณาเลือกร้านค้าที่ต้องการตั้งเป้าหมายค่ะ",
        "warning",
      );
      return;
    }

    setIsSubmitting(true);

    // กระจายสัดส่วนลง SKU อัตโนมัติรองรับตาราง Database เดิม
    const greenSplit = isBigC
      ? Math.round(targetSets / 2)
      : Math.round(targetSets / 3);
    const blueSplit = isBigC
      ? targetSets - greenSplit
      : Math.round(targetSets / 3);
    const orangeSplit = isBigC ? 0 : targetSets - greenSplit - blueSplit;

    const res = await saveStoreTargetAction({
      store_code: storeCode,
      store_name: storeName,
      target_green90: greenSplit,
      target_blue90: blueSplit,
      target_orange100: orangeSplit,
      price_green90: 150,
      price_blue90: 142,
      price_orange100: 100,
    });
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        title: "บันทึกสำเร็จ",
        text: `ตั้งเป้าหมายสาขา ${storeName} เรียบร้อยแล้วค่ะ`,
        icon: "success",
        confirmButtonColor: "#1e3a8a",
      });
      resetForm();
      initPageData();
    } else {
      Swal.fire("เกิดข้อผิดพลาด", res.message, "error");
    }
  };

  const filteredTargets = targetsList.filter(
    (item) =>
      item.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.store_code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* HEADER TOP BAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <Target size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-400 block tracking-wider">
                BACKEND MANAGEMENT
              </span>
              <span className="text-sm font-black text-slate-800 block -mt-0.5">
                ระบบจัดการ Target ประจำสาขา (Store Target Management)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <ArrowLeft size={14} /> หน้าหลัก Admin
            </Link>

            <button
              onClick={() => router.push("/customer-portal")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <LayoutDashboard size={14} /> ดูรีพอร์ตรวม
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📋 ฝั่งซ้าย: ฟอร์มตั้งเป้าหมายประจำสาขา */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-fit space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              {isEditing ? (
                <Edit3 size={16} className="text-amber-500" />
              ) : (
                <PlusCircle size={16} className="text-blue-600" />
              )}
              {isEditing ? "แก้ไขเป้าหมายสาขา" : "เพิ่มเป้าหมายสาขาใหม่"}
            </h3>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-md font-bold transition cursor-pointer"
              >
                ยกเลิกแก้ไข
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* เลือกร้านค้า */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                เลือกร้านค้าปฏิบัติงาน
              </label>
              <div className="relative">
                <Store
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={14}
                />
                <select
                  value={storeCode}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  disabled={isEditing}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">-- กรุณาเลือกร้านค้า --</option>
                  {masterStores.map((store) => (
                    <option key={store.id} value={store.store_code}>
                      {store.store_name} ({store.company_tag})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* แสดง Rule Badge ตามประเภทห้างที่เลือก */}
            {storeCode && (
              <div className="p-2.5 rounded-xl text-[11px] font-medium border transition-all">
                {isBigC ? (
                  <div className="bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-2 p-1.5 rounded-lg">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-600 shrink-0"
                    />
                    <div>
                      <span className="font-bold block">
                        เกณฑ์ BigC Target:
                      </span>
                      <span>
                        นับรวมเฉพาะ <b>สีเขียว + สีฟ้า</b> (เป้า 60 ชุด/วัน)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 text-blue-800 border-blue-200 flex items-center gap-2 p-1.5 rounded-lg">
                    <CheckCircle2
                      size={16}
                      className="text-blue-600 shrink-0"
                    />
                    <div>
                      <span className="font-bold block">
                        เกณฑ์ Tops Target:
                      </span>
                      <span>
                        นับรวม <b>สีเขียว + สีฟ้า + สีส้ม</b> (เป้า 60 ชุด/วัน)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* กำหนดเป้าหมายระดับร้านค้า (Store Target Inputs) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-black text-slate-700 block">
                🎯 กำหนดเป้าหมายรวมประจำสาขา (Store Target)
              </span>

              {/* จำนวนชุดเป้าหมาย */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">
                  เป้าหมายการขายประจำสาขา (จำนวนชุด)
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetSets}
                  onChange={(e) => handleSetsChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-black text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* เป้าหมายยอดขาย (บาท) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">
                  เป้าหมายมูลค่าขายรวม (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-black text-emerald-600 bg-emerald-50/30 focus:bg-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* กล่องสรุปผลคำนวณอัตโนมัติ */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 text-[11px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Calculator size={13} /> สรุปยอดเป้าหมายสาขา
                </div>
                {storeCode && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      isBigC
                        ? "bg-emerald-900 text-emerald-300 border border-emerald-700"
                        : "bg-blue-900 text-blue-300 border border-blue-700"
                    }`}
                  >
                    {isBigC ? "BigC Rule" : "Tops Rule"}
                  </span>
                )}
              </div>

              <div className="flex justify-between font-bold">
                <span className="text-slate-400">เป้าหมายยอดขาย:</span>
                <span className="text-amber-300 font-mono text-xs">
                  {targetSets.toLocaleString()} ชุด / วัน
                </span>
              </div>

              <div className="flex justify-between font-bold">
                <span className="text-slate-400">
                  คิดเป็นจำนวนชิ้น (1 แถม 1):
                </span>
                <span className="text-white font-mono">
                  {totalPacksIncludeFree.toLocaleString()} ชิ้น
                </span>
              </div>

              <div className="flex justify-between font-bold">
                <span className="text-slate-400">รวมเป้าหมายมูลค่าขาย:</span>
                <span className="text-emerald-400 font-mono font-black text-xs">
                  {targetRevenue.toLocaleString()} ฿
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-xl text-xs font-black text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                isEditing
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isEditing
                ? "อัปเดตการแก้ไขเป้าหมาย"
                : "บันทึกและเปิดเป้าหมายสาขา"}
            </button>
          </form>
        </div>

        {/* 📊 ฝั่งขวา: รายการตารางเป้าหมายปัจจุบัน */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                รายการเป้าหมายแต่ละร้านค้าในระบบปัจจุบัน
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                สรุปเป้าหมายระดับสาขา (Store Target) พร้อมจำนวนชิ้นโปรโมชัน 1
                แถม 1
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search
                  className="absolute left-2.5 top-2.5 text-slate-400"
                  size={12}
                />
                <input
                  type="text"
                  placeholder="ค้นหาสาขา..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border rounded-xl text-[11px] bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium"
                />
              </div>

              <button
                onClick={initPageData}
                className={`p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition cursor-pointer ${
                  loading ? "animate-spin" : ""
                }`}
              >
                <RefreshCw size={14} className="text-slate-500" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                กำลังดึงข้อมูลจากตารางระบบ...
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                {searchTerm
                  ? "ไม่พบข้อมูลเป้าหมายที่ค้นหา"
                  : "ยังไม่มีการกำหนดเป้าหมายสาขาใดๆ ในระบบ"}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3 font-bold">สาขา / รหัส</th>
                    <th className="p-3 font-bold text-center">ประเภทเกณฑ์</th>
                    <th className="p-3 font-bold text-center">
                      เป้าหมาย (ชุด)
                    </th>
                    <th className="p-3 font-bold text-center">
                      เป้าหมาย (ชิ้น)
                    </th>
                    <th className="p-3 font-bold text-right">เป้ารวม (บาท)</th>
                    <th className="p-3 font-bold text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTargets.map((item) => {
                    const isRowBigC =
                      item.store_code?.toLowerCase().includes("pgbc") ||
                      item.store_code?.toLowerCase().includes("bigc") ||
                      item.store_name?.toLowerCase().includes("bigc");

                    const greenVal = Number(item.target_green90 || 0);
                    const blueVal = Number(item.target_blue90 || 0);
                    const orangeVal = Number(item.target_orange100 || 0);

                    // คำนวณจำนวนชุดเป้าหมายรวม
                    const rowTargetSets = isRowBigC
                      ? greenVal + blueVal ||
                        (item.target_packs ? Number(item.target_packs) / 2 : 60)
                      : greenVal + blueVal + orangeVal ||
                        (item.target_packs
                          ? Number(item.target_packs) / 2
                          : 60);

                    const rowTargetPacks = rowTargetSets * 2;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/60 transition"
                      >
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">
                            {item.store_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.store_code}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isRowBigC
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {isRowBigC ? "BigC Rule" : "Tops Rule"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-black text-slate-800">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                            {rowTargetSets} ชุด
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-600">
                          {rowTargetPacks.toLocaleString()} ชิ้น
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600">
                          {Number(item.target_revenue || 0).toLocaleString()} ฿
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-bold transition cursor-pointer"
                              title="แก้ไขเป้า"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteClick(
                                  item.store_code,
                                  item.store_name,
                                )
                              }
                              className="p-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 font-bold transition cursor-pointer"
                              title="ลบเป้า"
                            >
                              <Trash2 size={12} />
                            </button>
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
      </main>
    </div>
  );
}
