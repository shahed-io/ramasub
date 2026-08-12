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
    <div className="space-y-1">
      <div className={`floating-field-container ${error ? "!border-destructive/40" : ""}`}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder=" "
          inputMode={inputMode}
          className="floating-input"
        />
        <label className="floating-label">
          {label}
        </label>
        {Icon && (
          <Icon className={`
            absolute right-2 top-28 w-4 h-4 transition-colors shrink-0 -translate-y-[64px]
            ${error ? "text-destructive/70" : "text-muted-foreground/30 group-focus-within:text-primary"}
          `} />
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-destructive mt-1.5 ml-0.5 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
