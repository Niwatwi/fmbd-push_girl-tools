"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import Link from "next/link";
import { ArrowLeft, Film, Target } from "lucide-react";
import {
  getAllPromotionsAction,
  savePromotionAction,
  deletePromotionAction,
  getStoresAction,
  getCompaniesAction,
  getCategoriesAction,
  getProductsByCompanyAndCategoryAction,
  getProductByBarcodeForPromotionAction,
  PromotionCommissionRules,
  PromotionConfig,
  PromotionGiftItem,
  PromotionItem,
  Product,
} from "./actions";

interface ExtendedPromotionItem extends PromotionItem {
  company?: string;
  category?: string;
  company_type?: string;
}

interface StoreItem {
  id: string | number;
  store_name: string;
  store_code: string;
  account?: string;
  company_tag?: string;
}

const DEFAULT_COMMISSION_RULES: PromotionCommissionRules = {
  mode: "TARGET_PERCENT",
  tiers: [
    { min_credited_qty: 30, achievement_percent: 80, payout: 100 },
    { min_credited_qty: 40, achievement_percent: 100, payout: 200 },
  ],
  step: {
    start_qty: 40,
    step_qty: 10,
    start_percent: 100,
    step_percent: 25,
    payout: 100,
  },
};

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState<PromotionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // Form States
  const [targetType, setTargetType] = useState<
    "COMPANY_TAG" | "STORE_CODE" | "ALL"
  >("COMPANY_TAG");
  const [targetValue, setTargetValue] = useState("");
  const [selectedStoreName, setSelectedStoreName] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [specialTierText, setSpecialTierText] = useState("");
  const [staffGroup, setStaffGroup] = useState<string>("ALL");
  const [trackGiftInventory, setTrackGiftInventory] = useState(false);
  const [giftItems, setGiftItems] = useState<PromotionGiftItem[]>([]);
  const [calculationPeriod, setCalculationPeriod] = useState<
    "DAILY" | "MONTHLY"
  >("DAILY");
  const [commissionRules, setCommissionRules] =
    useState<PromotionCommissionRules>(DEFAULT_COMMISSION_RULES);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<ExtendedPromotionItem[]>([]);
  const [barcodeQueries, setBarcodeQueries] = useState<Record<number, string>>(
    {},
  );

  // Master Data States
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  // Cascading Options Per Item Row Index
  const [rowCategories, setRowCategories] = useState<{
    [key: number]: string[];
  }>({});
  const [rowProducts, setRowProducts] = useState<{ [key: number]: Product[] }>(
    {},
  );

  useEffect(() => {
    fetchPromotions();
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    const storeRes = await getStoresAction();
    if (storeRes.success && storeRes.stores) {
      setStores(storeRes.stores);
    }

    const companyRes = await getCompaniesAction();
    if (companyRes.success && companyRes.companies) {
      setCompanies(companyRes.companies);
    }
  };

  const fetchPromotions = async () => {
    setLoading(true);
    const res = await getAllPromotionsAction();
    if (res.success) {
      setPromotions((res.promotions as unknown as PromotionConfig[]) || []);
    }
    setLoading(false);
  };

  const handleStoreNameChange = (storeName: string) => {
    setSelectedStoreName(storeName);
    const matchedStore = stores.find((s) => s.store_name === storeName);
    setTargetValue(matchedStore ? matchedStore.store_code : "");
  };

  const handleCompanyChange = async (index: number, company: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              company,
              category: "",
              product_code: "",
              product_name: "",
              barcode: "",
              company_type: "",
              item_scope: "OUR",
            }
          : item,
      ),
    );

    setRowCategories((prev) => ({ ...prev, [index]: [] }));
    setRowProducts((prev) => ({ ...prev, [index]: [] }));

    if (!company) return;

    const res = await getCategoriesAction(company);
    if (res.success && res.categories) {
      setRowCategories((prev) => ({ ...prev, [index]: res.categories }));
    }
  };

  const handleCategoryChange = async (index: number, category: string) => {
    const currentCompany = items[index]?.company;

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              category,
              product_code: "",
              product_name: "",
              barcode: "",
              company_type: "",
              item_scope: "OUR",
            }
          : item,
      ),
    );

    setRowProducts((prev) => ({ ...prev, [index]: [] }));

    if (!category || !currentCompany) return;

    const res = await getProductsByCompanyAndCategoryAction(
      currentCompany,
      category,
    );
    if (res.success && res.products) {
      setRowProducts((prev) => ({ ...prev, [index]: res.products }));
    }
  };

  const handleDescriptionChange = (index: number, description: string) => {
    const matchedProduct = rowProducts[index]?.find(
      (p) => p.descriptions === description,
    );

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              product_code: String(
                matchedProduct?.code ?? matchedProduct?.id ?? "",
              ),
              product_name: description,
              barcode: matchedProduct?.barcode || "",
              company_type: matchedProduct?.company_type || "",
              item_scope:
                String(matchedProduct?.company_type || "")
                  .trim()
                  .toLowerCase() === "competitor"
                  ? "COMPETITOR"
                  : "OUR",
            }
          : item,
      ),
    );
  };

  const handleEdit = (promo: PromotionConfig) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setEditingId(promo.id);
    const type = promo.target_type || "COMPANY_TAG";
    setTargetType(type);
    const savedValue = promo.target_value || "";
    const matchedAccount =
      type === "COMPANY_TAG"
        ? stores.find(
            (s) =>
              String(s.account || "")
                .trim()
                .toLowerCase() === savedValue.trim().toLowerCase(),
          )?.account
        : undefined;
    setTargetValue(matchedAccount?.trim() || savedValue);

    if (type === "STORE_CODE") {
      const matched = stores.find((s) => s.store_code === promo.target_value);
      setSelectedStoreName(matched ? matched.store_name : "");
    } else {
      setSelectedStoreName("");
    }

    setCampaignTitle(promo.campaign_title || "");
    setStartDate(promo.start_date?.slice(0, 10) || "");
    setEndDate(promo.end_date?.slice(0, 10) || "");
    setSpecialTierText(promo.special_tier_text || "");
    setStaffGroup(promo.staff_group || "ALL");
    setTrackGiftInventory(Boolean(promo.track_gift_inventory));
    setGiftItems(promo.gift_items || []);
    setCalculationPeriod(promo.calculation_period || "DAILY");
    setCommissionRules(promo.commission_rules || DEFAULT_COMMISSION_RULES);
    setIsActive(promo.is_active);

    setItems(
      promo.items?.map((item) => ({
        id: item.id,
        product_code: String(item.product_code || ""),
        product_name: item.products?.descriptions || item.product_name || "",
        barcode: item.products?.barcode || item.barcode || "",
        company_type: item.products?.company_type || "",
        item_scope:
          String(item.products?.company_type || "")
            .trim()
            .toLowerCase() === "competitor"
            ? "COMPETITOR"
            : item.item_scope || "OUR",
        target_qty: item.target_qty ?? 0,
        credit_factor: item.credit_factor ?? 1,
        price: String(item.price || ""),
        condition: item.condition || "",
      })) || [],
    );
  };

  const handleResetForm = () => {
    setEditingId(null);
    setTargetType("COMPANY_TAG");
    setTargetValue("");
    setSelectedStoreName("");
    setCampaignTitle("");
    setStartDate("");
    setEndDate("");
    setSpecialTierText("");
    setStaffGroup("ALL");
    setTrackGiftInventory(false);
    setGiftItems([]);
    setCalculationPeriod("DAILY");
    setCommissionRules(DEFAULT_COMMISSION_RULES);
    setIsActive(true);
    setItems([]);
    setBarcodeQueries({});
    setRowCategories({});
    setRowProducts({});
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        company: "",
        category: "",
        product_code: "",
        product_name: "",
        barcode: "",
        item_scope: "OUR",
        target_qty: 0,
        credit_factor: 1,
        price: "",
        condition: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setRowCategories((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setRowProducts((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleItemChange = (
    index: number,
    field: keyof ExtendedPromotionItem,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleBarcodeSearch = async (index: number) => {
    const barcode = String(barcodeQueries[index] || "").trim();
    if (!barcode) return;

    const result = await getProductByBarcodeForPromotionAction(barcode);
    if (!result.success || !result.product) {
      Swal.fire(
        "แจ้งเตือน",
        result.message || "ไม่พบสินค้าใน catalog",
        "warning",
      );
      return;
    }

    const product = result.product;
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              product_code: String(product.code || product.id),
              product_name: product.descriptions,
              barcode: product.barcode,
              company_type: product.company_type || "",
              item_scope:
                String(product.company_type || "")
                  .trim()
                  .toLowerCase() === "competitor"
                  ? "COMPETITOR"
                  : "OUR",
              company: product.company || item.company,
            }
          : item,
      ),
    );
    setBarcodeQueries((prev) => ({ ...prev, [index]: "" }));
  };

  const updateCommissionTier = (
    index: number,
    field: "achievement_percent" | "min_credited_qty" | "payout",
    value: string,
  ) => {
    setCommissionRules((current) => ({
      ...current,
      tiers: current.tiers.map((tier, tierIndex) =>
        tierIndex === index
          ? {
              ...tier,
              [field]:
                field === "min_credited_qty" && value === ""
                  ? undefined
                  : Number(value || 0),
            }
          : tier,
      ),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (startDate && endDate && startDate > endDate) {
      Swal.fire(
        "แจ้งเตือน",
        "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด",
        "warning",
      );
      return;
    }
    if (items.some((item) => !item.product_code || !item.barcode)) {
      Swal.fire(
        "แจ้งเตือน",
        "กรุณาเลือกหรือค้นหาสินค้าจาก Barcode ให้ครบทุกแถว",
        "warning",
      );
      return;
    }
    if (
      items.some(
        (item) =>
          item.item_scope !== "COMPETITOR" && Number(item.target_qty || 0) <= 0,
      )
    ) {
      Swal.fire(
        "แจ้งเตือน",
        "กรุณากำหนด Target มากกว่า 0 ให้สินค้าของเรา",
        "warning",
      );
      return;
    }

    const payload = {
      id: editingId ? Number(editingId) : undefined,
      target_type: targetType,
      target_value: targetValue,
      campaign_title: campaignTitle,
      start_date: startDate || null,
      end_date: endDate || null,
      special_tier_text: specialTierText,
      is_active: isActive,
      staff_group: staffGroup,
      track_gift_inventory: trackGiftInventory,
      gift_items: giftItems.filter((gift) => gift.name.trim()),
      calculation_period: calculationPeriod,
      commission_rules: commissionRules,
      items: items.map((i) => ({
        product_code: String(i.product_code || ""),
        price: String(i.price),
        condition: i.condition || "",
        item_scope: i.item_scope || "OUR",
        target_qty: Number(i.target_qty || 0),
        credit_factor: Number(i.credit_factor ?? 1),
      })),
    };

    const res = await savePromotionAction(payload);
    if (res.success) {
      Swal.fire("สำเร็จ", "บันทึกข้อมูลโปรโมชันเรียบร้อยแล้ว", "success");
      handleResetForm();
      fetchPromotions();
    } else {
      Swal.fire("เกิดข้อผิดพลาด", String(res.message || ""), "error");
    }
  };

  const handleDelete = async (id: string | number) => {
    const confirmed = await Swal.fire({
      title: "ยืนยันการลบ",
      text: "คุณต้องการลบโปรโมชันนี้ใช่หรือไม่?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!confirmed.isConfirmed) return;
    const res = await deletePromotionAction(id);
    if (res.success) {
      Swal.fire("สำเร็จ", "ลบข้อมูลสำเร็จ", "success");
      fetchPromotions();
    } else {
      Swal.fire("เกิดข้อผิดพลาด", String(res.message || ""), "error");
    }
  };

  return (
    <div className="min-h-screen bg-blue-800 text-slate-800 font-sans antialiased">
      {/* HEADER TOP BAR */}
      <nav className="bg-blue-800 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-2 rounded-xl">
              <Target size={18} />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-red-600 block tracking-wider">
                BACKEND MANAGEMENT
              </span>
              <span className="text-sm font-black text-white block -mt-0.5">
                ระบบจัดการโปรโมชั่น (ADMIN)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/promotion-briefs"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
            >
              <Film size={16} /> จัดการคลิป/บรีฟ
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <ArrowLeft size={18} /> หน้าหลัก Admin
            </Link>
          </div>
        </div>
      </nav>

      <form
        onSubmit={handleSave}
        className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-700">
          {editingId ? "แก้ไขโปรโมชัน" : "สร้างโปรโมชันใหม่"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              เงื่อนไขเป้าหมาย
            </label>
            <select
              value={targetType}
              onChange={(e) => {
                const newType = e.target.value as any;
                setTargetType(newType);
                setTargetValue("");
                setSelectedStoreName("");
              }}
              className="w-full border rounded-lg p-2 text-xs font-bold bg-slate-50"
            >
              <option value="COMPANY_TAG">Account (pg_stores.account)</option>
              <option value="STORE_CODE">ระบุรายสาขา (store_code)</option>
              <option value="ALL">ทุกสาขา (All)</option>
            </select>
          </div>

          {targetType === "STORE_CODE" && (
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                เลือกร้านค้า (store_name)
              </label>
              <select
                value={selectedStoreName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                className="w-full border rounded-lg p-2 text-xs font-bold bg-white"
              >
                <option value="">-- เลือกร้านค้า --</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.store_name}>
                    {s.store_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === "COMPANY_TAG" && (
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                เลือก Account
              </label>
              <select
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                className="w-full border rounded-lg p-2 text-xs font-bold bg-white"
                required
              >
                <option value="">-- เลือก Account --</option>
                {Array.from(
                  new Set(
                    [
                      ...stores.map((store) =>
                        String(store.account || "").trim(),
                      ),
                      targetValue,
                    ].filter(Boolean),
                  ),
                )
                  .sort()
                  .map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {targetType === "STORE_CODE" && (
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                รหัสสาขา
              </label>
              <input
                type="text"
                value={targetValue}
                readOnly
                className="w-full rounded-lg border bg-slate-100 p-2 text-xs font-bold text-slate-600"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              ชื่อแคมเปญ
            </label>
            <input
              type="text"
              placeholder="เช่น โปรโมชันประจำเดือน"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              className="w-full border rounded-lg p-2 text-xs font-bold"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              กลุ่มพนักงาน
            </label>
            <select
              value={staffGroup}
              onChange={(event) => setStaffGroup(event.target.value)}
              className="w-full border rounded-lg p-2 text-xs font-bold bg-white"
            >
              <option value="ALL">ทั้งหมด</option>
              {Array.from(
                new Set(
                  [
                    ...stores.map((store) =>
                      String(store.company_tag || "").trim(),
                    ),
                    staffGroup !== "ALL" ? staffGroup : "",
                  ].filter(Boolean),
                ),
              )
                .sort()
                .map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            เริ่มรอบวันที่
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            สิ้นสุดรอบวันที่
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
            />
          </label>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">
            ข้อความสิทธิพิเศษเพิ่มเติม (ถ้ามี)
          </label>
          <input
            type="text"
            placeholder="เช่น ซื้อครบ 500 บาท แถมฟรีสินค้าทดลอง"
            value={specialTierText}
            onChange={(e) => setSpecialTierText(e.target.value)}
            className="w-full border rounded-lg p-2 text-xs font-bold"
          />
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs font-bold text-amber-950">
          <input
            type="checkbox"
            checked={trackGiftInventory}
            onChange={(event) => setTrackGiftInventory(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            บันทึกสต๊อกของแถมสำหรับแคมเปญนี้
            <span className="mt-0.5 block text-[10px] font-medium text-amber-800">
              เปิดเมื่อมีของแถมที่ต้องบันทึก กระเป๋าส้มและ Nourish Premium
            </span>
          </span>
        </label>

        {trackGiftInventory && (
          <section className="space-y-3 rounded-lg border border-amber-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-amber-950">
                รายการของแถม
              </h3>
              <button
                type="button"
                onClick={() =>
                  setGiftItems((current) => [
                    ...current,
                    {
                      key: `gift-${Date.now()}-${current.length}`,
                      name: "",
                      source_type: "STORE_PICKUP",
                    },
                  ])
                }
                className="rounded-md bg-amber-700 px-2.5 py-1.5 text-[10px] font-bold text-white"
              >
                เพิ่มรายการ
              </button>
            </div>
            {giftItems.map((gift, index) => (
              <div
                key={gift.key}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  value={gift.name}
                  onChange={(event) =>
                    setGiftItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="ชื่อรายการของแถม"
                  className="w-full rounded border border-slate-300 p-2 text-xs"
                />
                <select
                  value={gift.source_type}
                  onChange={(event) =>
                    setGiftItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              source_type: event.target
                                .value as PromotionGiftItem["source_type"],
                            }
                          : item,
                      ),
                    )
                  }
                  className="w-full rounded border border-slate-300 bg-white p-2 text-xs"
                >
                  <option value="STORE_PICKUP">ของแถมหยิบหน้าร้าน</option>
                  <option value="COMPANY_SHIPMENT">
                    ของแถมส่งเข้าจากบริษัท
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setGiftItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="rounded-md border border-rose-200 px-2 text-xs font-bold text-rose-700"
                  aria-label={`ลบรายการของแถม ${gift.name || index + 1}`}
                >
                  ลบ
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
          <div>
            <h3 className="text-xs font-black text-emerald-900">
              รอบคำนวณ Target และคอมมิชชั่น
            </h3>
            <p className="mt-1 text-[10px] text-slate-600">
              รายเดือนรวมยอดและ Target ตั้งแต่วันที่ 1 ถึง 30
              ก่อนคำนวณคอมมิชชั่น
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCalculationPeriod("DAILY")}
              aria-pressed={calculationPeriod === "DAILY"}
              className={`rounded-md border px-3 py-2 text-xs font-bold ${calculationPeriod === "DAILY" ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
            >
              รายวัน
            </button>
            <button
              type="button"
              onClick={() => setCalculationPeriod("MONTHLY")}
              aria-pressed={calculationPeriod === "MONTHLY"}
              className={`rounded-md border px-3 py-2 text-xs font-bold ${calculationPeriod === "MONTHLY" ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
            >
              รายเดือน (วันที่ 1–30)
            </button>
          </div>
          <p className="text-[10px] text-slate-600">
            {calculationPeriod === "MONTHLY"
              ? "Target ของสินค้าและยอดขายจะนับเป็นยอดรวมของรอบเดือน และจ่ายคอมมิชชั่นตามผลงานรวม"
              : "Target และยอดขายจะเริ่มนับใหม่ทุกวัน และคำนวณคอมมิชชั่นรายวัน"}
          </p>
          <div>
            <h4 className="text-xs font-black text-emerald-900">
              เรทคอมมิชชั่นตามหน่วยนับและ % Achievement
            </h4>
            <p className="mt-1 text-[10px] text-slate-600">
              เมื่อกำหนดจำนวนขั้นต่ำ ระบบใช้จำนวนหน่วยนับเป็นเกณฑ์จ่าย;
              หากไม่กำหนดจะใช้ % Achievement เทียบ Target รวมของสินค้า OUR
            </p>
          </div>
          <div className="space-y-2">
            {commissionRules.tiers.map((tier, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <label className="text-[10px] font-bold text-slate-600">
                  จำนวนหน่วยนับขั้นต่ำ
                  <input
                    type="number"
                    min="0"
                    value={tier.min_credited_qty ?? ""}
                    onChange={(event) =>
                      updateCommissionTier(
                        index,
                        "min_credited_qty",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-600">
                  Achievement (%)
                  <input
                    type="number"
                    min="0"
                    value={tier.achievement_percent}
                    onChange={(event) =>
                      updateCommissionTier(
                        index,
                        "achievement_percent",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-600">
                  จ่ายคอมมิชชั่น (บาท)
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={tier.payout}
                    onChange={(event) =>
                      updateCommissionTier(index, "payout", event.target.value)
                    }
                    className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCommissionRules((current) => ({
                      ...current,
                      tiers: current.tiers.filter(
                        (_, tierIndex) => tierIndex !== index,
                      ),
                    }))
                  }
                  className="col-span-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 sm:col-span-1"
                >
                  ลบขั้น
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setCommissionRules((current) => ({
                  ...current,
                  tiers: [
                    ...current.tiers,
                    {
                      min_credited_qty: 50,
                      achievement_percent: 110,
                      payout: 0,
                    },
                  ],
                }))
              }
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              เพิ่มขั้นคอมมิชชั่น
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-[10px] font-bold text-slate-600">
              เริ่มโบนัสเพิ่มเมื่อขายได้ (หน่วยนับ)
              <input
                type="number"
                min="0"
                value={commissionRules.step.start_qty ?? ""}
                onChange={(event) =>
                  setCommissionRules((current) => ({
                    ...current,
                    step: {
                      ...current.step,
                      start_qty: Number(event.target.value || 0),
                    },
                  }))
                }
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
              />
            </label>
            <label className="text-[10px] font-bold text-slate-600">
              เพิ่มทุกจำนวน (หน่วยนับ)
              <input
                type="number"
                min="1"
                value={commissionRules.step.step_qty ?? ""}
                onChange={(event) =>
                  setCommissionRules((current) => ({
                    ...current,
                    step: {
                      ...current.step,
                      step_qty: Number(event.target.value || 1),
                    },
                  }))
                }
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
              />
            </label>
            <label className="text-[10px] font-bold text-slate-600">
              จ่ายเพิ่มต่อขั้น (บาท)
              <input
                type="number"
                min="0"
                step="0.001"
                value={commissionRules.step.payout}
                onChange={(event) =>
                  setCommissionRules((current) => ({
                    ...current,
                    step: {
                      ...current.step,
                      payout: Number(event.target.value || 0),
                    },
                  }))
                }
                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
              />
            </label>
          </div>
        </section>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700">
              รายการสินค้าโปรโมชัน
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold hover:bg-blue-100"
            >
              + เพิ่มรายการสินค้า
            </button>
          </div>

          {items.map((item, index) => (
            <div
              key={index}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    ประเภทสินค้า (จาก company_type)
                  </label>
                  <div className="w-full rounded border border-slate-200 bg-slate-100 p-1.5 text-xs font-bold text-slate-700">
                    {item.company_type
                      ? item.company_type.trim().toLowerCase() === "competitor"
                        ? "สินค้าคู่แข่ง"
                        : "สินค้าเรา"
                      : "เลือกสินค้าเพื่อระบุประเภท"}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Company
                  </label>
                  <select
                    value={item.company || ""}
                    onChange={(e) => handleCompanyChange(index, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold"
                  >
                    <option value="">-- เลือก Company --</option>
                    {companies.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Category
                  </label>
                  <select
                    value={item.category || ""}
                    onChange={(e) =>
                      handleCategoryChange(index, e.target.value)
                    }
                    disabled={!item.company}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold disabled:bg-slate-100"
                  >
                    <option value="">-- เลือก Category --</option>
                    {(rowCategories[index] || []).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Descriptions
                  </label>
                  <select
                    value={item.product_name || ""}
                    onChange={(e) =>
                      handleDescriptionChange(index, e.target.value)
                    }
                    disabled={!item.category}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-bold disabled:bg-slate-100"
                  >
                    <option value="">-- เลือกรายการสินค้า --</option>
                    {(rowProducts[index] || []).map((prod) => (
                      <option key={prod.id} value={prod.descriptions}>
                        {prod.descriptions}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Barcode (อัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    placeholder="บาร์โค้ด"
                    value={item.barcode || ""}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-300 rounded p-1.5 text-xs font-bold font-mono text-slate-600"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="พิมพ์/สแกน Barcode สินค้าเราและคู่แข่ง"
                  value={barcodeQueries[index] || ""}
                  onChange={(event) =>
                    setBarcodeQueries((prev) => ({
                      ...prev,
                      [index]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) =>
                    event.key === "Enter" &&
                    (event.preventDefault(), handleBarcodeSearch(index))
                  }
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleBarcodeSearch(index)}
                  className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-900"
                >
                  ค้นหา Barcode
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="text-[10px] font-bold text-slate-500">
                  Target รอบนี้ (หน่วยนับเป้า)
                  <input
                    type="number"
                    min="0"
                    value={item.target_qty ?? 0}
                    onChange={(event) =>
                      handleItemChange(index, "target_qty", event.target.value)
                    }
                    className="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500">
                  จำนวนที่นับเข้า Target ต่อชิ้นขาย
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.credit_factor ?? 1}
                    onChange={(event) =>
                      handleItemChange(
                        index,
                        "credit_factor",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-xs"
                  />
                </label>
                <label className="text-[10px] font-bold text-slate-500">
                  ตัวอย่าง: 1 แถม 1 นับ 1
                  <span className="mt-1 block rounded border border-slate-200 bg-slate-100 p-1.5 text-xs font-normal text-slate-600">
                    ขาย 2 ชิ้น ตั้ง factor = 0.5
                  </span>
                </label>
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="ราคาโปรโมชัน"
                  value={item.price}
                  onChange={(e) =>
                    handleItemChange(index, "price", e.target.value)
                  }
                  className="w-32 bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-center"
                />

                <input
                  type="text"
                  placeholder="เงื่อนไขโปรโมชัน (เช่น ซื้อ 1 แถม 1)"
                  value={item.condition}
                  onChange={(e) =>
                    handleItemChange(index, "condition", e.target.value)
                  }
                  className="flex-1 bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-700"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-500 text-xs px-2 font-bold hover:underline"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            เปิดใช้งานแคมเปญนี้
          </label>

          <div className="flex-1 flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
            >
              {editingId ? "บันทึกการแก้ไข" : "สร้างโปรโมชัน"}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-800 mb-3">
          รายการโปรโมชันในระบบ
        </h2>

        {loading ? (
          <p className="text-xs text-slate-500">กำลังโหลดข้อมูล...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-3 font-bold">เงื่อนไข</th>
                  <th className="p-3 font-bold">ค่าเป้าหมาย</th>
                  <th className="p-3 font-bold">ชื่อแคมเปญ</th>
                  <th className="p-3 font-bold">สถานะ</th>
                  <th className="p-3 font-bold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">{promo.target_type}</td>
                    <td className="p-3 font-bold text-blue-600">
                      {promo.target_value}
                    </td>
                    <td className="p-3">{promo.campaign_title}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          promo.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {promo.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(promo)}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="text-red-500 font-bold hover:underline"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
