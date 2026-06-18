import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap — AccessNow BD" },
      { name: "description", content: "AccessNow BD-এর সব পেজের তালিকা — streaming, AI tools, education, account ও support পেজসহ পুরো সাইট ম্যাপ।" },
      { property: "og:title", content: "Sitemap — AccessNow BD" },
      { property: "og:description", content: "আমাদের সাইটের সব পেজ এক জায়গায়।" },
    ],
  }),
  component: SitemapPage,
});

type Section = {
  title: string;
  bn: string;
  links: { to: string; label: string; bn: string; params?: Record<string, string> }[];
};

const sections: Section[] = [
  {
    title: "Main",
    bn: "প্রধান",
    links: [
      { to: "/", label: "Home", bn: "হোম" },
      { to: "/products", label: "All Products", bn: "সব প্রোডাক্ট" },
      { to: "/contact", label: "Contact", bn: "যোগাযোগ" },
    ],
  },
  {
    title: "Categories",
    bn: "ক্যাটাগরি",
    links: [
      { to: "/streaming", label: "Streaming Services", bn: "স্ট্রিমিং সার্ভিস" },
      { to: "/ai-tools", label: "AI & Productivity Tools", bn: "এআই ও প্রোডাক্টিভিটি টুলস" },
      { to: "/education", label: "Education & Courses", bn: "শিক্ষা ও কোর্স" },
    ],
  },
  {
    title: "Account",
    bn: "অ্যাকাউন্ট",
    links: [
      { to: "/login", label: "Login / Sign up", bn: "লগইন / সাইন আপ" },
      { to: "/profile", label: "My Profile", bn: "আমার প্রোফাইল" },
      { to: "/orders", label: "My Orders", bn: "আমার অর্ডার" },
      { to: "/cart", label: "Cart", bn: "কার্ট" },
      { to: "/checkout", label: "Checkout", bn: "চেকআউট" },
      { to: "/reset-password", label: "Reset Password", bn: "পাসওয়ার্ড রিসেট" },
    ],
  },
  {
    title: "Help",
    bn: "সহায়তা",
    links: [
      { to: "/faq", label: "FAQ", bn: "প্রশ্নোত্তর" },
      { to: "/contact", label: "Contact Support", bn: "সাপোর্ট" },
      { to: "/sitemap", label: "Sitemap", bn: "সাইটম্যাপ" },
    ],
  },
];

function SitemapPage() {
  const { data: products } = useQuery({
    queryKey: ["sitemap-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("slug, name")
        .limit(12);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            Sitemap
          </h1>
          <p className="mt-3 text-muted-foreground">
            AccessNow BD-এর সব পেজ এক জায়গায় — সহজে নেভিগেট করুন।
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-lg"
            >
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                {section.title}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {section.bn}
                </span>
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/90 transition-all hover:bg-primary/10 hover:text-primary"
                    >
                      <span>
                        <span className="font-medium">{link.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {link.bn}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-primary">
                        {link.to}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {products && products.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-xl shadow-lg sm:col-span-2">
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Featured Products{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / নির্বাচিত প্রোডাক্ট
                </span>
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <li key={p.slug}>
                    <Link
                      to="/product/$slug"
                      params={{ slug: p.slug }}
                      className="block rounded-lg px-3 py-2 text-sm text-foreground/90 transition-all hover:bg-primary/10 hover:text-primary"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          XML sitemap:{" "}
          <a href="/sitemap.xml" className="underline hover:text-primary">
            /sitemap.xml
          </a>
        </p>
      </div>
    </div>
  );
}
