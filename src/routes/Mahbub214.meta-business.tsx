import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, Send, ShieldCheck,
  Activity, Database, KeyRound, Zap, Info, Save,
} from "lucide-react";
import {
  getMetaConfig, saveMetaConfig, verifyMetaConnection, sendMetaTestEvent,
} from "@/lib/meta-business.functions";

export const Route = createFileRoute("/Mahbub214/meta-business")({
  component: MetaBusinessPage,
});

type Cfg = {
  pixel_id: string | null;
  dataset_id: string | null;
  access_token_last4: string | null;
  test_event_code: string | null;
  graph_api_version: string;
  enable_pixel: boolean;
  auto_inject: boolean;
  load_in_head: boolean;
  load_after_consent: boolean;
  advanced_matching: boolean;
  auto_pageview: boolean;
  spa_nav: boolean;
  wc_detect: boolean;
  debug_mode: boolean;
  capi_enabled: boolean;
  capi_endpoint: string | null;
  capi_timeout_ms: number;
  capi_max_retry: number;
  capi_retry_failed: boolean;
  capi_queue_failed: boolean;
  consent_gdpr: boolean;
  consent_ccpa: boolean;
  consent_region_detect: boolean;
  last_verified_at: string | null;
  last_verify_result: { checks?: Record<string, { ok: boolean; msg: string }>; graph?: { ok: boolean; msg: string; pixel_name: string | null } } | null;
  last_event_at: string | null;
};

const GRAPH_VERSIONS = ["v21.0", "v20.0", "v19.0", "v18.0"];

