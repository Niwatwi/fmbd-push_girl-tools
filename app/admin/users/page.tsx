"use client";

import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ArrowLeft, Camera, ImagePlus, KeyRound, UserPlus } from "lucide-react";
import {
  createManagedUserAction,
  getManagedUserStoreGroupsAction,
  listManagedUsersAction,
  resetManagedUserPasswordAction,
  setManagedUserActiveAction,
} from "./actions";

type ManagedUser = {
  id: number;
  username: string;
  employee_id: string | null;
  display_name: string;
  company_tag: string;
  area: string;
  kpi_region?: "BKK" | "UPC" | null;
  email: string;
  phone: string | null;
  image_url: string | null;
  is_active: boolean;
};
type StoreGroup = {
  area: string;
  account: string;
  companyTag: string;
};
const empty = {
  username: "",
  employeeId: "",
  name: "",
  companyTag: "BA",
  area: "",
  kpiRegion: "" as "" | "BKK" | "UPC",
  email: "",
  phone: "",
  employmentType: "",
  password: "",
  avatarBase64: "",
};
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function ManagedUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [storeGroups, setStoreGroups] = useState<StoreGroup[]>([]);
  const [storeGroupIndex, setStoreGroupIndex] = useState("");
  const [form, setForm] = useState(empty);
  const [otherCompanyTag, setOtherCompanyTag] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [usersResult, groupsResult] = await Promise.all([
      listManagedUsersAction(),
      getManagedUserStoreGroupsAction(),
    ]);
    if (usersResult.success) setUsers(usersResult.users as ManagedUser[]);
    else setMessage(usersResult.message);
    if (groupsResult.success)
      setStoreGroups(groupsResult.groups as StoreGroup[]);
    else setMessage(groupsResult.message);
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    if (form.kpiRegion !== "BKK" && form.kpiRegion !== "UPC") {
      setBusy(false);
      setMessage("กรุณาเลือกเรท KPI เป็น BKK หรือ UPC");
      return;
    }
    const result = await createManagedUserAction({
      ...form,
      kpiRegion: form.kpiRegion,
      companyTag:
        form.companyTag === "OTHER" ? otherCompanyTag.trim() : form.companyTag,
    });
    if (result.success) {
      setForm(empty);
      setOtherCompanyTag("");
      setStoreGroupIndex("");
      setMessage("สร้างบัญชีเรียบร้อยแล้ว");
      await load();
    } else setMessage(result.message);
    setBusy(false);
  }
  async function reset(event: FormEvent) {
    event.preventDefault();
    if (resetId === null) return;
    setBusy(true);
    setMessage("");
    const result = await resetManagedUserPasswordAction(resetId, newPassword);
    if (result.success) {
      setResetId(null);
      setNewPassword("");
      setMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    } else setMessage(result.message);
    setBusy(false);
  }
  async function changeStatus(user: ManagedUser) {
    const action = user.is_active ? "ระงับ" : "เปิดใช้งาน";
    const confirmation = await Swal.fire({
      title: `${action}บัญชีผู้ใช้?`,
      text: `${user.display_name || user.username}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `${action}บัญชี`,
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: user.is_active ? "#dc2626" : "#2563eb",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;
    setBusy(true);
    setMessage("");
    const result = await setManagedUserActiveAction(user.id, !user.is_active);
    if (result.success) {
      setMessage("เปลี่ยนสถานะบัญชีแล้ว");
      await load();
    } else setMessage(result.message);
    setBusy(false);
  }
  function setAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("รูปต้นฉบับต้องมีขนาดไม่เกิน 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const avatarBase64 = canvas.toDataURL("image/jpeg", 0.78);
        if (avatarBase64.length > 4_200_000) {
          setMessage("รูปหลังปรับขนาดมีขนาดใหญ่เกินไป กรุณาเลือกรูปใหม่");
          return;
        }
        setForm((current) => ({ ...current, avatarBase64 }));
        setMessage("");
      };
      image.onerror = () => setMessage("ไม่สามารถอ่านไฟล์รูปนี้ได้");
      image.src = String(reader.result || "");
    };
    reader.onerror = () => setMessage("ไม่สามารถอ่านไฟล์รูปนี้ได้");
    reader.readAsDataURL(file);
  }

  const field = (
    key: keyof typeof empty,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="space-y-1 text-xs font-bold">
      <span>{label}</span>
      <input
        type={type}
        required={required}
        minLength={key === "password" ? 8 : undefined}
        maxLength={key === "password" ? 128 : undefined}
        value={form[key]}
        onChange={(event) =>
          setForm((current) => ({ ...current, [key]: event.target.value }))
        }
        autoComplete={key === "password" ? "new-password" : undefined}
        className={inputClass}
      />
    </label>
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-5 bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
          >
            <ArrowLeft size={16} /> กลับ Admin
          </Link>
          <h1 className="mt-3 text-xl font-black">จัดการบัญชีผู้ใช้</h1>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="rounded border border-blue-200 bg-blue-50 p-3 text-sm"
        >
          {message}
        </p>
      )}
      <details
        open
        className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50 shadow-sm"
      >
        <summary className="cursor-pointer list-none border-b border-blue-100 px-4 py-3 text-sm font-bold text-blue-950 [&::-webkit-details-marker]:hidden">
          <UserPlus size={16} className="mr-2 inline text-blue-700" />
          เพิ่มผู้ใช้
        </summary>
        <form onSubmit={create} className="space-y-4 p-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={setAvatar}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={setAvatar}
            className="hidden"
          />

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 border-b border-slate-100 pb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Employee Avatar Image
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-blue-200 bg-slate-50 p-5 sm:flex-row">
              {form.avatarBase64 ? (
                <Image
                  src={form.avatarBase64}
                  alt="ตัวอย่างรูปพนักงาน"
                  width={96}
                  height={96}
                  unoptimized
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <UserPlus size={28} />
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Camera size={14} /> เปิดกล้องถ่ายภาพ
                </button>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ImagePlus size={14} /> เลือกหรืออัปโหลดไฟล์ภาพ
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 border-b border-slate-100 pb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Account Authorization
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-bold sm:col-span-2">
                <span>เลือกกลุ่มร้านค้าจาก PG_STORES (ไม่บังคับ)</span>
                <select
                  value={storeGroupIndex}
                  onChange={(event) => {
                    const nextIndex = event.target.value;
                    setStoreGroupIndex(nextIndex);
                    const group = storeGroups[Number(nextIndex)];
                    if (group) {
                      setForm((current) => ({
                        ...current,
                        area: group.area,
                        companyTag: group.companyTag || current.companyTag,
                      }));
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">
                    เลือกกลุ่มร้านค้าเพื่อเติม Area และ Company Tag
                  </option>
                  {storeGroups.map((group, index) => (
                    <option
                      key={`${group.area}-${group.account}-${index}`}
                      value={index}
                    >
                      {group.area} · {group.account || "ไม่ระบุ Account"} ·{" "}
                      {group.companyTag || "ไม่ระบุ Tag"}
                    </option>
                  ))}
                </select>
              </label>
              {field("area", "Area (เขตพื้นที่)")}
              <label className="space-y-1 text-xs font-bold">
                <span>เรท KPI BA</span>
                <select
                  required
                  className={inputClass}
                  value={form.kpiRegion}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kpiRegion: event.target.value as "" | "BKK" | "UPC",
                    }))
                  }
                >
                  <option value="">-- เลือก BKK หรือ UPC --</option>
                  <option value="BKK">
                    BKK - กรุงเทพมหานคร (เต็ม 2,600 บาท)
                  </option>
                  <option value="UPC">
                    UPC - ต่างจังหวัด (เต็ม 1,500 บาท)
                  </option>
                </select>
              </label>
              {field("username", "Username (Area Code)", "text", true)}
              {field("password", "รหัสผ่าน", "password", true)}
              {field("email", "อีเมล (สำหรับล็อกอิน)", "email", true)}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 border-b border-slate-100 pb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Personal &amp; Company Profile
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field("name", "Display Name (ชื่อพนักงาน)", "text", true)}
              {field("employeeId", "รหัสพนักงาน")}
              <label className="space-y-1 text-xs font-bold">
                <span>Company Tag</span>
                <select
                  className={inputClass}
                  value={form.companyTag}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyTag: event.target.value,
                    }))
                  }
                >
                  {[
                    "BA",
                    "BA_CHEER",
                    "PC",
                    "PG",
                    "KOE",
                    "BA_SUPERVISOR",
                    "SUPERVISOR",
                    "SURVEYOR",
                    "AUDITOR",
                    "CUSTOMER",
                    "ADMIN",
                    "OTHER",
                  ].map((tag) => (
                    <option key={tag} value={tag}>
                      {tag === "OTHER" ? "อื่นๆ (พิมพ์ระบุเอง...)" : tag}
                    </option>
                  ))}
                </select>
                {form.companyTag === "OTHER" && (
                  <input
                    required
                    value={otherCompanyTag}
                    onChange={(event) => setOtherCompanyTag(event.target.value)}
                    placeholder="ระบุ Company Tag"
                    className={inputClass}
                  />
                )}
              </label>
              {field("phone", "โทรศัพท์", "tel")}
              {field("employmentType", "ประเภทการจ้างงาน")}
            </div>
          </section>

          <button
            disabled={busy}
            className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
          </button>
        </form>
      </details>
      <section>
        <h2 className="mb-2 text-sm font-bold">บัญชีผู้ใช้</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {user.image_url ? (
                    <Image
                      src={user.image_url}
                      alt={user.display_name || user.username}
                      width={44}
                      height={44}
                      unoptimized
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                      {(user.display_name || user.username).slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold">
                      {user.display_name || user.username}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {user.username} · {user.company_tag} ·{" "}
                      {user.area || "ไม่ระบุ Area"} ·{" "}
                      {user.is_active ? "ใช้งาน" : "ระงับ"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    title="เปลี่ยนรหัสผ่าน"
                    aria-label={`เปลี่ยนรหัสผ่าน ${user.display_name}`}
                    onClick={() => {
                      setResetId(user.id);
                      setNewPassword("");
                    }}
                    className="rounded border border-slate-300 p-2"
                  >
                    <KeyRound size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeStatus(user)}
                    className="rounded border border-slate-300 px-3 py-2 text-xs font-bold"
                  >
                    {user.is_active ? "ระงับ" : "เปิดใช้งาน"}
                  </button>
                </div>
              </div>
              {resetId === user.id && (
                <form onSubmit={reset} className="mt-3 flex flex-wrap gap-2">
                  <label className="sr-only" htmlFor={`password-${user.id}`}>
                    รหัสผ่านใหม่
                  </label>
                  <input
                    id={`password-${user.id}`}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    disabled={busy}
                    className="rounded bg-blue-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetId(null);
                      setNewPassword("");
                    }}
                    className="rounded border border-slate-300 px-3 py-2 text-xs"
                  >
                    ยกเลิก
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
