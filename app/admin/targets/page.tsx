"use client";

import React, { useState, useEffect } from "react";
import {
  Target,
  Store,
  Coins,
  ShoppingBag,
  Save,
  Edit3,
  PlusCircle,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getStoreTargets,
  saveStoreTargetAction,
  getAvailableStores,
} from "../../dashboard/actions";
import { useRouter } from "next/navigation";

export default function AdminTargetManagement() {
  const router = useRouter();
  const [targetsList, setTargetsList] = useState<any[]>([]);
  const [masterStores, setMasterStores] = useState<any[]>([]); // คลังรายชื่อร้านค้าจากตาราง pg_stores
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States สำหรับข้อมูลในฟอร์ม
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [targetPacks, setTargetPacks] = useState<number>(100);
  const [targetRevenue, setTargetRevenue] = useState<number>(15000);
  const [isEditing, setIsEditing] = useState(false);

  // โหลดข้อมูล Master Stores และ Target ทั้งหมดเมื่อเข้าหน้าจอ
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

  // เมื่อแอดมินเลือกเปลี่ยนร้านค้าใน Dropdown
  const handleStoreChange = (selectedCode: string) => {
    setStoreCode(selectedCode);
    const foundStore = masterStores.find((s) => s.store_code === selectedCode);
    if (foundStore) {
      setStoreName(foundStore.store_name);
    } else {
      setStoreName("");
    }
  };

  // ดึงข้อมูลแถวในตารางขึ้นมาพิมพ์แก้ไขบนฟอร์ม
  const handleEditClick = (item: any) => {
    setIsEditing(true);
    setStoreCode(item.store_code);
    setStoreName(item.store_name);
    setTargetPacks(Number(item.target_packs));
    setTargetRevenue(Number(item.target_revenue));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // เคลียร์ค่าเริ่มต้นฟอร์ม
  const resetForm = () => {
    setIsEditing(false);
    setStoreCode("");
    setStoreName("");
    setTargetPacks(100);
    setTargetRevenue(15000);
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
    const res = await saveStoreTargetAction({
      store_code: storeCode,
      store_name: storeName,
      target_packs: targetPacks,
      target_revenue: targetRevenue,
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
      initPageData(); // โหลดตารางสรุปใหม่
    } else {
      Swal.fire("เกิดข้อผิดพลาด", res.message, "error");
    }
  };

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
                ระบบจัดการ Target ประจำสาขา
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/customer-portal")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition"
          >
            <LayoutDashboard size={14} /> กลับหน้าดูรีพอร์ตรวม
          </button>
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
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded-md font-bold transition"
              >
                ยกเลิกแก้ไข
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* เลือกร้านค้าจากฐานข้อมูลตัวเลือก (Dropdown แทนช่องกรอกเดิม) */}
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

            {/* แสดงรหัสสาขาที่เลือกแบบ Auto-lock เพื่อความสวยงามเป็นทางการ */}
            {storeCode && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] space-y-0.5">
                <span className="text-slate-400 font-bold block">
                  รหัสสาขาที่ระบบบันทึก (Store Code)
                </span>
                <span className="font-mono font-bold text-slate-700 block text-xs">
                  {storeCode}
                </span>
              </div>
            )}

            {/* เป้าหมายห่อ */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                เป้าหมายยอดจำหน่ายรวม (ห่อ / แพ็ค)
              </label>
              <div className="relative">
                <ShoppingBag
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={14}
                />
                <input
                  type="number"
                  min="0"
                  value={targetPacks}
                  onChange={(e) => setTargetPacks(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-mono font-bold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* เป้าหมายบาท */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                เป้าหมายมูลค่าขายรวม (บาท)
              </label>
              <div className="relative">
                <Coins
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={14}
                />
                <input
                  type="number"
                  min="0"
                  value={targetRevenue}
                  onChange={(e) => setTargetRevenue(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-mono font-bold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 rounded-xl text-xs font-black text-white shadow-xs transition flex items-center justify-center gap-2 ${isEditing ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"} disabled:opacity-50`}
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

        {/* 📊 ฝั่งขวา: รายการตารางแสดงผลเป้าหมายปัจจุบันทั้งหมดในระบบ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center text-left">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                รายการเป้าหมายแต่ละร้านค้าในระบบปัจจุบัน
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                ข้อมูลอัปเดตสัมพันธ์กับตารางผูกสินค้าอัตโนมัติ
              </p>
            </div>
            <button
              onClick={initPageData}
              className={`p-2 rounded-full hover:bg-slate-100 transition ${loading ? "animate-spin" : ""}`}
            >
              <RefreshCw size={14} className="text-slate-400" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                กำลังดึงข้อมูลจากตารางระบบ...
              </div>
            ) : targetsList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-bold">
                ยังไม่มีการกำหนดเป้าหมายสาขาใดๆ ในระบบ
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3.5 font-bold">รหัสสาขา</th>
                    <th className="p-3.5 font-bold">ชื่อจุดปฏิบัติงาน</th>
                    <th className="p-3.5 font-bold text-center">
                      เป้าหมายขาย (ห่อ)
                    </th>
                    <th className="p-3.5 font-bold text-center">
                      เป้ายอดขาย (บาท)
                    </th>
                    <th className="p-3.5 font-bold text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {targetsList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition"
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-500">
                        {item.store_code}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {item.store_name}
                      </td>
                      <td className="p-3.5 text-center font-bold text-blue-600 font-mono">
                        {Number(item.target_packs).toLocaleString()} ห่อ
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 font-mono">
                        {Number(item.target_revenue).toLocaleString()} ฿
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-black text-[10px] transition"
                        >
                          <Edit3 size={10} /> แก้ไขเป้า
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
