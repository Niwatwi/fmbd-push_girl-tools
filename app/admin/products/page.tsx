"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Camera,
  Check,
  PackagePlus,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  createProductImageUploadAction,
  createMasterProductAction,
  getProductCategoryOptionsAction,
  getRecentMasterProductsAction,
  type ProductMasterInput,
} from "./actions";

const emptyProduct: ProductMasterInput = {
  code: "",
  category_code: "",
  category: "",
  sub_category: "",
  segment: "",
  company: "RVI",
  company_type: "Company",
  brand_type: "",
  brand: "",
  sub_brand: "",
  pack_name: "",
  descriptions: "",
  barcode: "",
  img_front: "",
  img_back: "",
  img_left: "",
  img_right: "",
  img_top: "",
  img_bottom: "",
  is_active: true,
  imageurl: "",
  img_price_tag: "",
  img_planogram: "",
  Dimension: "",
  sku_code: "",
};

const productImageFields = [
  { key: "imageurl", label: "Image URL" },
  { key: "img_front", label: "รูปด้านหน้า" },
  { key: "img_back", label: "รูปด้านหลัง" },
  { key: "img_left", label: "รูปด้านซ้าย" },
  { key: "img_right", label: "รูปด้านขวา" },
  { key: "img_top", label: "รูปด้านบน" },
  { key: "img_bottom", label: "รูปด้านล่าง" },
  { key: "img_price_tag", label: "ป้ายราคา" },
  { key: "img_planogram", label: "Planogram" },
] as const;

type ProductImageFieldName = (typeof productImageFields)[number]["key"];

interface CategoryOption {
  category: string;
  category_code: string;
}

interface RecentProduct {
  id: number;
  code: string;
  company: string | null;
  company_type: string | null;
  category: string;
  pack_name: string;
  descriptions: string | null;
  barcode: string;
  sku_code: string | null;
  is_active: boolean | null;
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      {required ? " *" : ""}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function ProductImageField({
  label,
  value,
  uploading,
  onChange,
  onFileSelect,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onChange: (value: string) => void;
  onFileSelect: (file: File) => void;
}) {
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = "";
  };

