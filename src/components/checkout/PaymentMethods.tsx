import { Check, Wallet, CreditCard, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface PayMethod {
  id: string;
  name: string;
  number: string;
  color: string;
  logo_url?: string;
}

interface PaymentMethodsProps {
  methods: PayMethod[];
  selectedMethod: string;
  onSelect: (id: string) => void;
  walletBalance: number;
  useWallet: boolean;
  onWalletToggle: (val: boolean) => void;
  epsEnabled: boolean;
  sslczEnabled: boolean;
  subAfterCoupon: number;
}

export function PaymentMethods({
  methods,
  selectedMethod,
  onSelect,
  walletBalance,
  useWallet,
  onWalletToggle,
  epsEnabled,
  sslczEnabled,
  subAfterCoupon
}: PaymentMethodsProps) {
  const isWalletMethod = selectedMethod === "wallet";
  const isEpsMethod = selectedMethod === "eps";
  const isSslczMethod = selectedMethod === "sslcommerz";
  
  const walletInsufficient = isWalletMethod && walletBalance < subAfterCoupon;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
          <CreditCard className="w-4 h-4" />
        </div>
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Payment Method
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Wallet Option */}
        <button
          onClick={() => { onSelect("wallet"); onWalletToggle(true); }}
          className={`group relative flex flex-col items-center justify-center p-4 rounded-[2rem] border-2 transition-all duration-300 bg-white
            ${isWalletMethod 
              ? "border-primary ring-4 ring-primary/5 bg-white shadow-md" 
              : "border-slate-100 hover:border-primary/20 hover:bg-slate-50"
            }`}
        >
          <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center transition-transform duration-500 group-hover:scale-110
            ${isWalletMethod ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"}`}>
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-[13px] font-bold text-foreground">Wallet</span>
          <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums mt-0.5">৳{walletBalance.toLocaleString()}</span>
          {isWalletMethod && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md animate-in zoom-in duration-300">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
          )}
        </button>

        {/* Dynamic MFS Methods */}
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => { onSelect(m.id); onWalletToggle(false); }}
            className={`group relative flex flex-col items-center justify-center p-4 rounded-[2rem] border-2 transition-all duration-300 bg-white
              ${selectedMethod === m.id 
                ? "border-primary ring-4 ring-primary/5 bg-white shadow-md" 
                : "border-slate-100 hover:border-primary/20 hover:bg-slate-50"
              }`}
          >
            <div className="w-12 h-12 mb-3 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              {m.logo_url ? (
                <img src={m.logo_url} alt={m.name} className="w-full h-full object-contain filter drop-shadow-sm" />
              ) : (
                <div className={`w-12 h-12 rounded-2xl ${m.color} text-white flex items-center justify-center text-[10px] font-black uppercase shadow-lg`}>
                  {m.name.slice(0, 4)}
                </div>
              )}
            </div>
            <span className="text-[13px] font-bold text-foreground">{m.name}</span>
            <span className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">MFS</span>
            {selectedMethod === m.id && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md animate-in zoom-in duration-300">
                <Check className="w-3 h-3" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}

        {/* Gateways */}
        {epsEnabled && (
          <button
            onClick={() => { onSelect("eps"); onWalletToggle(false); }}
            className={`group relative flex flex-col items-center justify-center p-4 rounded-[2rem] border-2 transition-all duration-300 bg-white
              ${isEpsMethod 
                ? "border-primary ring-4 ring-primary/5 bg-white shadow-md" 
                : "border-slate-100 hover:border-primary/20 hover:bg-slate-50"
              }`}
          >
            <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center transition-transform duration-500 group-hover:scale-110
              ${isEpsMethod ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
              <span className="text-xs font-black italic">EPS</span>
            </div>
            <span className="text-[13px] font-bold text-foreground">EPS Online</span>
            <span className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">Cards/Bank</span>
            {isEpsMethod && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md animate-in zoom-in duration-300">
                <Check className="w-3 h-3" strokeWidth={3} />
              </div>
            )}
          </button>
        )}

        {sslczEnabled && (
          <button
            onClick={() => { onSelect("sslcommerz"); onWalletToggle(false); }}
            className={`group relative flex flex-col items-center justify-center p-4 rounded-[2rem] border-2 transition-all duration-300 bg-white
              ${isSslczMethod 
                ? "border-primary ring-4 ring-primary/5 bg-white shadow-md" 
                : "border-slate-100 hover:border-primary/20 hover:bg-slate-50"
              }`}
          >
            <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center transition-transform duration-500 group-hover:scale-110
              ${isSslczMethod ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-muted text-muted-foreground"}`}>
              <span className="text-[10px] font-black">SSL</span>
            </div>
            <span className="text-[13px] font-bold text-foreground">SSLCommerz</span>
            <span className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">Global</span>
            {isSslczMethod && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md animate-in zoom-in duration-300">
                <Check className="w-3 h-3" strokeWidth={3} />
              </div>
            )}
          </button>
        )}
      </div>

      {/* Method Info Banners */}
      {(isEpsMethod || isSslczMethod) && (
        <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4 animate-in fade-in slide-in-from-left-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 grid place-items-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[14px] font-bold text-foreground">Secure Payment Gateway</h4>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              You will be redirected to the secure {isEpsMethod ? "EPS" : "SSLCommerz"} payment page to complete your transaction via Card, Net Banking, or MFS.
            </p>
          </div>
        </div>
      )}

      {isWalletMethod && (
        <div className={`p-5 rounded-3xl border flex items-start gap-4 animate-in fade-in slide-in-from-left-4 
          ${walletInsufficient ? "bg-destructive/5 border-destructive/10" : "bg-primary/5 border-primary/10"}`}>
          <div className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 
            ${walletInsufficient ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-[14px] font-bold text-foreground">
              {walletInsufficient ? "Insufficient Balance" : "Wallet Payment Selected"}
            </h4>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {walletInsufficient 
                ? `You need ৳${subAfterCoupon.toLocaleString()} but only have ৳${walletBalance.toLocaleString()} in your wallet.`
                : `৳${subAfterCoupon.toLocaleString()} will be deducted from your account balance instantly upon order confirmation.`}
            </p>
          </div>
          {walletInsufficient && (
            <Link to="/wallet" className="px-4 py-2 rounded-xl bg-destructive text-white text-[11px] font-bold hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20">
              Top-up
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
