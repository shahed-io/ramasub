import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>): { q?: string; cat?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    cat: typeof search.cat === "string" ? search.cat : undefined,
  }),
  component: () => (
    <CategoryPage
      title="All Subscriptions"
      subtitle="বাংলাদেশের সবচেয়ে বড় প্রিমিয়াম সাবস্ক্রিপশন কালেকশন — Streaming, AI, Education, Music ও আরও।"
      showFilters
    />
  ),
  head: () => ({
    meta: [
      { title: "All Subscriptions — Rama Sub" },
      { name: "description", content: "Browse all premium subscriptions: Netflix, ChatGPT, Spotify, Canva, Coursera and more." },
      { property: "og:title", content: "All Subscriptions — Rama Sub" },
      { property: "og:description", content: "Browse the full catalog of premium digital subscriptions in Bangladesh." },
      { property: "og:url", content: "https://ramasub.com/products" },
    ],
    links: [{ rel: "canonical", href: "https://ramasub.com/products" }],
  }),
});
