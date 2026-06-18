import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/CategoryPage";

export const Route = createFileRoute("/ai-tools")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  component: () => (
    <CategoryPage
      title="🤖 AI & Productivity Tools"
      subtitle="ChatGPT Plus, Claude Pro, Gemini Advanced, Perplexity, Grammarly, Quillbot — কাজ আরও স্মার্ট হোক।"
      filter={(c) => c === "AI Tools" || c === "Productivity"}
      showFilters
    />
  ),
  head: () => ({
    meta: [
      { title: "AI & Productivity Subscriptions — AccessNow BD" },
      { name: "description", content: "ChatGPT Plus, Claude Pro, Gemini Advanced, Grammarly, Quillbot — AI tools for Bangladesh." },
      { property: "og:title", content: "AI & Productivity Subscriptions — AccessNow BD" },
      { property: "og:description", content: "All major AI tools and productivity apps at affordable prices." },
      { property: "og:url", content: "https://accessnowbd.com/ai-tools" },
    ],
    links: [{ rel: "canonical", href: "https://accessnowbd.com/ai-tools" }],
  }),
});
