"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  Search,
  Store,
  Users,
} from "lucide-react";
import {
  addKoeStoreAssignmentAction,
  disableKoeStoreAssignmentAction,
  getKoeStoreManagementAction,
  searchKoeMasterStoresAction,
} from "../actions";

type TeamMember = {
  id: number;
  username: string;
  employee_id: string | null;
  display_name: string;
  area: string;
  company_tag: string;
};
type Assignment = {
  id: number;
  store_code: string;
  store_name: string;
  area: string;
  chanel: string | null;
  account: string | null;
  mer_code: string;
  company_tag: string;
  is_active: boolean;
};
type MasterStore = {
  id: number;
  store_code: string;
  store_name: string;
  area: string | null;
  chanel: string | null;
  account: string | null;
  province: string | null;
  region: string | null;
  store_type: string | null;
  img_store: string | null;
};

export default function KoeStoreManagement() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [masterStores, setMasterStores] = useState<MasterStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAssignmentId, setBusyAssignmentId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const result = await getKoeStoreManagementAction();
    if (!result.success) {
      setMessage(result.message);
      setTeam([]);
      setAssignments([]);
    } else {
      const nextTeam = result.team as TeamMember[];
      setTeam(nextTeam);
      setAssignments(result.assignments as Assignment[]);
      setSelectedEmployeeId(
        (current) => current || (nextTeam[0] ? String(nextTeam[0].id) : ""),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const query = storeSearch.trim();
    let active = true;
    if (query.length < 2) {
      setMasterStores([]);
      setSelectedStoreId("");
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const result = await searchKoeMasterStoresAction(query);
      if (!active) return;
      if (result.success) {
        const stores = result.stores as MasterStore[];
        setMasterStores(stores);
        setSelectedStoreId((current) =>
          stores.some((store) => String(store.id) === current)
            ? current
            : stores[0]
              ? String(stores[0].id)
              : "",
        );
      } else {
        setMasterStores([]);
        setSelectedStoreId("");
        setMessage(result.message);
      }
      setSearching(false);
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [storeSearch]);

  const selectedMember = team.find(
    (member) => String(member.id) === selectedEmployeeId,
  );
  const employeeAssignments = useMemo(
    () =>
      assignments
        .filter((item) => item.mer_code === selectedMember?.username)
        .sort((left, right) => left.store_name.localeCompare(right.store_name)),
    [assignments, selectedMember],
  );
  const selectedStore = masterStores.find(
    (store) => String(store.id) === selectedStoreId,
  );
  const alreadyAssigned = Boolean(
    selectedStore &&
    employeeAssignments.some(
      (item) => item.store_code === selectedStore.store_code && item.is_active,
    ),
  );

  async function addStore() {
    if (!selectedMember || !selectedStore) return;
    setSaving(true);
    setMessage("");
    const result = await addKoeStoreAssignmentAction({
      employeeId: selectedMember.id,
      storeId: selectedStore.id,
      reason,
    });
    if (result.success) {
      setMessage("เพิ่มสาขาให้ BA แล้ว พร้อมใช้งานในระบบ Check-in และรายงาน");
      setReason("");
      await load();
    } else {
      setMessage(result.message);
    }
    setSaving(false);
  }

  async function disableStore(assignment: Assignment) {
    if (!selectedMember) return;
    setBusyAssignmentId(assignment.id);
    setMessage("");
    const result = await disableKoeStoreAssignmentAction({
      employeeId: selectedMember.id,
      assignmentId: assignment.id,
      reason,
    });
    if (result.success) {
      setMessage(`ปิดใช้งานสาขา ${assignment.store_name} แล้ว`);
      setReason("");
      await load();
    } else {
      setMessage(result.message);
    }
    setBusyAssignmentId(null);
  }

  return (
    <main className="staff-theme min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex items-center justify-between gap-3 rounded-xl bg-blue-900 p-4 text-white shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/koe" aria-label="กลับ KOE Dashboard" title="กลับ">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Store size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold">จัดการสาขาทีม BA Cheer</h1>
              <p className="truncate text-xs text-blue-200">
                เลือกร้านจาก Master Stores เพื่อเพิ่มหรืองด assignment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            aria-label="รีเฟรชรายการสาขา"
            title="รีเฟรชรายการสาขา"
            className="rounded-lg p-2 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        {message && (
          <p
            role="status"
            className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
          >
            {message}
          </p>
        )}

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-xs font-bold">
            BA Cheer ในทีม
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              disabled={loading || !team.length}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
            >
              <option value="">เลือก BA Cheer</option>
              {team.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.display_name || member.username} · {member.area} ·{" "}
                  {member.employee_id || member.username}
                </option>
              ))}
            </select>
          </label>

          <div className="border-t border-slate-100 pt-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Plus size={16} className="text-blue-700" /> เพิ่มร้านนอกเขต
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              ร้านที่เพิ่มจะผูกกับ BA คนที่เลือกและใช้ flow แคมเปญ รายงาน
              และค่าใช้จ่ายเดิม
            </p>
            <label className="mt-3 block text-xs font-bold">
              ค้นหาร้านจาก Master Stores
              <div className="relative mt-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={storeSearch}
                  onChange={(event) => setStoreSearch(event.target.value)}
                  placeholder="พิมพ์ชื่อร้านหรือรหัสร้านอย่างน้อย 2 ตัวอักษร"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </label>
            {storeSearch.trim().length >= 2 && (
              <label className="mt-3 block text-xs font-bold">
                ผลการค้นหา
                <select
                  value={selectedStoreId}
                  onChange={(event) => setSelectedStoreId(event.target.value)}
                  disabled={searching || !masterStores.length}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                >
                  {!masterStores.length ? (
                    <option value="">
                      {searching ? "กำลังค้นหา..." : "ไม่พบร้านที่เปิดใช้งาน"}
                    </option>
                  ) : (
                    masterStores.map((store) => (
                      <option key={store.id} value={String(store.id)}>
                        {store.store_name} · {store.store_code}
                        {store.area ? ` · ${store.area}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </label>
            )}

            {selectedStore && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700">
                  <MapPin size={14} className="text-blue-700" />
                  ข้อมูลที่จะบันทึกใน pg_stores
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                  {[
                    ["Area", selectedStore.area],
                    ["Chanel", selectedStore.chanel],
                    ["Account", selectedStore.account],
                    [
                      "ร้านค้า",
                      `${selectedStore.store_name} · ${selectedStore.store_code}`,
                    ],
                    ["User", selectedMember?.username],
                    ["Mer Code", selectedMember?.username],
                    ["Company Tag", selectedMember?.company_tag],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-2"
                    >
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className="mt-0.5 truncate font-semibold text-slate-800">
                        {value || "-"}
                      </p>
                    </div>
                  ))}
                </div>
                {selectedStore.img_store && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <Image
                      src={selectedStore.img_store}
                      alt={`รูป ${selectedStore.store_name}`}
                      width={64}
                      height={48}
                      unoptimized
                      className="h-12 w-16 rounded border border-slate-200 bg-white object-cover"
                    />
                    <span>รูปหน้าร้านจาก Master Stores</span>
                  </div>
                )}
              </div>
            )}

            <label className="mt-3 block text-xs font-bold">
              เหตุผลการเพิ่มหรือปิดสาขา
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                placeholder="ระบุเหตุผลอย่างน้อย 3 ตัวอักษร"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={
                loading ||
                saving ||
                !selectedMember ||
                !selectedStore ||
                alreadyAssigned ||
                reason.trim().length < 3
              }
              onClick={() => void addStore()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Plus size={16} />
              {saving
                ? "กำลังบันทึก..."
                : alreadyAssigned
                  ? "BA คนนี้มีสาขานี้แล้ว"
                  : "เพิ่ม / เปิดใช้งานสาขา"}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users size={16} className="text-blue-700" />
            สาขาที่ผูกกับ {selectedMember?.display_name || "BA ที่เลือก"}
          </h2>
          {loading ? (
            <p className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
              กำลังโหลดรายการสาขา...
            </p>
          ) : !selectedMember ? (
            <p className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
              {team.length
                ? "เลือก BA Cheer เพื่อดูรายการสาขา"
                : "ไม่พบ BA Cheer ใน Area ที่ดูแล"}
            </p>
          ) : !employeeAssignments.length ? (
            <p className="rounded-lg border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
              ยังไม่มีร้านที่ผูกกับ BA คนนี้
            </p>
          ) : (
            <div className="space-y-2">
              {employeeAssignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {assignment.store_name || assignment.store_code}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {assignment.store_code} ·{" "}
                      {assignment.area || "ไม่ระบุ Area"}
                      {assignment.account ? ` · ${assignment.account}` : ""}
                    </p>
                  </div>
                  {assignment.is_active ? (
                    <button
                      type="button"
                      disabled={
                        saving ||
                        busyAssignmentId !== null ||
                        reason.trim().length < 3
                      }
                      onClick={() => void disableStore(assignment)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="ปิดใช้งานร้านนี้สำหรับ BA"
                    >
                      <Power size={14} />
                      {busyAssignmentId === assignment.id
                        ? "กำลังปิด..."
                        : "ปิดใช้งาน"}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      ปิดใช้งาน
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
