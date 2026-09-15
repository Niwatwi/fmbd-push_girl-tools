"use client";

import { useState, useEffect } from "react";
import {
  getAllPromotionsAction,
  savePromotionAction,
  deletePromotionAction,
  getStoresAction,
  getCompaniesAction,
  getCategoriesAction,
  getProductsByCompanyAndCategoryAction,
  PromotionConfig,
  PromotionItem,
  Product,
} from "./actions";

interface ExtendedPromotionItem extends PromotionItem {
  company?: string;
  category?: string;
}

interface StoreItem {
  id: string | number;
  store_name: string;
  store_code: string;
}

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
  const [specialTierText, setSpecialTierText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<ExtendedPromotionItem[]>([]);

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
            }
          : item,
      ),
    );
  };

  const handleEdit = (promo: PromotionConfig) => {
    setEditingId(promo.id);
    const type = promo.target_type || "COMPANY_TAG";
    setTargetType(type);
    setTargetValue(promo.target_value || "");

    if (type === "STORE_CODE") {
      const matched = stores.find((s) => s.store_code === promo.target_value);
      setSelectedStoreName(matched ? matched.store_name : "");
    } else {
      setSelectedStoreName("");
    }

    setCampaignTitle(promo.campaign_title || "");
    setSpecialTierText(promo.special_tier_text || "");
    setIsActive(promo.is_active);

    setItems(
      promo.items?.map((item) => ({
        id: item.id,
        product_code: String(item.product_code || ""),
        product_name: item.products?.descriptions || item.product_name || "",
        barcode: item.products?.barcode || item.barcode || "",
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
    setSpecialTierText("");
    setIsActive(true);
    setItems([]);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      id: editingId ? Number(editingId) : undefined,
      target_type: targetType,
      target_value: targetValue,
      campaign_title: campaignTitle,
      special_tier_text: specialTierText,
      is_active: isActive,
      items: items.map((i) => ({
        product_code: String(i.product_code || ""),
        price: String(i.price),
        condition: i.condition || "",
      })),
    };

    const res = await savePromotionAction(payload);
    if (res.success) {
      alert("บันทึกข้อมูลโปรโมชันเรียบร้อยแล้ว");
      handleResetForm();
      fetchPromotions();
    } else {
      alert("เกิดข้อผิดพลาด: " + res.message);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("คุณต้องการลบโปรโมชันนี้ใช่หรือไม่?")) return;
    const res = await deletePromotionAction(id);
    if (res.success) {
      alert("ลบข้อมูลสำเร็จ");
      fetchPromotions();
    } else {
      alert("เกิดข้อผิดพลาด: " + res.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">
        จัดการโปรโมชัน (Admin)
      </h1>

      <form
        onSubmit={handleSave}
        className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-700">
          {editingId ? "แก้ไขโปรโมชัน" : "สร้างโปรโมชันใหม่"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <option value="COMPANY_TAG">รายกลุ่มห้าง (company_tag)</option>
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

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              ค่าเป้าหมาย {targetType === "STORE_CODE" && "(store_code)"}
            </label>
            <input
              type="text"
              placeholder={
                targetType === "COMPANY_TAG"
                  ? "เช่น LOTUS, BIGC"
                  : "รหัสสาขาอัตโนมัติ"
              }
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              readOnly={targetType === "STORE_CODE"}
              className={`w-full border rounded-lg p-2 text-xs font-bold ${
                targetType === "STORE_CODE" ? "bg-slate-100 text-slate-600" : ""
              }`}
              required={targetType !== "ALL"}
            />
          </div>

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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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
