import { LucideIcon } from "lucide-react";

interface PillFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url" | "decimal" | "search";
  icon?: LucideIcon;
}

export function PillField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  inputMode,
  icon: Icon
}: PillFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-semibold text-muted-foreground/80 ml-4 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        <div className={`
          flex items-center gap-3 px-5 h-13 rounded-2xl border bg-white transition-all duration-300
          ${error 
            ? "border-destructive/30 ring-4 ring-destructive/5" 
            : "border-slate-200 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 shadow-sm hover:border-slate-300"
          }
        `}>
          {Icon && <Icon className={`w-4 h-4 transition-colors ${error ? "text-destructive/70" : "text-muted-foreground/60 group-focus-within:text-primary/70"}`} />}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            inputMode={inputMode}
            className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground/40 font-medium h-full"
          />
        </div>
        {error && (
          <p className="text-[11px] font-medium text-destructive mt-1 ml-4 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
