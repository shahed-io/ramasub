import type { PageBlock } from "@/lib/pages";
import { cn } from "@/lib/utils";

// Minimal HTML sanitizer: strips <script>/<iframe>/<style>/<object>/<embed> and on* handlers.
function sanitizeHtml(html: string) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<\/?(script|iframe|style|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
}

function Block({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "heading": {
      const level = block.level;
      const sizes = { 1: "text-3xl md:text-5xl font-extrabold", 2: "text-2xl md:text-3xl font-bold", 3: "text-xl md:text-2xl font-bold" } as const;
      const cls = cn(sizes[level], "tracking-tight mt-6 mb-3", block.align === "center" && "text-center", block.align === "right" && "text-right");
      if (level === 1) return <h1 className={cls}>{block.text}</h1>;
      if (level === 3) return <h3 className={cls}>{block.text}</h3>;
      return <h2 className={cls}>{block.text}</h2>;
    }
    case "paragraph":
      return <div className="prose max-w-none my-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }} />;
    case "image":
      if (!block.url) return null;
      return (
        <figure className="my-5">
          <img src={block.url} alt={block.alt ?? ""} loading="lazy" className="rounded-2xl w-full max-w-full h-auto shadow-sm" style={block.width ? { maxWidth: block.width } : undefined} />
          {block.caption ? <figcaption className="text-xs text-muted-foreground mt-2 text-center">{block.caption}</figcaption> : null}
        </figure>
      );
    case "button": {
      const cls = block.variant === "secondary"
        ? "bg-white border border-slate-200 text-slate-900"
        : block.variant === "ghost"
          ? "bg-transparent text-primary hover:underline"
          : "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md";
      return (
        <div className="my-5">
          <a href={block.href || "#"} className={cn("inline-flex items-center h-11 px-6 rounded-full font-semibold text-sm", cls)}>
            {block.label}
          </a>
        </div>
      );
    }
    case "divider":
      return <hr className="my-8 border-slate-200" />;
    case "html":
      return <div className="my-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.code) }} />;
    case "faq":
      return (
        <div className="my-6 space-y-3">
          {block.items.map((it, i) => (
            <details key={i} className="group rounded-2xl border border-slate-200 bg-white p-4 open:shadow-sm">
              <summary className="cursor-pointer font-semibold list-none flex items-center justify-between gap-3">
                <span>{it.q}</span>
                <span className="text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <div className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{it.a}</div>
            </details>
          ))}
        </div>
      );
  }
}

export function PageRenderer({ blocks, className }: { blocks: PageBlock[] | undefined; className?: string }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className={cn("mx-auto max-w-3xl px-4 md:px-8 py-6", className)}>
      {blocks.map((b) => <Block key={b.id} block={b} />)}
    </div>
  );
}
