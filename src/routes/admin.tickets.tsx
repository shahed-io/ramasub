import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Headphones,
  MessageCircle,
  RefreshCcw,
  Users,
  Loader2,
  ChevronDown,
  AlertCircle,
  Image as ImageIcon,
  Send,
  Check,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/tickets")({
  component: AdminTicketsPage,
});

type Ticket = {
  id: string;
  user_id: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  message: string;
  created_at: string;
  updated_at: string;
};

type Profile = { id: string; display_name: string | null; email?: string | null };
type Msg = { id: string; ticket_id: string; body: string; sender_role: string; created_at: string };

type TabKey = "all" | "refund" | "support";

const CAT_META: Record<string, { prefixEn: string; prefixBn: string; labelEn: string; labelBn: string; chip: string; icon: typeof MessageCircle }> = {
  refund: {
    prefixEn: "RF",
    prefixBn: "RF",
    labelEn: "Refund",
    labelBn: "রিফান্ড",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    icon: RefreshCcw,
  },
  wallet: {
    prefixEn: "WLT",
    prefixBn: "WLT",
    labelEn: "Wallet",
    labelBn: "ওয়ালেট",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    icon: MessageCircle,
  },
  support: {
    prefixEn: "SP",
    prefixBn: "SP",
    labelEn: "Support",
    labelBn: "সাপোর্ট",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    icon: MessageCircle,
  },
  general: {
    prefixEn: "GN",
    prefixBn: "GN",
    labelEn: "General",
    labelBn: "সাধারণ",
    chip: "bg-slate-50 text-slate-700 border-slate-200",
    icon: MessageCircle,
  },
};

function meta(cat: string) {
  return CAT_META[cat] || CAT_META.general;
}

function shortId(id: string, prefix: string) {
  // Build a short readable token: PREFIX-XXXXXXXX (uppercase from id)
  const clean = id.replace(/-/g, "").toUpperCase().slice(0, 8);
  return `#${prefix}-${clean}`;
}

function PriorityChip({ p, t }: { p: string; t: (en: string, bn: string) => string }) {
  const styles: Record<string, string> = {
    urgent: "bg-rose-50 text-rose-700 border-rose-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    normal: "bg-sky-50 text-sky-700 border-sky-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  const labels: Record<string, [string, string]> = {
    urgent: ["urgent", "জরুরি"],
    high: ["high", "উচ্চ"],
    normal: ["normal", "সাধারণ"],
    low: ["low", "নিম্ন"],
  };
  const k = (p || "normal").toLowerCase();
  const [en, bn] = labels[k] || labels.normal;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[k] || styles.normal}`}>
      {t(en, bn)}
    </span>
  );
}

function StatusChip({ s, t }: { s: string; t: (en: string, bn: string) => string }) {
  const styles: Record<string, string> = {
    open: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels: Record<string, [string, string]> = {
    open: ["open", "ওপেন"],
    pending: ["pending", "অপেক্ষায়"],
    in_progress: ["in progress", "চলমান"],
    closed: ["closed", "বন্ধ"],
    resolved: ["resolved", "সমাধান হয়েছে"],
  };
  const k = (s || "open").toLowerCase();
  const [en, bn] = labels[k] || labels.open;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[k] || styles.open}`}>
      {t(en, bn)}
    </span>
  );
}

