import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/categories")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  head: () => ({
    meta: [
      { title: "All Categories — AccessNow BD" },
      { name: "description", content: "Browse every product category on AccessNow BD — streaming, AI tools, education, design, VPN, Office and more." },
      { property: "og:title", content: "All Categories — AccessNow BD" },
      { property: "og:description", content: "Browse every product category on AccessNow BD." },
      { property: "og:url", content: "https://accessnowbd.com/categories" },
    ],
    links: [{ rel: "canonical", href: "https://accessnowbd.com/categories" }],
  }),
  component: () => (
    <CategoryPage
      title="সব ক্যাটাগরি"
      subtitle="আপনার পছন্দের ক্যাটাগরি বেছে নিন — প্রতিটি ক্যাটাগরিতে সব verified প্রোডাক্ট পাবেন।"
      showFilters
    />
  ),
});
