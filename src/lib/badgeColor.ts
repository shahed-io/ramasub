// Map a badge label to a Tailwind color class. Admins can pick any badge text;
// this gives consistent visual color based on common labels.
export function badgeColorFor(badge: string | null | undefined): string {
  if (!badge) return "bg-primary text-white";
  const k = badge.toLowerCase();
  if (k.includes("popular")) return "bg-[var(--color-orange)] text-white";
  if (k.includes("hot")) return "bg-[var(--color-teal)] text-black";
  if (k.includes("best")) return "bg-primary text-white";
  if (k.includes("new")) return "bg-[var(--color-warning)] text-black";
  if (k.includes("trending")) return "bg-primary text-white";
  if (k.includes("pro") || k.includes("premium")) return "bg-[var(--color-cyan-deep)] text-white";
  if (k.includes("sale") || k.includes("off")) return "bg-destructive text-white";
  return "bg-primary text-white";
}
