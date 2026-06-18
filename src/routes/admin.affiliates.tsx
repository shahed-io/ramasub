import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  Clock,
  Activity,
  Wallet,
  DollarSign,
  MousePointerClick,
  Settings as SettingsIcon,
  Save,

  UserCheck,
  TrendingUp,
  Banknote,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminLang } from "@/context/AdminLangContext";

export const Route = createFileRoute("/admin/affiliates")({
  component: AffiliatesPage,
  head: () => ({
    meta: [
      { title: "Affiliates — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type TabKey = "settings" | "accounts" | "conversions" | "withdrawals" | "products";

type AffiliateSettings = {
  enabled: boolean;
  commission_enabled: boolean;
  customer_discount_enabled: boolean;
  auto_approve: boolean;
  default_commission: number;
  customer_discount: number;
  min_withdrawal: number;
  cookie_days: number;
  terms: string;
};

const DEFAULTS: AffiliateSettings = {
  enabled: true,
  commission_enabled: true,
  customer_discount_enabled: false,
  auto_approve: false,
  default_commission: 10,
  customer_discount: 0,
  min_withdrawal: 500,
  cookie_days: 30,
  terms: "",
};

function AffiliatesPage() {
  const { t } = useAdminLang();
  const [tab, setTab] = useState<TabKey>("settings");
  const [settings, setSettings] = useState<AffiliateSettings>(DEFAULTS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats] = useState({
    active: 2,
    pendingApps: 0,
    pendingConv: 0,
    pendingPayouts: 0,
    totalPaid: 0,
    totalClicks: 0,
  });

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("admin_records")
        .select("id, data")
        .eq("kind", "affiliate_settings")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setRecordId(data.id as string);
        setSettings({ ...DEFAULTS, ...((data.data as Partial<AffiliateSettings>) ?? {}) });
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      kind: "affiliate_settings",
      data: settings as unknown as Record<string, unknown>,
      is_active: true,
    } as never;
    const { error } = recordId
      ? await supabase.from("admin_records").update(payload).eq("id", recordId)
      : await supabase.from("admin_records").insert(payload).select("id").single();

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("Settings saved", "সেটিংস সংরক্ষিত"));
  };

  const set = <K extends keyof AffiliateSettings>(k: K, v: AffiliateSettings[K]) =>
    setSettings((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          {t("Affiliate Management", "অ্যাফিলিয়েট ম্যানেজমেন্ট")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {t(
            "Manage applications, commissions, conversions & payouts",
            "আবেদন, কমিশন, কনভার্সন ও পেআউট ম্যানেজ করুন"
          )}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat icon={<Users className="w-3.5 h-3.5" />} ring="ring-slate-200" iconColor="text-slate-600" label={t("Active Affiliates", "সক্রিয় অ্যাফিলিয়েট")} value={stats.active} valueColor="text-slate-900" />
        <Stat icon={<Clock className="w-3.5 h-3.5" />} ring="ring-amber-200" iconColor="text-amber-600" label={t("Pending Apps", "পেন্ডিং অ্যাপস")} value={stats.pendingApps} valueColor="text-amber-600" />
        <Stat icon={<Activity className="w-3.5 h-3.5" />} ring="ring-sky-200" iconColor="text-sky-600" label={t("Pending Conv.", "পেন্ডিং কনভ.")} value={stats.pendingConv} valueColor="text-sky-600" />
        <Stat icon={<Wallet className="w-3.5 h-3.5" />} ring="ring-fuchsia-200" iconColor="text-fuchsia-600" label={t("Pending Payouts", "পেন্ডিং পেআউট")} value={`৳${stats.pendingPayouts}`} valueColor="text-fuchsia-600" />
        <Stat icon={<DollarSign className="w-3.5 h-3.5" />} ring="ring-emerald-200" iconColor="text-emerald-600" label={t("Total Paid", "মোট পরিশোধিত")} value={`৳${stats.totalPaid}`} valueColor="text-emerald-600" />
        <Stat icon={<MousePointerClick className="w-3.5 h-3.5" />} ring="ring-rose-200" iconColor="text-rose-600" label={t("Total Clicks", "মোট ক্লিক")} value={stats.totalClicks} valueColor="text-rose-600" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100/70 p-1.5 rounded-2xl w-fit">
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon className="w-4 h-4" />}>
          {t("Settings", "সেটিংস")}
        </TabBtn>
        <TabBtn active={tab === "accounts"} onClick={() => setTab("accounts")} icon={<UserCheck className="w-4 h-4" />}>
          {t("Accounts", "অ্যাকাউন্ট")}
        </TabBtn>
        <TabBtn active={tab === "conversions"} onClick={() => setTab("conversions")} icon={<TrendingUp className="w-4 h-4" />}>
          {t("Conversions", "কনভার্সন")}
        </TabBtn>
        <TabBtn active={tab === "withdrawals"} onClick={() => setTab("withdrawals")} icon={<Banknote className="w-4 h-4" />}>
          {t("Withdrawals", "উইথড্রয়াল")}
        </TabBtn>
        <TabBtn active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="w-4 h-4" />}>
          {t("Products", "প্রোডাক্ট")}
        </TabBtn>
      </div>

      {tab === "settings" && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-7 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-slate-700">
                <SettingsIcon className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-extrabold text-slate-900">
                {t("Global Settings", "গ্লোবাল সেটিংস")}
              </h3>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? t("Saving…", "সংরক্ষণ হচ্ছে…") : t("Save Settings", "সংরক্ষণ করুন")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleRow
              title={t("Enable Affiliate Program", "অ্যাফিলিয়েট প্রোগ্রাম সক্রিয়")}
              desc={t("Master switch for the entire system", "সম্পূর্ণ সিস্টেমের মাস্টার সুইচ")}
              value={settings.enabled}
              onChange={(v) => set("enabled", v)}
            />
            <ToggleRow
              title={t("Affiliate Commission", "অ্যাফিলিয়েট কমিশন")}
              desc={t("Pay commission to affiliates on referred orders", "রেফার্ড অর্ডারে কমিশন প্রদান")}
              value={settings.commission_enabled}
              onChange={(v) => set("commission_enabled", v)}
            />
            <ToggleRow
              title={t("Customer Discount", "কাস্টমার ডিসকাউন্ট")}
              desc={t("Give discount to customers using affiliate links", "অ্যাফিলিয়েট লিংক ব্যবহারকারীদের ডিসকাউন্ট")}
              value={settings.customer_discount_enabled}
              onChange={(v) => set("customer_discount_enabled", v)}
            />
            <ToggleRow
              title={t("Auto-approve Applications", "অটো-অনুমোদন আবেদন")}
              desc={t("Skip manual review of new affiliates", "নতুন অ্যাফিলিয়েটের ম্যানুয়াল রিভিউ স্কিপ")}
              value={settings.auto_approve}
              onChange={(v) => set("auto_approve", v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Field label={t("Default Commission %", "ডিফল্ট কমিশন %")}>
              <input
                type="number"
                value={settings.default_commission}
                onChange={(e) => set("default_commission", Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </Field>
            <Field label={t("Customer Discount %", "কাস্টমার ডিসকাউন্ট %")}>
              <input
                type="number"
                value={settings.customer_discount}
                onChange={(e) => set("customer_discount", Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </Field>
            <Field label={t("Min Withdrawal (৳)", "ন্যূনতম উইথড্রয়াল (৳)")}>
              <input
                type="number"
                value={settings.min_withdrawal}
                onChange={(e) => set("min_withdrawal", Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </Field>
            <Field label={t("Cookie Duration (days)", "কুকি মেয়াদ (দিন)")}>
              <input
                type="number"
                value={settings.cookie_days}
                onChange={(e) => set("cookie_days", Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </Field>
          </div>

          <Field label={t("Terms & Conditions (shown on application)", "শর্তাবলী (আবেদনে দেখানো হবে)")}>
            <textarea
              value={settings.terms}
              onChange={(e) => set("terms", e.target.value)}
              rows={5}
              placeholder={t("Enter terms…", "শর্তাবলী লিখুন…")}
              className="w-full px-3.5 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y"
            />
          </Field>
        </div>
      )}

      {tab !== "settings" && (
        <EmptyTab tab={tab} t={t} />
      )}
    </div>
  );
}

function Stat({
  icon,
  ring,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  ring: string;
  iconColor: string;
  label: string;
  value: number | string;
  valueColor: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
        <span className={`w-5 h-5 rounded-full bg-white grid place-items-center ring-1 ${ring} ${iconColor}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className={`text-2xl font-extrabold mt-1.5 ${valueColor}`}>{value}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition ${
        active
          ? "bg-white text-violet-700 shadow-sm ring-1 ring-slate-200"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${
          value ? "bg-violet-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-700 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function EmptyTab({ tab, t }: { tab: TabKey; t: (en: string, bn: string) => string }) {
  const labels: Record<Exclude<TabKey, "settings">, { en: string; bn: string; icon: React.ReactNode }> = {
    accounts: { en: "No affiliate accounts yet", bn: "এখনো কোনো অ্যাফিলিয়েট নেই", icon: <UserCheck className="w-7 h-7" /> },
    conversions: { en: "No conversions yet", bn: "এখনো কোনো কনভার্সন নেই", icon: <TrendingUp className="w-7 h-7" /> },
    withdrawals: { en: "No withdrawal requests", bn: "কোনো উইথড্রয়াল রিকোয়েস্ট নেই", icon: <Banknote className="w-7 h-7" /> },
    products: { en: "No featured products", bn: "কোনো ফিচার্ড প্রোডাক্ট নেই", icon: <Package className="w-7 h-7" /> },
  };
  const item = labels[tab as Exclude<TabKey, "settings">];
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 grid place-items-center text-slate-400">
        {item.icon}
      </div>
      <p className="text-sm text-slate-500 mt-3">{t(item.en, item.bn)}</p>
    </div>
  );
}
