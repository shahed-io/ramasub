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
      <div className="relative group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.02] rounded-full -mr-16 -mt-16 blur-3xl transition-transform group-hover:scale-110 duration-700" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Receiver Number</span>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm`} style={{ backgroundColor: brandColor }}>
              {methodName} Personal
            </div>
          </div>
          
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-3xl font-black tracking-tight tabular-nums text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {methodNumber}
              </div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{sendMoneyLabel} Amount shown in total</p>
            </div>
            
            <button
              onClick={copyNumber}
              className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 ${copied ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-foreground text-background hover:shadow-lg shadow-foreground/20"}`}
            >
              {copied ? <Check className="w-5 h-5" strokeWidth={3} /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground/80 ml-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          How to pay
        </h3>
        <div className="grid gap-3">
          {instructions.map((step, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 transition-all hover:border-primary/40 hover:shadow-sm">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-[10px] font-black grid place-items-center shrink-0">
                {i + 1}
              </span>
              <p className="text-[13px] font-medium text-foreground/90 leading-tight pt-0.5">{step}</p>
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