function MetaBusinessPage() {
  const getCfg = useServerFn(getMetaConfig);
  const saveCfg = useServerFn(saveMetaConfig);
  const verifyFn = useServerFn(verifyMetaConnection);
  const testFn = useServerFn(sendMetaTestEvent);

  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tab, setTab] = useState<"overview" | "settings" | "pixel" | "capi">("overview");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await getCfg();
        setCfg(r.config as Cfg | null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Config load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [getCfg]);

  const patch = (p: Partial<Cfg>) => setCfg((c) => (c ? { ...c, ...p } : c));

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        pixel_id: cfg.pixel_id, dataset_id: cfg.dataset_id, test_event_code: cfg.test_event_code,
        graph_api_version: cfg.graph_api_version,
        enable_pixel: cfg.enable_pixel, auto_inject: cfg.auto_inject, load_in_head: cfg.load_in_head,
        load_after_consent: cfg.load_after_consent, advanced_matching: cfg.advanced_matching,
        auto_pageview: cfg.auto_pageview, spa_nav: cfg.spa_nav, wc_detect: cfg.wc_detect, debug_mode: cfg.debug_mode,
        capi_enabled: cfg.capi_enabled, capi_endpoint: cfg.capi_endpoint,
        capi_timeout_ms: cfg.capi_timeout_ms, capi_max_retry: cfg.capi_max_retry,
        capi_retry_failed: cfg.capi_retry_failed, capi_queue_failed: cfg.capi_queue_failed,
        consent_gdpr: cfg.consent_gdpr, consent_ccpa: cfg.consent_ccpa, consent_region_detect: cfg.consent_region_detect,
      };
      if (tokenInput.trim().length >= 10) payload.access_token = tokenInput.trim();
      await saveCfg({ data: payload });
      setTokenInput("");
      toast.success("Configuration saved");
      const r = await getCfg();
      setCfg(r.config as Cfg | null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const r = await verifyFn();
      if (r.graph.ok) toast.success(`Verified: ${r.graph.pixel_name || "Pixel"}`);
      else toast.error(`Verify failed: ${r.graph.msg}`);
      const rc = await getCfg();
      setCfg(rc.config as Cfg | null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testFn({ data: { event_name: "PageView" } });
      toast.success(`Test event sent (${r.latency_ms}ms)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading || !cfg) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const graphOk = cfg.last_verify_result?.graph?.ok === true;

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-violet-300 text-violet-700 text-sm font-semibold hover:bg-violet-50 disabled:opacity-50"
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Verify Connection
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-violet-300 text-violet-700 text-sm font-semibold hover:bg-violet-50 disabled:opacity-50"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Test Event
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "overview", label: "Overview" },
          { id: "settings", label: "Settings" },
          { id: "pixel", label: "Pixel Installation" },
          { id: "capi", label: "Conversions API" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === t.id ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard icon={ShieldCheck} label="Connection" value={graphOk ? "Connected" : "Not verified"} ok={graphOk} />
          <StatCard icon={Activity} label="Pixel" value={cfg.enable_pixel ? "Live" : "Off"} ok={cfg.enable_pixel} />
          <StatCard icon={Zap} label="Conversions API" value={cfg.capi_enabled ? "Enabled" : "Off"} ok={cfg.capi_enabled} />
          <StatCard icon={Send} label="Test Events" value={cfg.test_event_code ? "Code set" : "—"} ok={!!cfg.test_event_code} />
          <StatCard icon={Database} label="Dataset ID" value={cfg.dataset_id || "—"} ok={!!cfg.dataset_id} />
          <StatCard icon={KeyRound} label="Access Token" value={cfg.access_token_last4 ? `••••${cfg.access_token_last4}` : "—"} ok={!!cfg.access_token_last4} />
          <StatCard icon={Info} label="API Version" value={cfg.graph_api_version} ok />
          <StatCard icon={Activity} label="Last Event" value={cfg.last_event_at ? new Date(cfg.last_event_at).toLocaleString() : "Never"} ok={!!cfg.last_event_at} />
        </div>
      )}

      {tab === "settings" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <FormField
            label="Pixel ID"
            hint="Meta Events Manager → Data Sources → Pixel → Pixel ID"
            placeholder="123456789012345"
            value={cfg.pixel_id || ""}
            onChange={(v) => patch({ pixel_id: v })}
          />
          <FormField
            label="Dataset ID"
            hint="Events Manager → Settings → Dataset ID (Pixel ID এর সমান হতে পারে)"
            placeholder="987654321987654"
            value={cfg.dataset_id || ""}
            onChange={(v) => patch({ dataset_id: v })}
          />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Access Token (Conversions API)</div>
            <div className="text-[11px] text-slate-500 mb-2">Events Manager → Settings → Generate Access Token। Store securely, never exposed to browser.</div>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={cfg.access_token_last4 ? `Current token: ••••${cfg.access_token_last4} (leave blank to keep)` : "EAAxxxxxxxxxxxx..."}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none text-sm"
            />
          </div>
          <FormField
            label="Test Event Code"
            hint="Events Manager → Test Events। Optional; শুধু test করার সময় দিন।"
            placeholder="TEST12345"
            value={cfg.test_event_code || ""}
            onChange={(v) => patch({ test_event_code: v })}
          />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Graph API Version</div>
            <select
              value={cfg.graph_api_version}
              onChange={(e) => patch({ graph_api_version: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-violet-500 outline-none text-sm bg-white"
            >
              {GRAPH_VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {cfg.last_verify_result && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Last Verification</div>
              {Object.entries(cfg.last_verify_result.checks || {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  {v.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  <span className="text-slate-700">{v.msg}</span>
                </div>
              ))}
              {cfg.last_verify_result.graph && (
                <div className="flex items-center gap-2 text-sm">
                  {cfg.last_verify_result.graph.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                  <span className="text-slate-700">Graph API: {cfg.last_verify_result.graph.msg}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "pixel" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
          <ToggleRow label="Enable Pixel" hint="Master switch — সব tracking on/off" checked={cfg.enable_pixel} onChange={(v) => patch({ enable_pixel: v })} />
          <ToggleRow label="Auto Inject Pixel" hint="প্রতিটা page-এ automatic inject করে" checked={cfg.auto_inject} onChange={(v) => patch({ auto_inject: v })} />
          <ToggleRow label="Load in Head" hint="Off হলে body-এ inject হবে (slower)" checked={cfg.load_in_head} onChange={(v) => patch({ load_in_head: v })} />
          <ToggleRow label="Load after Consent" hint="GDPR/CCPA — consent এর পরে load হবে" checked={cfg.load_after_consent} onChange={(v) => patch({ load_after_consent: v })} />
          <ToggleRow label="Advanced Matching" hint="Email/phone SHA-256 hash করে Meta-কে দেয়" checked={cfg.advanced_matching} onChange={(v) => patch({ advanced_matching: v })} />
          <ToggleRow label="Automatic PageView" hint="প্রতিটা page load-এ PageView fire" checked={cfg.auto_pageview} onChange={(v) => patch({ auto_pageview: v })} />
          <ToggleRow label="SPA Navigation Support" hint="Client-side route change track করে" checked={cfg.spa_nav} onChange={(v) => patch({ spa_nav: v })} />
          <ToggleRow label="Auto Detect Checkout" hint="Checkout flow detect করে InitiateCheckout/Purchase fire করে" checked={cfg.wc_detect} onChange={(v) => patch({ wc_detect: v })} />
          <ToggleRow label="Debug Mode" hint="Console-এ event log দেখাবে" checked={cfg.debug_mode} onChange={(v) => patch({ debug_mode: v })} />
        </div>
      )}

      {tab === "capi" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <ToggleRow label="Enable Conversions API" hint="Server-side event pathway on/off" checked={cfg.capi_enabled} onChange={(v) => patch({ capi_enabled: v })} />
          <FormField
            label="Server URL (Endpoint override)"
            hint="Default Meta Graph API — শুধু server-side tagging এর জন্য override করুন"
            placeholder="https://graph.facebook.com/v21.0/{pixel_id}/events"
            value={cfg.capi_endpoint || ""}
            onChange={(v) => patch({ capi_endpoint: v })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Request Timeout (ms)</div>
              <input type="number" min={1000} max={60000} value={cfg.capi_timeout_ms}
                onChange={(e) => patch({ capi_timeout_ms: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-violet-500 outline-none text-sm" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Maximum Retry</div>
              <input type="number" min={0} max={10} value={cfg.capi_max_retry}
                onChange={(e) => patch({ capi_max_retry: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-violet-500 outline-none text-sm" />
            </div>
          </div>
          <ToggleRow label="Retry Failed Events" hint="Failed events automatic backoff-এ retry হবে" checked={cfg.capi_retry_failed} onChange={(v) => patch({ capi_retry_failed: v })} />
          <ToggleRow label="Queue Failed Events" hint="Retry exhaust হলে queue-এ থাকবে" checked={cfg.capi_queue_failed} onChange={(v) => patch({ capi_queue_failed: v })} />
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Consent (Section 15)</div>
            <ToggleRow label="GDPR compliance" checked={cfg.consent_gdpr} onChange={(v) => patch({ consent_gdpr: v })} />
            <ToggleRow label="CCPA compliance" checked={cfg.consent_ccpa} onChange={(v) => patch({ consent_ccpa: v })} />
            <ToggleRow label="Auto region detection" checked={cfg.consent_region_detect} onChange={(v) => patch({ consent_region_detect: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, ok }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; ok: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-violet-600" />
        <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`} />
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800 truncate mt-0.5">{value}</div>
    </div>
  );
}

function FormField({ label, hint, placeholder, value, onChange }: { label: string; hint?: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">{label}</div>
      {hint && <div className="text-[11px] text-slate-500 mb-2">{hint}</div>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-xl border border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none text-sm"
      />
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
      </div>
    </label>
  );
}
