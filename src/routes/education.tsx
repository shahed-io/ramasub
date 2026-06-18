import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/education")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  component: () => (
    <CategoryPage
      title="🎓 Educational & Creative Tools"
      subtitle="Coursera Plus, Canva Pro, CapCut Pro, Adobe Creative Cloud — শেখার ও বানানোর জন্য সব কিছু।"
      filter={(c) => c === "Education" || c === "Design"}
      showFilters
    />
  ),
  head: () => ({
    meta: [
      { title: "Educational & Creative Subscriptions — AccessNow BD" },
      { name: "description", content: "Coursera Plus, Canva Pro, CapCut Pro, Adobe Creative Cloud — premium learning and design tools." },
      { property: "og:title", content: "Educational & Creative Subscriptions — AccessNow BD" },
      { property: "og:description", content: "Best prices on learning and design subscriptions in Bangladesh." },
      { property: "og:url", content: "https://accessnowbd.com/education" },
    ],
    links: [{ rel: "canonical", href: "https://accessnowbd.com/education" }],
  }),
});
