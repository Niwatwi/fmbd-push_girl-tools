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
  ArrowLeft,
  CheckCircle2,
  Tag,
  DollarSign,
  Package,
  Plus,
  X,
  Barcode,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getStoreTargets,
  saveStoreTargetAction,
  getAvailableStores,
  deleteStoreTargetAction,
  getProducts, // ✅ นำเข้า getProducts จาก actions จริง
} from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

// 🔍 Helper เช็คว่าเป็น BigC หรือไม่
const checkIsBigC = (code: string = "", name: string = "") => {
  const cleanCode = code.toLowerCase().replace(/\s+/g, "");
  const cleanName = name.toLowerCase().replace(/\s+/g, "");
  return (
    cleanCode.includes("pgbc") ||
    cleanCode.includes("bigc") ||
    cleanName.includes("bigc")
  );
};

// ข้อมูลจำลองรอบโปรโมชั่น
const FALLBACK_PROMOTIONS = [
  { id: 1, title: "โปรโมชั่นประจำเดือน กันยายน 2026 (1แถม1)" },
  { id: 2, title: "โปรโมชั่นเทศกาลพิเศษ ตลาดหน้าร้าน" },
];

export default function AdminTargetManagement() {
  const router = useRouter();
  const [targetsList, setTargetsList] = useState<any[]>([]);
  const [masterStores, setMasterStores] = useState<any[]>([]);
  const [promotions] = useState<any[]>(FALLBACK_PROMOTIONS);
  const [productsList, setProductsList] = useState<any[]>([]); // 📦 เก็บรายการสินค้าจาก Database
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // States หลัก
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [promotionName, setPromotionName] = useState("");

  // 🔄 State แถวสินค้า รองรับระบบเลือกแบบ Cascading (Company -> Category -> Brand -> Product)
  const [productRows, setProductRows] = useState<
    Array<{
      company: string;
      category: string;
      brand: string;
      productId: string;
      target: number;
      price: number;
    }>
  >([
    {
      company: "",
      category: "",
      brand: "",
      productId: "",
      target: 30,
      price: 150,
    },
    {
      company: "",
      category: "",
      brand: "",
      productId: "",
      target: 30,
      price: 142,
    },
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const isBigC = checkIsBigC(storeCode, storeName);

  const targetSetsCounted = isBigC
    ? (productRows[0]?.target || 0) + (productRows[1]?.target || 0)
    : productRows.reduce((sum, row) => sum + Number(row.target || 0), 0);

  const totalCalculatedRevenue = productRows.reduce(
    (sum, row) => sum + Number(row.target || 0) * Number(row.price || 0),
    0,
  );

  const totalPacksIncludeFree = targetSetsCounted * 2;

  // 🔄 ดึงข้อมูลร้านค้า, สินค้า และเป้าหมายจาก Database
  const initPageData = async () => {
    setLoading(true);
    try {
      const [storesRes, targetsRes, productsRes] = await Promise.all([
        getAvailableStores(),
        getStoreTargets(),
        getProducts(), // 🚀 ดึงข้อมูลสินค้าจริงจากฐานข้อมูล
      ]);

      if (storesRes.success) setMasterStores(storesRes.data);
      if (targetsRes.success) setTargetsList(targetsRes.data);
      if (productsRes.success && productsRes.data) {
        setProductsList(productsRes.data);
      }
    } catch (error) {
      console.error("Error loading page data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initPageData();
  }, []);

  const handleStoreChange = (selectedCode: string) => {
    setStoreCode(selectedCode);
    const foundStore = masterStores.find((s) => s.store_code === selectedCode);
    setStoreName(foundStore ? foundStore.store_name : "");
  };

  const handlePromotionChange = (promoId: string) => {
    setPromotionId(promoId);
    const found = promotions.find((p) => String(p.id) === String(promoId));
    setPromotionName(found ? found.title || found.name || "" : "");
  };

  const handleAddProductRow = () => {
    setProductRows([
      ...productRows,
      {
        company: "",
        category: "",
        brand: "",
        productId: "",
        target: 20,
        price: 100,
      },
    ]);
  };

  const handleRemoveProductRow = (index: number) => {
    if (productRows.length === 1) {
      Swal.fire("แจ้งเตือน", "ต้องมีสินค้าอย่างน้อย 1 รายการค่ะ", "warning");
      return;
    }
    setProductRows(productRows.filter((_, i) => i !== index));
  };

  const handleProductRowChange = (index: number, field: string, value: any) => {
    const updated = [...productRows];
    const currentRow = updated[index];

    if (field === "company") {
      currentRow.company = value;
      currentRow.category = "";
      currentRow.brand = "";
      currentRow.productId = "";
      currentRow.price = 100;
    } else if (field === "category") {
      currentRow.category = value;
      currentRow.brand = "";
      currentRow.productId = "";
      currentRow.price = 100;
    } else if (field === "brand") {
      currentRow.brand = value;
      currentRow.productId = "";
      currentRow.price = 100;
    } else if (field === "productId") {
      currentRow.productId = value;
      const selectedProd = productsList.find(
        (p) => String(p.id) === String(value),
      );
      if (selectedProd) {
        currentRow.price =
          selectedProd.default_price || selectedProd.price || 100;
      }
    } else {
      (currentRow as any)[field] = value;
    }

    setProductRows(updated);
  };

  const handleEditClick = (item: any) => {
    setIsEditing(true);
    setEditId(item.id || null);
    setStoreCode(item.store_code || "");
    setStoreName(item.store_name || "");
    setPromotionId(item.promotion_id || "");
    setPromotionName(item.promotion_name || "");

    const loadedRows: Array<{
      company: string;
      category: string;
      brand: string;
      productId: string;
      target: number;
      price: number;
    }> = [];

    const fields = [
      { prod: item.product1_id, target: item.target1, price: item.price1 },
      { prod: item.product2_id, target: item.target2, price: item.price2 },
      { prod: item.product3_id, target: item.target3, price: item.price3 },
    ];

    fields.forEach((f) => {
      if (f.prod) {
        const foundProd = productsList.find(
          (p) => String(p.id) === String(f.prod),
        );
        loadedRows.push({
          company: foundProd ? foundProd.company : "",
          category: foundProd ? foundProd.category : "",
          brand: foundProd ? foundProd.brand : "",
          productId: String(f.prod),
          target: Number(f.target || 0),
          price: Number(f.price || 150),
        });
      }
    });

    if (loadedRows.length > 0) {
      setProductRows(loadedRows);
    }

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
    setEditId(null);
    setStoreCode("");
    setStoreName("");
    setPromotionId("");
    setPromotionName("");
    setProductRows([
      {
        company: "",
        category: "",
        brand: "",
        productId: "",
        target: 30,
        price: 150,
      },
      {
        company: "",
        category: "",
        brand: "",
        productId: "",
        target: 30,
        price: 142,
      },
    ]);
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
    const payload = {
      ...(editId ? { id: editId } : {}),
      store_code: storeCode,
      store_name: storeName,
      promotion_id: promotionId || null,
      promotion_name: promotionName || null,
      product1_id: productRows[0]?.productId || null,
      target1: productRows[0]?.target || 0,
      price1: productRows[0]?.price || 0,
      product2_id: productRows[1]?.productId || null,
      target2: productRows[1]?.target || 0,
      price2: productRows[1]?.price || 0,
      product3_id: productRows[2]?.productId || null,
      target3: productRows[2]?.target || 0,
      price3: productRows[2]?.price || 0,
    };

    const res = await saveStoreTargetAction(payload as any);
    setIsSubmitting(false);

    if (res.success) {
      Swal.fire({
        title: "บันทึกสำเร็จ",
        text: `ตั้งเป้าหมายและผูกสินค้าสำหรับสาขา ${storeName} เรียบร้อยแล้วค่ะ`,
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
      item.store_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.promotion_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-blue-800 text-slate-800 font-sans antialiased">
      {/* HEADER TOP BAR */}
      <nav className="bg-green-400 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <Target size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-red-600 block tracking-wider">
                BACKEND MANAGEMENT
              </span>
              <span className="text-sm font-black text-slate-800 block -mt-0.5">
                ระบบจัดการ Target และเลือกสินค้าจากตาราง Products
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
        {/* 📋 ฝั่งซ้าย: ฟอร์มตั้งเป้าหมายและเลือกสินค้า */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-fit space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              {isEditing ? (
                <Edit3 size={16} className="text-amber-500" />
              ) : (
                <PlusCircle size={16} className="text-blue-600" />
              )}
              {isEditing ? "แก้ไขเป้าหมายและสินค้า" : "ตั้งค่าเป้าหมายสาขาใหม่"}
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
                1. เลือกร้านค้าปฏิบัติงาน
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
                  required
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

            {/* เลือกรอบโปรโมชั่น */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                2. รอบโปรโมชั่น / ธีมการจัดรายการ (ถ้ามี)
              </label>
              <div className="relative">
                <Tag
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={14}
                />
                <select
                  value={promotionId}
                  onChange={(e) => handlePromotionChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="">-- ใช้ราคาและเป้ามาตรฐานทั่วไป --</option>
                  {promotions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                      <span>นับรวมเฉพาะรายการที่ 1 และ 2</span>
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
                      <span>นับรวมทุกรายการสินค้า</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ส่วนเลือกสินค้าแบบเรียงลำดับ (Company -> Category -> Brand -> Descriptions + Barcode อัตโนมัติ) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                  <Package size={13} className="text-blue-600" />
                  3. เลือกสินค้าจากตาราง Products (Company $\rightarrow$
                  Category $\rightarrow$ Brand)
                </span>
                <button
                  type="button"
                  onClick={handleAddProductRow}
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  <Plus size={12} /> เพิ่มสินค้า
                </button>
              </div>

              <div className="space-y-3">
                {productRows.map((row, index) => {
                  const availableCompanies = Array.from(
                    new Set(productsList.map((p) => p.company).filter(Boolean)),
                  );
                  const availableCategories = Array.from(
                    new Set(
                      productsList
                        .filter(
                          (p) => !row.company || p.company === row.company,
                        )
                        .map((p) => p.category)
                        .filter(Boolean),
                    ),
                  );
                  const availableBrands = Array.from(
                    new Set(
                      productsList
                        .filter(
                          (p) =>
                            (!row.company || p.company === row.company) &&
                            (!row.category || p.category === row.category),
                        )
                        .map((p) => p.brand)
                        .filter(Boolean),
                    ),
                  );
                  const availableProducts = productsList.filter(
                    (p) =>
                      (!row.company || p.company === row.company) &&
                      (!row.category || p.category === row.category) &&
                      (!row.brand || p.brand === row.brand),
                  );

                  const selectedProductObj = productsList.find(
                    (p) => String(p.id) === String(row.productId),
                  );
                  const displayBarcode = selectedProductObj
                    ? selectedProductObj.barcode
                    : "-";

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          สินค้าที่ {index + 1}
                        </span>
                        {productRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProductRow(index)}
                            className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                            title="ลบสินค้ารายการนี้"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* 1. เลือก Company */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                          บริษัท (Company)
                        </label>
                        <select
                          value={row.company}
                          onChange={(e) =>
                            handleProductRowChange(
                              index,
                              "company",
                              e.target.value,
                            )
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-800"
                        >
                          <option value="">-- เลือกบริษัท --</option>
                          {availableCompanies.map((comp, idx) => (
                            <option key={idx} value={comp}>
                              {comp}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. เลือก Category */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                          หมวดหมู่ (Category)
                        </label>
                        <select
                          value={row.category}
                          onChange={(e) =>
                            handleProductRowChange(
                              index,
                              "category",
                              e.target.value,
                            )
                          }
                          disabled={!row.company}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">-- เลือกหมวดหมู่ --</option>
                          {availableCategories.map((cat, idx) => (
                            <option key={idx} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 3. เลือก Brand */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                          แบรนด์ (Brand)
                        </label>
                        <select
                          value={row.brand}
                          onChange={(e) =>
                            handleProductRowChange(
                              index,
                              "brand",
                              e.target.value,
                            )
                          }
                          disabled={!row.category}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">-- เลือกแบรนด์ --</option>
                          {availableBrands.map((b, idx) => (
                            <option key={idx} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 4. เลือก Descriptions (ชื่อสินค้า) */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                          รายการสินค้า (Descriptions)
                        </label>
                        <select
                          value={row.productId}
                          onChange={(e) =>
                            handleProductRowChange(
                              index,
                              "productId",
                              e.target.value,
                            )
                          }
                          disabled={!row.brand}
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">-- เลือกสินค้า --</option>
                          {availableProducts.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              [{prod.code || "N/A"}]{" "}
                              {prod.descriptions || prod.name} (
                              {prod.pack_name || "Standard"})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* แสดง Barcode อัตโนมัติ */}
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                          <Barcode size={13} className="text-blue-600" />{" "}
                          Barcode:
                        </span>
                        <span className="text-xs font-mono font-black text-slate-700">
                          {displayBarcode}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[9px] text-slate-500 block">
                            เป้า (ชุด/วัน)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={row.target}
                            onChange={(e) =>
                              handleProductRowChange(
                                index,
                                "target",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold text-slate-800 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block">
                            ราคาขายต่อหน่วย (บาท)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={row.price}
                            onChange={(e) =>
                              handleProductRowChange(
                                index,
                                "price",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold text-blue-700 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* กล่องสรุปผลคำนวณ */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 text-[11px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <DollarSign size={13} /> สรุปเป้าหมาย & รายได้น้องเชียร์
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
                <span className="text-slate-400">ยอดนับ Target หลัก:</span>
                <span
                  className={`font-mono text-xs font-black ${
                    targetSetsCounted >= 60
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {targetSetsCounted.toLocaleString()} ชุด
                </span>
              </div>

              <div className="flex justify-between font-bold">
                <span className="text-slate-400">รวมชิ้น (คิด 1 แถม 1):</span>
                <span className="text-white font-mono">
                  {totalPacksIncludeFree.toLocaleString()} ชิ้น
                </span>
              </div>

              <div className="flex justify-between font-bold pt-1 border-t border-slate-800/60">
                <span className="text-slate-300">เป้าหมายมูลค่าขายรวม:</span>
                <span className="text-emerald-400 font-mono font-black text-xs">
                  {totalCalculatedRevenue.toLocaleString()} ฿
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
                ? "อัปเดตเป้าหมายและสินค้า"
                : "บันทึกและเปิดใช้งานเป้าหมายสาขา"}
            </button>
          </form>
        </div>

        {/* 📊 ฝั่งขวา: ตารางแสดงรายการเป้าหมายปัจจุบัน */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                รายการเป้าหมายและการผูกสินค้าในระบบ
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                ข้อมูลสินค้า เป้าหมาย และราคาที่ดึงจากตาราง products
                สำหรับคำนวณผลงาน
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
                  placeholder="ค้นหาสาขา / โปรโมชั่น..."
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
                กำลังดึงข้อมูลจากระบบ...
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
                    <th className="p-3 font-bold">สาขา / ธีมโปรโมชั่น</th>
                    <th className="p-3 font-bold text-center">ประเภทเกณฑ์</th>
                    <th className="p-3 font-bold text-center">
                      เป้าหมาย (ชุด)
                    </th>
                    <th className="p-3 font-bold text-center">
                      ราคาต่อหน่วย (฿)
                    </th>
                    <th className="p-3 font-bold text-right">เป้ารวม (บาท)</th>
                    <th className="p-3 font-bold text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTargets.map((item) => {
                    const isRowBigC = checkIsBigC(
                      item.store_code,
                      item.store_name,
                    );

                    const t1 = Number(item.target1 || 0);
                    const t2 = Number(item.target2 || 0);
                    const t3 = Number(item.target3 || 0);

                    const p1 = Number(item.price1 || 150);
                    const p2 = Number(item.price2 || 142);
                    const p3 = Number(item.price3 || 100);

                    const rowCalculatedRevenue = t1 * p1 + t2 * p2 + t3 * p3;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/60 transition"
                      >
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">
                            {item.store_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block">
                            รหัส: {item.store_code}
                          </span>
                          {item.promotion_name && (
                            <span className="inline-block mt-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-200">
                              🏷️ {item.promotion_name}
                            </span>
                          )}
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
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {t1} / {t2} / {t3} ชุด
                        </td>
                        <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                          {p1} / {p2} / {p3} ฿
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600 text-sm">
                          {rowCalculatedRevenue.toLocaleString()} ฿
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-bold transition cursor-pointer"
                              title="แก้ไขเป้าและสินค้า"
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
