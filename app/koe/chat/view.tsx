"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, MessageCircle, Send, RefreshCw } from "lucide-react";
import {
  getKoeChatContactsAction,
  getKoeChatMessagesAction,
  markKoeChatReadAction,
  sendKoeChatMessageAction,
} from "../actions";

type Contact = {
  id: number;
  username: string;
  display_name: string;
  area: string;
  company_tag: string;
};
type Message = {
  id: number;
  sender_id: number;
  recipient_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
};
const timestamp = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const participantLabel = (companyTag: string) => {
  const tag = companyTag.trim().toUpperCase();
  if (tag === "CUSTOMER") return "ลูกค้า";
  if (["KOE", "KEY_ACCOUNT_OPERATION_EXECUTIVE"].includes(tag))
    return "ทีม KOE";
  if (tag === "BA_CHEER") return "น้องเชียร์";
  if (["BA", "SURVEYOR"].includes(tag)) return "ทีม BA";
  return "ผู้ดูแลระบบ";
};

export default function KoeChat({
  currentUserId,
  currentRole,
  currentCompanyTag,
}: {
  currentUserId: number;
  currentRole: "admin" | "staff" | "koe";
  currentCompanyTag: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const loadContacts = useCallback(async () => {
    const result = await getKoeChatContactsAction();
    if (!result.success) {
      setError(result.message);
      return;
    }
    setContacts(result.contacts as Contact[]);
    if (!peerId && result.contacts.length)
      setPeerId(String(result.contacts[0].id));
  }, [peerId]);

  useEffect(() => {
    void loadContacts().finally(() => setLoading(false));
  }, [loadContacts]);

  const poll = useCallback(
    async (reset = false) => {
      if (!peerId) return;
      const afterId = reset ? 0 : lastIdRef.current;
      const result = await getKoeChatMessagesAction(Number(peerId), afterId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      if (reset) {
        setMessages(result.messages as Message[]);
        lastIdRef.current = (result.messages as Message[]).at(-1)?.id || 0;
      } else if (result.messages.length) {
        setMessages((current) => [
          ...current,
          ...(result.messages as Message[]),
        ]);
        lastIdRef.current =
          (result.messages as Message[]).at(-1)?.id || lastIdRef.current;
      }
      const unread = (result.messages as Message[])
        .filter(
          (message) =>
            message.recipient_id === currentUserId && !message.read_at,
        )
        .map((message) => message.id);
      if (unread.length) await markKoeChatReadAction(Number(peerId), unread);
      setError("");
    },
    [peerId, currentUserId],
  );

  useEffect(() => {
    setMessages([]);
    if (!peerId) return;
    void poll(true);
    const interval = setInterval(() => void poll(), 3000);
    return () => clearInterval(interval);
  }, [peerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || !peerId || sending) return;
    setSending(true);
    const result = await sendKoeChatMessageAction(Number(peerId), body);
    if (!result.success) setError(result.message);
    else {
      setBody("");
      setMessages((current) => [...current, result.message as Message]);
      lastIdRef.current = Math.max(
        lastIdRef.current,
        Number(result.message.id),
      );
      setError("");
    }
    setSending(false);
  }

  const selected = contacts.find((contact) => String(contact.id) === peerId);
  const actorTag = currentCompanyTag.trim().toUpperCase();
  const heading =
    currentRole === "admin"
      ? "ศูนย์ประสานงาน"
      : actorTag === "CUSTOMER"
        ? "แชตกับผู้ดูแลระบบ"
        : currentRole === "koe"
          ? "แชตทีม KOE"
          : "แชตประสานงานทีม";
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center gap-3 bg-blue-900 p-4 text-white">
        <Link
          href={currentRole === "koe" ? "/koe" : "/"}
          aria-label="กลับ"
          title="กลับ"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold">{heading}</h1>
          <p className="truncate text-xs text-blue-200">
            {selected
              ? `${participantLabel(selected.company_tag)} · ${selected.display_name} · ${selected.area || "ไม่ระบุ Area"}`
              : currentRole === "admin"
                ? "ลูกค้า · ทีม KOE · น้องเชียร์"
                : "ข้อความประสานงาน"}
          </p>
        </div>
        <button
          type="button"
          title="รีเฟรช"
          aria-label="รีเฟรช"
          onClick={() => {
            void loadContacts();
            void poll(true);
          }}
        >
          <RefreshCw size={17} />
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="m-3 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}
      <label className="border-b border-slate-200 bg-white p-3 text-xs font-bold">
        {currentRole === "admin" ? "เลือกลูกค้าหรือทีมงาน" : "ผู้ร่วมสนทนา"}
        <select
          value={peerId}
          onChange={(event) => setPeerId(event.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm"
        >
          <option value="">เลือกผู้ร่วมสนทนา</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {participantLabel(contact.company_tag)} ·{" "}
              {contact.display_name || contact.username}
              {contact.area ? ` · ${contact.area}` : ""}
            </option>
          ))}
        </select>
      </label>
      <section
        aria-live="polite"
        className="flex-1 space-y-2 overflow-y-auto p-3"
      >
        {loading && (
          <p className="py-6 text-center text-xs text-slate-500">
            กำลังโหลด...
          </p>
        )}
        {!loading && !contacts.length && (
          <p className="py-8 text-center text-xs text-slate-500">
            {actorTag === "CUSTOMER"
              ? "ไม่พบผู้ดูแลระบบที่พร้อมสนทนา"
              : currentRole === "admin"
                ? "ยังไม่มีบัญชีลูกค้าหรือทีมงานที่เปิดใช้งาน"
                : "ไม่พบผู้ร่วมสนทนาใน Area ที่ได้รับอนุญาต"}
          </p>
        )}
        {messages.map((message) => {
          const own = message.sender_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <article
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${own ? "bg-blue-700 text-white" : "border border-slate-200 bg-white"}`}
              >
                <p className="whitespace-pre-wrap break-words">
                  {message.body}
                </p>
                <p
                  className={`mt-1 text-right text-[10px] ${own ? "text-blue-100" : "text-slate-400"}`}
                >
                  {timestamp(message.created_at)}
                  {own && message.read_at ? " · อ่านแล้ว" : ""}
                </p>
              </article>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </section>
      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-slate-200 bg-white p-3"
      >
        <label className="sr-only" htmlFor="koe-message">
          ข้อความ
        </label>
        <textarea
          id="koe-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder={
            actorTag === "CUSTOMER"
              ? "พิมพ์ข้อความถึงผู้ดูแลระบบ..."
              : "พิมพ์ข้อความประสานงาน..."
          }
          disabled={!peerId}
          className="min-h-11 flex-1 resize-none rounded border border-slate-300 bg-white p-2 text-sm"
        />
        <button
          type="submit"
          disabled={!peerId || !body.trim() || sending}
          title="ส่งข้อความ"
          aria-label="ส่งข้อความ"
          className="rounded bg-blue-700 p-3 text-white disabled:opacity-50"
        >
          <Send size={17} />
        </button>
      </form>
      <p className="px-3 pb-2 text-center text-[10px] text-slate-400">
        <MessageCircle size={12} className="mr-1 inline" />
        อัปเดตข้อความอัตโนมัติทุก 3 วินาที
      </p>
    </main>
  );
}
