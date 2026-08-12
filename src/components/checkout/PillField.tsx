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
    <div className="space-y-2">
      <label className="text-[10px] font-black text-muted-foreground/60 ml-0.5 uppercase tracking-[0.15em]">
        {label}
      </label>
      <div className="relative group">
        <div className={`
          flex items-center gap-3 transition-all duration-300 border-b-2 bg-transparent
          ${error 
            ? "border-destructive/40" 
            : "border-slate-200 focus-within:border-primary"
          }
        `}>
          {Icon && (
            <Icon className={`
              w-4 h-4 transition-colors shrink-0
              ${error ? "text-destructive/70" : "text-muted-foreground/40 group-focus-within:text-primary"}
            `} />
          )}
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            inputMode={inputMode}
            className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 placeholder:text-muted-foreground/30 font-bold h-12 py-2"
          />
        </div>
        {error && (
          <p className="text-[10px] font-bold text-destructive mt-1.5 ml-0.5 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
