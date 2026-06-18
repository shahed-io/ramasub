import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

const URL = "https://accessnowbd.com/blog/how-to-buy-netflix-in-bangladesh";
const TITLE = "How to Buy Netflix Subscription in Bangladesh (bKash & Nagad) — 2026 Guide";
const DESCRIPTION =
  "ধাপে ধাপে গাইড: bKash বা Nagad দিয়ে Bangladesh থেকে Netflix subscription কেনা, ছাড়াই international credit card. দাম, plan, delivery time সব এক জায়গায়।";
const PUBLISHED = "2026-06-12";

export const Route = createFileRoute("/blog/how-to-buy-netflix-in-bangladesh")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to Buy Netflix Subscription in Bangladesh",
          description: DESCRIPTION,
          datePublished: PUBLISHED,
          totalTime: "PT15M",
          estimatedCost: { "@type": "MonetaryAmount", currency: "BDT", value: "350" },
          supply: ["bKash or Nagad account", "Netflix account email"],
          step: [
            { "@type": "HowToStep", name: "Choose a plan", text: "Pick your Netflix plan (Mobile, Basic, Standard, or Premium) on accessnowbd.com." },
            { "@type": "HowToStep", name: "Place order", text: "Add the plan to cart and enter your Netflix email." },
            { "@type": "HowToStep", name: "Pay with bKash or Nagad", text: "Send payment to the merchant number shown at checkout and submit the transaction ID." },
            { "@type": "HowToStep", name: "Receive access", text: "We activate your Netflix account and deliver login details via WhatsApp within 30 minutes." },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Can I buy Netflix in Bangladesh without a credit card?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. AccessNow BD lets you pay with bKash or Nagad — no international card required.",
              },
            },
            {
              "@type": "Question",
              name: "How long does delivery take?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Most orders are activated within 15–30 minutes after we verify the bKash/Nagad payment.",
              },
            },
            {
              "@type": "Question",
              name: "Is it official Netflix?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes — you get a real Netflix account with full features on the plan you bought.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: NetflixGuide,
});

function NetflixGuide() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <span>Blog</span>
          <span className="mx-2">/</span>
          <span>How to buy Netflix in Bangladesh</span>
        </nav>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            How to Buy Netflix Subscription in Bangladesh (bKash &amp; Nagad)
          </h1>
          <p className="text-muted-foreground mt-2">
            Updated June 2026 · 5 min read
          </p>

          <p className="mt-6">
            Bangladesh-এ Netflix subscription কিনতে গিয়ে সবচেয়ে বড় সমস্যা হলো —
            international credit card নেই। ভালো খবর: bKash বা Nagad দিয়েই
            আপনি Netflix-এর সব plan কিনতে পারেন, কোনো ডলার endorsement বা
            dual-currency card ছাড়াই।
          </p>

          <h2>Netflix plan-এর দাম Bangladesh-এ (২০২৬)</h2>
          <ul>
            <li><b>Mobile</b> — শুধু phone/tablet, 1 screen, 480p</li>
            <li><b>Basic</b> — 1 screen, 720p HD</li>
            <li><b>Standard</b> — 2 screens, 1080p Full HD</li>
            <li><b>Premium</b> — 4 screens, 4K Ultra HD + HDR</li>
          </ul>
          <p>
            লাইভ দাম এবং offer দেখুন{" "}
            <Link to="/streaming" className="text-primary underline">
              Streaming subscriptions page
            </Link>{" "}
            -এ।
          </p>

          <h2>Step-by-step: bKash বা Nagad দিয়ে Netflix কিনুন</h2>
          <ol>
            <li>
              <b>Plan select করুন</b> — আমাদের{" "}
              <Link to="/streaming" className="text-primary underline">/streaming</Link>{" "}
              page থেকে আপনার প্রয়োজন অনুযায়ী Mobile / Basic / Standard / Premium বেছে নিন।
            </li>
            <li>
              <b>Order place করুন</b> — Add to cart-এ ক্লিক করে checkout-এ যান এবং
              যে email-এ Netflix চান সেটি দিন।
            </li>
            <li>
              <b>bKash / Nagad-এ payment পাঠান</b> — checkout-এ দেখানো merchant number-এ
              "Send Money" করুন এবং Transaction ID submit করুন।
            </li>
            <li>
              <b>Login details বুঝে নিন</b> — Payment verify হওয়ার ১৫–৩০ মিনিটের মধ্যে
              WhatsApp-এ আপনার Netflix login আমরা পাঠিয়ে দেব।
            </li>
          </ol>

          <h2>কেন AccessNow BD থেকে কিনবেন?</h2>
          <ul>
            <li>✅ ১০০% official Netflix account — full features, all devices</li>
            <li>✅ bKash, Nagad, Rocket — local payment-এ সরাসরি কেনাকাটা</li>
            <li>✅ ১৫–৩০ মিনিটে instant delivery</li>
            <li>✅ Warranty এবং WhatsApp support পুরো subscription period জুড়ে</li>
          </ul>

          <h2>সাধারণ প্রশ্ন</h2>
          <h3>Credit card ছাড়া Netflix কেনা কি সম্ভব?</h3>
          <p>হ্যাঁ — bKash বা Nagad-এই যথেষ্ট। কোনো dollar endorsement লাগবে না।</p>

          <h3>Delivery কত সময় নেয়?</h3>
          <p>Payment verify হলে সাধারণত ১৫–৩০ মিনিটের মধ্যে account active হয়ে যায়।</p>

          <h3>এটা কি আসল Netflix?</h3>
          <p>হ্যাঁ — official Netflix subscription, যেটা আপনার বাছাই করা plan-এর সব feature সহ চলবে।</p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg">
              <Link to="/streaming">Browse Netflix plans</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">Talk to support</Link>
            </Button>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
