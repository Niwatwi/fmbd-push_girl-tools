"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, UserPlus } from "lucide-react";
import {
  createManagedUserAction,
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
  email: string;
  phone: string | null;
  is_active: boolean;
};
const empty = {
  username: "",
  employeeId: "",
  name: "",
  companyTag: "BA",
  area: "",
  email: "",
  phone: "",
  employmentType: "",
  password: "",
};
const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm";

export default function ManagedUsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    const result = await listManagedUsersAction();
    if (result.success) setUsers(result.users as ManagedUser[]);
    else setMessage(result.message);
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await createManagedUserAction(form);
    if (result.success) {
      setForm(empty);
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
    if (
      !window.confirm(
        `${user.is_active ? "ระงับ" : "เปิดใช้งาน"}บัญชี ${user.display_name || user.username}?`,
      )
    )
      return;
    setBusy(true);
    setMessage("");
    const result = await setManagedUserActiveAction(user.id, !user.is_active);
    if (result.success) {
      setMessage("เปลี่ยนสถานะบัญชีแล้ว");
      await load();
    } else setMessage(result.message);
    setBusy(false);
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
    <main className="mx-auto min-h-screen max-w-4xl space-y-4 bg-slate-50 p-4 text-slate-900">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-blue-700"
      >
        <ArrowLeft size={16} /> กลับ Admin
      </Link>
      <h1 className="text-xl font-bold">จัดการบัญชีผู้ใช้</h1>
      {message && (
        <p
          role="status"
          className="rounded border border-blue-200 bg-blue-50 p-3 text-sm"
        >
          {message}
        </p>
      )}
      <details className="rounded-md border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold">
          <UserPlus size={16} className="mr-2 inline" /> เพิ่มผู้ใช้
        </summary>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          {field("username", "ชื่อผู้ใช้", "text", true)}
          {field("employeeId", "รหัสพนักงาน")}
          {field("name", "ชื่อพนักงาน", "text", true)}
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
                "PC",
                "PG",
                "KOE",
                "BA_SUPERVISOR",
                "SUPERVISOR",
                "SURVEYOR",
                "AUDITOR",
                "CUSTOMER",
                "ADMIN",
              ].map((tag) => (
                <option key={tag}>{tag}</option>
              ))}
            </select>
          </label>
          {field("area", "Area")}
          {field("email", "อีเมล", "email")}
          {field("phone", "โทรศัพท์", "tel")}
          {field("employmentType", "ประเภทการจ้างงาน")}
          {field(
            "password",
            "รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)",
            "password",
            true,
          )}
          <div className="sm:col-span-2">
            <button
              disabled={busy}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              สร้างบัญชี
            </button>
          </div>
        </form>
      </details>
      <section>
        <h2 className="mb-2 text-sm font-bold">บัญชีผู้ใช้</h2>
        <div className="space-y-2">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">
                    {user.display_name || user.username}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {user.username} · {user.company_tag} ·{" "}
                    {user.area || "ไม่ระบุ Area"} ·{" "}
                    {user.is_active ? "ใช้งาน" : "ระงับ"}
                  </p>
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