function AdminTicketsPage() {
  const { t, lang } = useAdminLang();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Msg[]>>({});
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, user_id, category, priority, status, subject, message, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data as Ticket[]) ?? [];
    setTickets(list);

    const userIds = Array.from(new Set(list.map((t) => t.user_id))).filter(Boolean);
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const refund = tickets.filter((t) => t.category === "refund").length;
    const support = tickets.filter((t) => t.category !== "refund").length;
    return { all: tickets.length, refund, support };
  }, [tickets]);

  const legend = useMemo(() => {
    const urgent = tickets.filter((t) => ["urgent", "high"].includes((t.priority || "").toLowerCase()) && t.status !== "closed" && t.status !== "resolved").length;
    const open = tickets.filter((t) => !["closed", "resolved"].includes((t.status || "").toLowerCase())).length;
    const resolved = tickets.filter((t) => ["closed", "resolved"].includes((t.status || "").toLowerCase())).length;
    return { urgent, open, resolved };
  }, [tickets]);

  const visible = useMemo(() => {
    if (tab === "all") return tickets;
    if (tab === "refund") return tickets.filter((t) => t.category === "refund");
    return tickets.filter((t) => t.category !== "refund");
  }, [tickets, tab]);

  const openTicket = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!messages[id]) {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, body, sender_role, created_at")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      if (error) toast.error(error.message);
      setMessages((m) => ({ ...m, [id]: (data as Msg[]) ?? [] }));
    }
  };

  const sendReply = async (ticketId: string) => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return toast.error("Not authenticated");
    }
    const { data, error } = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: ticketId, body, sender_role: "admin", sender_user_id: user.id })
      .select()
      .single();
    setSending(false);
    if (error) return toast.error(error.message);
    setMessages((m) => ({ ...m, [ticketId]: [...(m[ticketId] || []), data as Msg] }));
    setReply("");
    toast.success(t("Reply sent", "উত্তর পাঠানো হয়েছে"));
  };

  const setStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
    if (error) return toast.error(error.message);
    setTickets((prev) => prev.map((tk) => (tk.id === ticketId ? { ...tk, status } : tk)));
    toast.success(t("Status updated", "স্ট্যাটাস আপডেট হয়েছে"));
  };

  const remove = async (ticketId: string) => {
    if (!confirm(t("Delete this ticket?", "এই টিকেট মুছবেন?"))) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", ticketId);
    if (error) return toast.error(error.message);
    setTickets((prev) => prev.filter((tk) => tk.id !== ticketId));
    if (openId === ticketId) setOpenId(null);
    toast.success(t("Deleted", "মুছে ফেলা হয়েছে"));
  };

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

  return (
    <div className="space-y-5">
      {/* Header rendered globally by AdminPageHeader */}


      {/* Title + legend */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t("Support Tickets", "সাপোর্ট টিকেট")}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {lang === "bn" ? `${tickets.length} টি টিকেট` : `${tickets.length} tickets`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-rose-600">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {t("Urgent", "জরুরি")} <span className="text-slate-500">{legend.urgent}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {t("Open", "ওপেন")} <span className="text-slate-500">{legend.open}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t("Resolved", "সমাধান হয়েছে")} <span className="text-slate-500">{legend.resolved}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-1">
          {([
            ["all", t("All Tickets", "সব টিকেট"), counts.all, MessageCircle],
            ["refund", t("Refund Requests", "রিফান্ড রিকোয়েস্ট"), counts.refund, RefreshCcw],
            ["support", t("Support", "সাপোর্ট"), counts.support, MessageCircle],
          ] as const).map(([k, label, c, Icon]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => setTab(k as TabKey)}
                className={`inline-flex items-center gap-2 px-4 h-10 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition ${
                  active
                    ? "border-violet-500 text-violet-700 bg-white"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`text-[11px] font-bold px-1.5 rounded-full ${active ? "bg-white text-violet-700 border border-violet-200" : "bg-slate-100 text-slate-600"}`}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t("Loading…", "লোড হচ্ছে…")}
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500 shadow-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            {t("No tickets to show.", "দেখানোর মতো কোনো টিকেট নেই।")}
          </div>
        ) : (
          visible.map((tk) => {
            const m = meta(tk.category);
            const Icon = m.icon;
            const prof = profiles[tk.user_id];
            const isOpen = openId === tk.id;
            const isClosed = ["closed", "resolved"].includes((tk.status || "").toLowerCase());
            return (
              <div
                key={tk.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition"
              >
                <button
                  onClick={() => openTicket(tk.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-start gap-4"
                >
                  <span className={`shrink-0 w-10 h-10 rounded-full grid place-items-center border ${m.chip}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {shortId(tk.id, m.prefixEn)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.chip}`}>
                        {t(m.labelEn, m.labelBn)}
                      </span>
                      <StatusChip s={tk.status} t={t} />
                      <PriorityChip p={tk.priority} t={t} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800 font-medium truncate">{tk.subject}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {prof?.display_name || t("Customer", "কাস্টমার")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
                    <span>{dateFmt(tk.created_at)}</span>
                    <ChevronDown className={`w-4 h-4 transition ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-4 sm:p-5 space-y-4 bg-slate-50/40 rounded-b-2xl">
                    {/* Original message */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 mb-1">
                        {t("Original message", "মূল বার্তা")}
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{tk.message}</p>
                    </div>

                    {/* Conversation */}
                    <div className="space-y-2">
                      {(messages[tk.id] || []).map((msg) => {
                        const fromAdmin = msg.sender_role === "admin";
                        return (
                          <div
                            key={msg.id}
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              fromAdmin
                                ? "ml-auto bg-violet-600 text-white"
                                : "bg-white border border-slate-200 text-slate-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                            <div className={`text-[10px] mt-1 ${fromAdmin ? "text-violet-100" : "text-slate-400"}`}>
                              {new Date(msg.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply */}
                    {!isClosed && (
                      <div className="flex items-end gap-2">
                        <textarea
                          value={openId === tk.id ? reply : ""}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder={t("Write a reply…", "একটি উত্তর লিখুন…")}
                          rows={2}
                          className="flex-1 rounded-xl border border-slate-200 bg-white text-sm p-3 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                        />
                        <button
                          onClick={() => sendReply(tk.id)}
                          disabled={sending || !reply.trim()}
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {t("Send", "পাঠান")}
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!isClosed && (
                        <button
                          onClick={() => setStatus(tk.id, "resolved")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t("Mark resolved", "সমাধান চিহ্নিত করুন")}
                        </button>
                      )}
                      {tk.status !== "closed" && (
                        <button
                          onClick={() => setStatus(tk.id, "closed")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 hover:bg-slate-200"
                        >
                          {t("Close", "বন্ধ করুন")}
                        </button>
                      )}
                      {isClosed && (
                        <button
                          onClick={() => setStatus(tk.id, "open")}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 hover:bg-amber-100"
                        >
                          {t("Reopen", "পুনরায় খুলুন")}
                        </button>
                      )}
                      <button
                        onClick={() => remove(tk.id)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 hover:bg-rose-100 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("Delete", "মুছুন")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
