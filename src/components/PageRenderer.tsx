import DOMPurify from "isomorphic-dompurify";
import type { PageBlock } from "@/lib/pages";
import { cn } from "@/lib/utils";

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "code", "pre",
      "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "hr", "img", "figure", "figcaption",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class", "style", "title"],
  });
}

function Block({ block }: { block: PageBlock }) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${block.level}` as unknown) as keyof JSX.IntrinsicElements;
      const sizes = { 1: "text-3xl md:text-5xl font-extrabold", 2: "text-2xl md:text-3xl font-bold", 3: "text-xl md:text-2xl font-bold" } as const;
      return <Tag className={cn(sizes[block.level], "tracking-tight mt-6 mb-3", block.align === "center" && "text-center", block.align === "right" && "text-right")}>{block.text}</Tag>;
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
