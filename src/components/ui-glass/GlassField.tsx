import { InputHTMLAttributes, TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

interface BaseProps {
  label: string;
  error?: string | null;
  helper?: string;
}

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
    multiline?: false;
  };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

export function GlassField(props: InputProps | TextareaProps) {
  const id = useId();
  const helperId = `${id}-helper`;
  const { label, error, helper, className, multiline, required, ...rest } =
    props as BaseProps & {
      className?: string;
      multiline?: boolean;
      required?: boolean;
    } & Record<string, unknown>;

  const fieldClasses = cn(
    "w-full px-4 rounded-xl glass-soft text-sm text-foreground placeholder:text-muted-foreground/70",
    "outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    error && "ring-2 ring-destructive",
    multiline ? "py-3 min-h-[96px]" : "h-11",
    className,
  );

  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {multiline ? (
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || helper ? helperId : undefined}
          className={cn("mt-1.5", fieldClasses)}
          required={required}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || helper ? helperId : undefined}
          className={cn("mt-1.5", fieldClasses)}
          required={required}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {(error || helper) && (
        <span
          id={helperId}
          role={error ? "alert" : undefined}
          className={cn(
            "block mt-1.5 text-xs",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error || helper}
        </span>
      )}
    </label>
  );
}
