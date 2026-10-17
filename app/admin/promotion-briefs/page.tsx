"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  FileText,
  Film,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import {
  createPromotionBriefUploadAction,
  deletePromotionBriefMediaAction,
  getPromotionBriefAdminDataAction,
  savePromotionBriefMediaAction,
} from "./actions";

interface PromotionOption {
  id: number | string;
  campaign_title: string;
  target_type: string;
  target_value: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

interface BriefMedia {
  id: number | string;
  promotion_id: number | string;
  media_type: "VIDEO" | "DOCUMENT";
  title: string;
  media_url: string;
  mime_type: string | null;
  storage_path: string | null;
  poster_url: string | null;
  poster_path: string | null;
  duration: string | null;
  sort_order: number;
  is_active: boolean;
}

const bucketName = "promotion-briefs";

export default function AdminPromotionBriefsPage() {
  const [promotions, setPromotions] = useState<PromotionOption[]>([]);
  const [media, setMedia] = useState<BriefMedia[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [mediaType, setMediaType] = useState<"VIDEO" | "DOCUMENT">("VIDEO");
  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    const result = await getPromotionBriefAdminDataAction();
    if (result.success) {
      setPromotions(result.promotions as PromotionOption[]);
      setMedia(result.media as BriefMedia[]);
      setSelectedPromotionId(
        (current) => current || String(result.promotions[0]?.id || ""),
      );
      setErrorMessage("");
    } else {
      setErrorMessage(result.message || "โหลดข้อมูลไม่สำเร็จ");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedMedia = media.filter(
    (item) => String(item.promotion_id) === selectedPromotionId,
  );

  const resetForm = () => {
    setEditingId(null);
    setMediaType("VIDEO");
    setTitle("");
    setMediaUrl("");
    setPosterUrl("");
    setDuration("");
    setSortOrder(String(selectedMedia.length));
    setIsActive(true);
    setMediaFile(null);
    setPosterFile(null);
  };

  const uploadFile = async (
    file: File,
    type: "VIDEO" | "DOCUMENT",
  ): Promise<{ url: string; path: string }> => {
    const signed = await createPromotionBriefUploadAction({
      promotionId: selectedPromotionId,
      mediaType: type,
      fileName: file.name,
      mimeType: file.type,
    });
    if (!signed.success || !signed.path || !signed.token) {
      throw new Error(signed.message || "สร้างลิงก์อัปโหลดไม่สำเร็จ");
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await supabase.storage
      .from(bucketName)
      .uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type,
        upsert: false,
      });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(signed.path);
    return { url: data.publicUrl, path: signed.path };
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPromotionId) {
      setErrorMessage("กรุณาสร้างหรือเลือกแคมเปญก่อนเพิ่มสื่อ");
      return;
    }
    if (!title.trim() || (!mediaUrl.trim() && !mediaFile)) {
      setErrorMessage("กรุณากรอกชื่อ และระบุ URL หรือเลือกไฟล์สื่อ");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      let finalMediaUrl = mediaUrl.trim();
      let storagePath = editingId
        ? selectedMedia.find((item) => item.id === editingId)?.storage_path ||
          null
        : null;
      let mimeType = editingId
        ? selectedMedia.find((item) => item.id === editingId)?.mime_type || null
        : null;

      if (mediaFile) {
        const uploaded = await uploadFile(mediaFile, mediaType);
        finalMediaUrl = uploaded.url;
        storagePath = uploaded.path;
        mimeType = mediaFile.type;
      }

      let finalPosterUrl = posterUrl.trim() || null;
      let posterPath = editingId
        ? selectedMedia.find((item) => item.id === editingId)?.poster_path ||
          null
        : null;
      if (posterFile) {
        const uploadedPoster = await uploadFile(posterFile, "DOCUMENT");
        finalPosterUrl = uploadedPoster.url;
        posterPath = uploadedPoster.path;
      }

      const result = await savePromotionBriefMediaAction({
        id: editingId || undefined,
        promotion_id: selectedPromotionId,
        media_type: mediaType,
        title,
        media_url: finalMediaUrl,
        mime_type: mimeType || undefined,
        storage_path: storagePath,
        poster_url: finalPosterUrl,
        poster_path: posterPath,
        duration,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });
      if (!result.success) throw new Error(result.message || "บันทึกไม่สำเร็จ");

      resetForm();
      await loadData();
      await Swal.fire("บันทึกแล้ว", "อัปเดตสื่อของแคมเปญเรียบร้อย", "success");
    } catch (error: any) {
      setErrorMessage(error.message || "บันทึกสื่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: BriefMedia) => {
    setSelectedPromotionId(String(item.promotion_id));
    setEditingId(item.id);
    setMediaType(item.media_type);
    setTitle(item.title);
    setMediaUrl(item.media_url);
    setPosterUrl(item.poster_url || "");
    setDuration(item.duration || "");
    setSortOrder(String(item.sort_order));
    setIsActive(item.is_active);
    setMediaFile(null);
    setPosterFile(null);
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item: BriefMedia) => {
    const confirmation = await Swal.fire({
      title: "ลบสื่อนี้?",
      text: item.title,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
    });
    if (!confirmation.isConfirmed) return;

    const result = await deletePromotionBriefMediaAction(item.id);
    if (!result.success) {
      setErrorMessage(result.message || "ลบสื่อไม่สำเร็จ");
      return;
    }
    if (editingId === item.id) resetForm();
    await loadData();
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-800 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-700">
              Admin / Promotion
            </p>
            <h1 className="mt-1 text-xl font-black">จัดการคลิปและเอกสารบรีฟ</h1>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> หน้า Admin
          </Link>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {errorMessage}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-500">
            กำลังโหลด...
          </p>
        ) : promotions.length === 0 ? (
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-bold">ยังไม่มีแคมเปญสำหรับผูกสื่อ</p>
            <Link
              href="/admin/promotions"
              className="mt-3 inline-block text-sm font-bold text-blue-700 underline"
            >
              ไปสร้างแคมเปญ
            </Link>
          </section>
        ) : (
          <>
            <section className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="promotion-select" className="text-sm font-bold">
                แคมเปญ
              </label>
              <select
                id="promotion-select"
                value={selectedPromotionId}
                onChange={(event) => {
                  setSelectedPromotionId(event.target.value);
                  resetForm();
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
              >
                {promotions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.campaign_title} ·{" "}
                    {promotion.target_value || promotion.target_type}
                    {!promotion.is_active ? " · ปิดใช้งาน" : ""}
                  </option>
                ))}
              </select>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <form
                onSubmit={handleSave}
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-black">
                    {editingId ? "แก้ไขสื่อ" : "เพิ่มสื่อใหม่"}
                  </h2>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs font-bold text-slate-500 underline"
                    >
                      ยกเลิกแก้ไข
                    </button>
                  )}
                </div>

                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="ประเภทสื่อ"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMediaType("VIDEO");
                      setMediaFile(null);
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${mediaType === "VIDEO" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200"}`}
                  >
                    <Film size={16} /> คลิปวิดีโอ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaType("DOCUMENT");
                      setMediaFile(null);
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${mediaType === "DOCUMENT" ? "border-blue-700 bg-blue-50 text-blue-800" : "border-slate-200"}`}
                  >
                    <FileText size={16} /> เอกสารบรีฟ
                  </button>
                </div>

                <label className="block text-xs font-bold text-slate-600">
                  ชื่อที่แสดง
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                    placeholder="เช่น เทคนิคการเชียร์ขายสินค้า"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-600">
                  ไฟล์{" "}
                  {mediaType === "VIDEO" ? "วิดีโอ MP4/WebM" : "ภาพหรือ PDF"}
                  <span className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                    <Upload size={16} />
                    <input
                      type="file"
                      accept={
                        mediaType === "VIDEO"
                          ? "video/mp4,video/webm"
                          : "image/jpeg,image/png,image/webp,application/pdf"
                      }
                      onChange={(event) =>
                        setMediaFile(event.target.files?.[0] || null)
                      }
                      className="min-w-0 flex-1 text-xs"
                    />
                  </span>
                  {mediaFile && (
                    <span className="mt-1 block text-[11px] text-emerald-700">
                      เลือก: {mediaFile.name}
                    </span>
                  )}
                </label>

                <label className="block text-xs font-bold text-slate-600">
                  หรือ URL สื่อ
                  <input
                    value={mediaUrl}
                    onChange={(event) => setMediaUrl(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                    placeholder="https://..."
                  />
                </label>

                {mediaType === "VIDEO" && (
                  <>
                    <label className="block text-xs font-bold text-slate-600">
                      ภาพปก (ไม่บังคับ)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setPosterFile(event.target.files?.[0] || null)
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-xs"
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-600">
                      URL ภาพปก (ไม่บังคับ)
                      <input
                        value={posterUrl}
                        onChange={(event) => setPosterUrl(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                        placeholder="https://..."
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-600">
                      ระยะเวลา (ไม่บังคับ)
                      <input
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
                        placeholder="01:45 นาที"
                      />
                    </label>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-slate-600">
                    ลำดับ
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(event) => setSortOrder(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                    />
                    แสดงหน้า Promotion
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {editingId ? <Save size={16} /> : <Plus size={16} />}
                  {saving
                    ? "กำลังบันทึก..."
                    : editingId
                      ? "บันทึกการแก้ไข"
                      : "เพิ่มสื่อในแคมเปญ"}
                </button>
              </form>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-black">
                    รายการสื่อ ({selectedMedia.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => void loadData()}
                    className="text-xs font-bold text-blue-700 underline"
                  >
                    รีเฟรช
                  </button>
                </div>
                {selectedMedia.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                    ยังไม่มีคลิปหรือเอกสารในแคมเปญนี้
                  </div>
                ) : (
                  selectedMedia.map((item) => (
                    <article
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="rounded-lg bg-slate-100 p-2 text-blue-800">
                        {item.media_type === "VIDEO" ? (
                          <Film size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-bold">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {item.media_type === "VIDEO" ? "วิดีโอ" : "เอกสาร"}
                          {item.duration ? ` · ${item.duration}` : ""}
                          {` · ลำดับ ${item.sort_order}`}
                          {!item.is_active ? " · ซ่อนอยู่" : ""}
                        </p>
                        <a
                          href={item.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-xs text-blue-700 underline"
                        >
                          เปิดตัวอย่าง
                        </a>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="แก้ไข"
                          onClick={() => handleEdit(item)}
                          className="rounded-md p-2 text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="ลบ"
                          onClick={() => void handleDelete(item)}
                          className="rounded-md p-2 text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
