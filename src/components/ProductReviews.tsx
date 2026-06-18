import { useEffect, useState } from "react";
import { Star, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

function StarRow({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Comp = onChange ? "button" : "span";
        return (
          <Comp
            key={n}
            type={onChange ? "button" : undefined}
            onClick={onChange ? () => onChange(n) : undefined}
            className={onChange ? "transition-transform hover:scale-110" : ""}
            aria-label={onChange ? `Rate ${n} stars` : undefined}
          >
            <Star
              size={size}
              className={filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60"}
            />
          </Comp>
        );
      })}
    </div>
  );
}

export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("product_reviews")
        .select("id, reviewer_name, rating, comment, created_at")
        .eq("product_slug", slug)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (mounted) {
        setReviews((data as Review[]) ?? []);
        setLoading(false);
      }
    })();

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      if (data.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .maybeSingle();
        if (mounted) {
          setUserName(prof?.display_name || data.user.email?.split("@")[0] || "");
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [slug]);

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please sign in to leave a review");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please write a comment");
      return;
    }
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .insert({
        product_slug: slug,
        user_id: userId,
        reviewer_name: userName.trim(),
        rating,
        comment: comment.trim(),
      })
      .select("id, reviewer_name, rating, comment, created_at")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks for your review!");
    setReviews((prev) => [data as Review, ...prev]);
    setComment("");
    setRating(5);
  };

  const visible = showAll ? reviews : reviews.slice(0, 5);

  return (
    <section className="relative mx-auto max-w-[1200px] px-4 md:px-8 py-10">
      <h2 className="flex items-center gap-3 text-xl md:text-2xl font-extrabold text-foreground mb-4">
        <span className="inline-block w-1.5 h-6 md:h-7 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
        Customer Reviews
      </h2>

      {/* Summary */}
      <div className="rounded-2xl bg-card border border-border shadow-[0_10px_30px_-18px_rgba(15,23,42,0.18)] p-5 md:p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-extrabold text-foreground">{avg.toFixed(1)}</div>
          <div>
            <StarRow value={Math.round(avg)} size={18} />
            <div className="text-xs text-muted-foreground mt-1">
              Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </div>

      {/* Submit form */}
      <div className="rounded-2xl bg-card border border-border shadow-[0_10px_30px_-18px_rgba(15,23,42,0.18)] p-5 md:p-6 mb-6">
        <h3 className="text-base font-semibold text-foreground mb-3">Write a review</h3>
        {!userId ? (
          <p className="text-sm text-muted-foreground">
            Please{" "}
            <a href="/login" className="text-violet-700 font-medium underline">
              sign in
            </a>{" "}
            to leave a review.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="flex-1 h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating:</span>
                <StarRow value={rating} size={22} onChange={setRating} />
              </div>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7)" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit review
            </button>
          </form>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No reviews yet. Be the first to review!
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-card border border-border p-4 md:p-5 shadow-[0_6px_20px_-14px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
                  >
                    {r.reviewer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{r.reviewer_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <StarRow value={r.rating} size={14} />
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{r.comment}</p>
            </div>
          ))}
          {reviews.length > 5 && (
            <div className="text-center pt-2">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="text-sm font-medium text-violet-700 hover:text-violet-900"
              >
                {showAll ? "Show less" : `Show all ${reviews.length} reviews`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
