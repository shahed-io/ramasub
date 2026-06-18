import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProductMarkdown } from "@/components/ProductMarkdown";

const TEMPLATE = `# Product Name – Short Value Proposition

Brief intro paragraph describing what this product does and why customers love it.

## Choose Your Plan

- 🟪 **Basic** – Essential features for getting started
- 🟦 **Standard** – Most popular, great balance of price & power
- 🟩 **Premium** – Full access, all features unlocked

## Powerful Features

- Lightning fast performance
- Works on all devices
- Regular updates included
- 24/7 customer support

## Perfect For

- Students and learners
- Freelancers and creators
- Small business owners
- Anyone who wants premium quality

## Why Buy From AccessNow BD

- ✅ 100% genuine & verified
- ✅ Instant delivery after payment
- ✅ Money-back guarantee
- ✅ Trusted by 10,000+ happy customers

## Delivery Information

Your product details will be delivered to your email within minutes after payment confirmation. For any help, contact us on WhatsApp: **+880 1580-607614**.
`;

export const Route = createFileRoute("/admin/description-preview")({
  head: () => ({
    meta: [
      { title: "Description Preview — Admin" },
      { name: "description", content: "Live preview of product description markdown." },
    ],
  }),
  component: DescriptionPreviewPage,
});

function DescriptionPreviewPage() {
  const [source, setSource] = useState(TEMPLATE);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
          Description Live Preview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit markdown on the left, see the styled product description on the right in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold">Markdown source</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSource(TEMPLATE)}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
              >
                Reset to template
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(source)}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
              >
                Copy
              </button>
            </div>
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[70vh] font-mono text-sm p-4 rounded-lg border border-border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-2">Live preview</label>
          <div className="min-h-[70vh] p-5 rounded-lg border border-border bg-card overflow-auto">
            <ProductMarkdown source={source} />
          </div>
        </div>
      </div>
    </div>
  );
}