  return (
    <div className="min-w-0">
      <label className="block text-xs font-bold text-slate-600">
        {label}
        <input
          type="url"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="URL รูปภาพ (หรือใช้ปุ่มด้านล่าง)"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
          <Camera size={14} /> ถ่ายรูป
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            disabled={uploading}
            className="sr-only"
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
          <Upload size={14} /> เลือกไฟล์
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            disabled={uploading}
            className="sr-only"
          />
        </label>
        {uploading && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700">
            <RefreshCw size={12} className="animate-spin" /> กำลังอัปโหลด
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [form, setForm] = useState<ProductMasterInput>(emptyProduct);
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [categoryCodeManuallyEdited, setCategoryCodeManuallyEdited] =
    useState(false);
  const [uploadingImages, setUploadingImages] = useState<
    Partial<Record<ProductImageFieldName, boolean>>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const result = await getRecentMasterProductsAction();
    if (result.success) {
      setProducts(result.products as RecentProduct[]);
      setMessage("");
    } else {
      setMessage(result.message || "โหลดรายการสินค้าไม่สำเร็จ");
      setMessageIsError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadProducts();
    void loadCategories();
  }, []);

  const loadCategories = async () => {
    const result = await getProductCategoryOptionsAction();
    if (result.success) {
      setCategoryOptions(result.categories as CategoryOption[]);
    }
  };

  const setField = <K extends keyof ProductMasterInput>(
    key: K,
    value: ProductMasterInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleCategoryChange = (category: string) => {
    const matchingCategory = categoryOptions.find(
      (option) =>
        option.category.toLowerCase() === category.trim().toLowerCase(),
    );
    setForm((current) => ({
      ...current,
      category,
      ...(matchingCategory
        ? { category_code: matchingCategory.category_code }
        : categoryCodeManuallyEdited
          ? {}
          : { category_code: "" }),
    }));
    if (matchingCategory) setCategoryCodeManuallyEdited(false);
  };

  const compressProductImage = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("อ่านไฟล์รูปภาพไม่สำเร็จ"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("เปิดไฟล์รูปภาพไม่สำเร็จ"));
        image.onload = () => {
          const maxSide = 1800;
          const scale = Math.min(
            1,
            maxSide / Math.max(image.width, image.height),
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("เตรียมรูปภาพไม่สำเร็จ"));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("บีบอัดรูปภาพไม่สำเร็จ"));
                return;
              }
              resolve(
                new File([blob], `product-${Date.now()}.jpg`, {
                  type: "image/jpeg",
                }),
              );
            },
            "image/jpeg",
            0.84,
          );
        };
        image.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });

  const uploadProductImage = async (
    field: ProductImageFieldName,
    file: File,
  ) => {
    setUploadingImages((current) => ({ ...current, [field]: true }));
    setMessage("");
    try {
      const compressedFile = await compressProductImage(file);
      const signed = await createProductImageUploadAction({
        fileName: compressedFile.name,
        mimeType: compressedFile.type,
      });
      if (!signed.success || !signed.path || !signed.token) {
        throw new Error(signed.message || "เตรียมอัปโหลดรูปไม่สำเร็จ");
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.storage
        .from("product-images")
        .uploadToSignedUrl(signed.path, signed.token, compressedFile, {
          contentType: compressedFile.type,
          upsert: false,
        });
      if (error) throw new Error(error.message);

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(signed.path);
      setField(field, data.publicUrl);
    } catch (error: any) {
      setMessage(error.message || "อัปโหลดรูปไม่สำเร็จ");
      setMessageIsError(true);
    } finally {
      setUploadingImages((current) => ({ ...current, [field]: false }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageIsError(false);

    const result = await createMasterProductAction(form);
    if (result.success) {
      setForm({
        ...emptyProduct,
        company: form.company,
        company_type: form.company_type,
      });
      setMessage(
        `เพิ่มสินค้าแล้ว: ${result.product?.code || ""} · ${result.product?.descriptions || ""}`,
      );
      setCategoryCodeManuallyEdited(false);
      await loadProducts();
    } else {
      setMessage(result.message || "เพิ่มสินค้าไม่สำเร็จ");
      setMessageIsError(true);
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-blue-100 px-4 py-6 text-slate-800 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase text-blue-700">
              Admin / Master data
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-black">
              <PackagePlus className="text-blue-700" size={22} /> เพิ่มสินค้าใน
              Master Products
            </h1>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> หน้า Admin
          </Link>
        </header>

        {message && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-3 text-sm font-bold ${messageIsError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 md:p-5"
          >
            <section className="space-y-3">
              <h2 className="border-b border-slate-100 pb-2 text-sm font-black">
                ข้อมูลสินค้า
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-600">
                  ประเภทสินค้า *
                  <select
                    required
                    value={form.company_type}
                    onChange={(event) =>
                      setField(
                        "company_type",
                        event.target.value as "Company" | "Competitor",
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    <option value="Company">สินค้าเรา (Company)</option>
                    <option value="Competitor">
                      สินค้าคู่แข่ง (Competitor)
                    </option>
                  </select>
                </label>
                <TextField
                  label="Company"
                  value={form.company || ""}
                  onChange={(value) => setField("company", value)}
                  placeholder="เช่น RVI, Cellox, Kleenex"
                />
                <TextField
                  label="Product code (เว้นว่างให้ระบบสร้าง)"
                  value={form.code || ""}
                  onChange={(value) => setField("code", value)}
                  placeholder="เช่น PROD-4563"
                />
                <TextField
                  label="Barcode"
                  value={form.barcode}
                  onChange={(value) => setField("barcode", value)}
                  required
                />
                <TextField
                  label="SKU code"
                  value={form.sku_code || ""}
                  onChange={(value) => setField("sku_code", value)}
                />
                <TextField
                  label="รายละเอียดสินค้า"
                  value={form.descriptions}
                  onChange={(value) => setField("descriptions", value)}
                  required
                  placeholder="เช่น พอลล่า 24+6 ม้วน 2 ชั้น"
                />
                <TextField
                  label="Pack name"
                  value={form.pack_name}
                  onChange={(value) => setField("pack_name", value)}
                  required
                  placeholder="เช่น Regular Roll"
                />
                <label className="block text-xs font-bold text-slate-600">
                  Category *
                  <input
                    required
                    list="master-product-categories"
                    value={form.category}
                    onChange={(event) =>
                      handleCategoryChange(event.target.value)
                    }
                    placeholder="เลือกหรือพิมพ์ Category ใหม่"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                  <datalist id="master-product-categories">
                    {categoryOptions.map((option) => (
                      <option key={option.category} value={option.category} />
                    ))}
                  </datalist>
                </label>
                <TextField
                  label="Category code"
                  value={form.category_code || ""}
                  onChange={(value) => {
                    setCategoryCodeManuallyEdited(true);
                    setField("category_code", value);
                  }}
                />
                <TextField
                  label="Sub category"
                  value={form.sub_category || ""}
                  onChange={(value) => setField("sub_category", value)}
                />
                <label className="block text-xs font-bold text-slate-600">
                  Segment
                  <select
                    value={form.segment || ""}
                    onChange={(event) =>
                      setField("segment", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                  >
                    <option value="">เลือก Segment</option>
                    <option value="Premium">Premium</option>
                    <option value="Standard">Standard</option>
                    <option value="Economic">Economic</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Brand type
                  <select
                    value={form.brand_type || ""}
                    onChange={(event) =>
                      setField("brand_type", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                  >
                    <option value="">เลือก Brand type</option>
                    <option value="Branded">Branded</option>
                    <option value="OEM">OEM</option>
                  </select>
                </label>
                <TextField
                  label="Brand"
                  value={form.brand || ""}
                  onChange={(value) => setField("brand", value)}
                />
                <TextField
                  label="Sub brand"
                  value={form.sub_brand || ""}
                  onChange={(value) => setField("sub_brand", value)}
                />
                <TextField
                  label="Dimension"
                  value={form.Dimension || ""}
                  onChange={(value) => setField("Dimension", value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setField("is_active", event.target.checked)
                  }
                />
                สินค้าเปิดใช้งานและเลือกได้ในแคมเปญ
              </label>
            </section>

            <details className="rounded-lg border border-slate-200 p-3" open>
              <summary className="cursor-pointer text-xs font-black text-slate-700">
                เพิ่มรูปสินค้า: ถ่ายรูปหรือเลือกอัปโหลด (ไม่บังคับ)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {productImageFields.map(({ key, label }) => (
                  <ProductImageField
                    key={key}
                    label={label}
                    value={form[key] || ""}
                    uploading={Boolean(uploadingImages[key])}
                    onChange={(value) => setField(key, value)}
                    onFileSelect={(file) => void uploadProductImage(key, file)}
                  />
                ))}
              </div>
            </details>

            <button
              type="submit"
              disabled={saving || Object.values(uploadingImages).some(Boolean)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {saving ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {saving ? "กำลังบันทึก..." : "เพิ่มสินค้าใน Master"}
            </button>
          </form>

          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h2 className="text-sm font-black">เพิ่มล่าสุด</h2>
                <p className="text-[11px] text-slate-500">
                  สินค้าใหม่จะเลือกได้ในแคมเปญหลังรีเฟรชข้อมูล
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadProducts()}
                title="รีเฟรชรายการ"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={15} />
              </button>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                กำลังโหลดสินค้า...
              </p>
            ) : products.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                ยังไม่มีรายการสินค้า
              </p>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <article
                    key={product.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-xs font-black text-slate-800">
                          {product.descriptions || product.pack_name}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-slate-500">
                          {product.code} · {product.barcode}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {product.company || "-"} · {product.category} ·{" "}
                          {product.pack_name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-black ${product.company_type === "Competitor" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        {product.company_type || "Company"}
                      </span>
                    </div>
                    <p
                      className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${product.is_active ? "text-emerald-700" : "text-slate-400"}`}
                    >
                      <Check size={12} />{" "}
                      {product.is_active ? "เปิดใช้งาน" : "ไม่ใช้งาน"}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
