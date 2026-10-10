import { Copy, Check, ShieldCheck, Upload, Loader2, X } from "lucide-react";
import { useState } from "react";

interface PaymentInstructionsProps {
  methodName: string;
  methodNumber: string;
  brandColor: string;
  sendMoneyLabel: string;
  instructions: string[];
  trxId: string;
  senderNumber: string;
  onTrxIdChange: (v: string) => void;
  onSenderNumberChange: (v: string) => void;
  onTrxIdBlur?: () => void;
  onSenderNumberBlur?: () => void;
  trxIdError?: string | null;
  senderNumberError?: string | null;
  screenshotUrl: string;
  uploading: boolean;
  onScreenshotUpload: (file: File) => void;
  onScreenshotRemove: () => void;
}

export function PaymentInstructions({
  methodName,
  methodNumber,
  brandColor,
  sendMoneyLabel,
  instructions,
  trxId,
  senderNumber,
  onTrxIdChange,
  onSenderNumberChange,
  onTrxIdBlur,
  onSenderNumberBlur,
  trxIdError,
  senderNumberError,
  screenshotUrl,
  uploading,
  onScreenshotUpload,
  onScreenshotRemove
}: PaymentInstructionsProps) {
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    await navigator.clipboard.writeText(methodNumber.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Number Card */}
      <div className="relative group overflow-hidden rounded-[2rem] p-6 shadow-lg transition-transform duration-500 hover:-translate-y-1" style={{ background: `linear-gradient(145deg, #ffffff 0%, ${brandColor}12 100%)`, boxShadow: `0 12px 35px -10px ${brandColor}40` }}>
        <div className="absolute inset-0 rounded-[2rem] border-2 border-white pointer-events-none" />
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110 duration-700 opacity-60" style={{ backgroundColor: brandColor }} />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: brandColor }}>Receiver Number</span>
            <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold text-white shadow-md`} style={{ backgroundColor: brandColor }}>
              {methodName} Personal
            </div>
          </div>
          
          <div className="flex items-end justify-between gap-4 pt-2">
            <div className="space-y-1.5">
              <div className="text-3xl md:text-4xl font-black tracking-tight tabular-nums text-slate-900 drop-shadow-sm" style={{ fontFamily: "var(--font-heading)" }}>
                {methodNumber}
              </div>
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: brandColor }}></span>
                {sendMoneyLabel} Amount shown in total
              </p>
            </div>
            
            <button
              onClick={copyNumber}
              className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 ${copied ? "text-white shadow-lg" : "bg-slate-900 text-white hover:shadow-xl hover:-translate-y-1"}`}
              style={copied ? { backgroundColor: "#10b981", boxShadow: "0 8px 25px -8px #10b981" } : { boxShadow: "0 8px 25px -8px rgba(15,23,42,0.5)" }}
            >
              {copied ? <Check className="w-6 h-6" strokeWidth={3} /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-5 pt-2">
        <h3 className="text-[15px] font-bold text-slate-800 ml-2 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg text-white shadow-sm" style={{ backgroundColor: brandColor }}>
            <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
          </div>
          How to pay via {methodName}
        </h3>
        <div className="grid gap-3.5">
          {instructions.map((step, i) => (
            <div key={i} className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 transition-all hover:border-transparent hover:shadow-md">
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: brandColor }} />
              <span className="w-8 h-8 rounded-xl text-white text-[13px] font-black grid place-items-center shrink-0 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: brandColor }}>
                {i + 1}
              </span>
              <p className="text-[14px] font-semibold text-slate-700 leading-snug pt-0.5 relative z-10">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Fields */}
      <div className="space-y-8 pt-2">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-1">
            <div className={`floating-field-container ${senderNumberError ? "field-error" : ""}`}>
              <input
                value={senderNumber}
                onChange={(e) => onSenderNumberChange(e.target.value)}
                onBlur={onSenderNumberBlur}
                placeholder=" "
                className="floating-input"
              />
              <label className="floating-label">Sender Number</label>
            </div>
            {senderNumberError && <p className="text-[11px] font-semibold text-destructive/90 mt-1.5 ml-0.5">{senderNumberError}</p>}
          </div>

          <div className="space-y-1">
            <div className={`floating-field-container ${trxIdError ? "field-error" : ""}`}>
              <input
                value={trxId}
                onChange={(e) => onTrxIdChange(e.target.value.toUpperCase())}
                onBlur={onTrxIdBlur}
                placeholder=" "
                className="floating-input"
              />
              <label className="floating-label">Transaction ID</label>
            </div>
            {trxIdError && <p className="text-[11px] font-semibold text-destructive/90 mt-1.5 ml-0.5">{trxIdError}</p>}
          </div>
        </div>


        {/* Screenshot Upload */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-muted-foreground/70 ml-4 uppercase tracking-wider">Payment Screenshot (Optional)</label>
          <div className="relative">
            {screenshotUrl ? (
              <div className="relative aspect-video w-full rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.02] overflow-hidden group">
                <img 
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/payment-screenshots/${screenshotUrl}`} 
                  alt="Screenshot" 
                  className="w-full h-full object-contain p-4"
                />
                <button 
                  onClick={onScreenshotRemove}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-destructive text-white shadow-xl grid place-items-center hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label className={`
                w-full h-32 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 cursor-pointer group flex flex-col items-center justify-center gap-2
                ${uploading ? "bg-slate-50 animate-pulse border-slate-200" : "bg-white border-slate-200 hover:border-primary/50 hover:bg-primary/[0.01]"}
              `}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onScreenshotUpload(e.target.files[0])}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:-translate-y-1">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-[12px] font-bold text-muted-foreground group-hover:text-primary transition-colors">Click to upload screenshot</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
