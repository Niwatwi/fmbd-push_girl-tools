"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { getKoeAccessAction, saveKoeAccessAction } from "./actions";

type Profile = {
  id: number;
  username: string;
  employee_id: string | null;
  display_name: string;
  area: string | null;
};
type Account = { user_id: number; is_active: boolean };
type Assignment = { koe_user_id: number; area: string };

export default function KoeAccessPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [userId, setUserId] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const result = await getKoeAccessAction();
    if (!result.success) {
      setMessage(result.message);
      return;
    }
    setProfiles(result.profiles as Profile[]);
    setAccounts(result.accounts as Account[]);
    setAssignments(result.assignments as Assignment[]);
  }
  useEffect(() => {
    void load();
  }, []);
  const areas = Array.from(
    new Set(
      profiles
        .map((profile) => String(profile.area || "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "th"));

  async function save() {
    setSaving(true);
    setMessage("");
    const result = await saveKoeAccessAction(Number(userId), selectedAreas);
    if (!result.success) setMessage(result.message);
    else {
      setMessage("บันทึกสิทธิ์เรียบร้อย ผู้ใช้ต้องเข้าสู่ระบบใหม่");
      await load();
    }
    setSaving(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-slate-50 p-4 text-slate-900">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-blue-700"
      >
        <ArrowLeft size={16} /> กลับ Admin
      </Link>
      <h1 className="text-xl font-bold">จัดการสิทธิ์ KOE</h1>
      {message && (
        <p
          role="status"
          className="rounded border border-blue-200 bg-blue-50 p-3 text-sm"
        >
          {message}
        </p>
      )}
      <label className="block text-sm font-bold">
        ผู้ใช้งาน
        <select
          value={userId}
          onChange={(event) => {
            const next = event.target.value;
            setUserId(next);
            setSelectedAreas(
              assignments
                .filter((item) => String(item.koe_user_id) === next)
                .map((item) => item.area),
            );
          }}
          className="mt-2 w-full rounded border border-slate-300 bg-white p-2 text-sm"
        >
          <option value="">เลือกผู้ใช้งาน</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name || profile.username} (
              {profile.employee_id || profile.username})
              {accounts.some(
                (account) =>
                  account.user_id === profile.id && account.is_active,
              )
                ? " · KOE"
                : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset
        disabled={!userId || saving}
        className="space-y-2 border-t border-slate-200 pt-4"
      >
        <legend className="text-sm font-bold">Area ที่รับผิดชอบ</legend>
        {areas.map((area) => (
          <label
            key={area}
            className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedAreas.includes(area)}
              onChange={(event) =>
                setSelectedAreas((current) =>
                  event.target.checked
                    ? [...current, area]
                    : current.filter((value) => value !== area),
                )
              }
            />
            {area}
          </label>
        ))}
        {!areas.length && (
          <p className="text-sm text-slate-500">
            ยังไม่มี Area ในข้อมูลพนักงาน
          </p>
        )}
      </fieldset>
      <button
        type="button"
        disabled={!userId || saving}
        onClick={() => void save()}
        className="inline-flex items-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        <Save size={16} /> {saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
      </button>
    </main>
  );
}
