import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { rememberReturnTo } from "@/lib/auth-return-to";


export const Route = createFileRoute("/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "My Orders — AccessNow BD" }] }),
});

type OrderItem = { slug: string; planPeriod: string; qty: number; name?: string; emoji?: string; gradient?: string; price?: number };
type Order = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  payment_method: string;
  transaction_id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border border-amber-400/30",
  processing: "bg-sky-500/15 text-sky-300 border border-sky-400/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
  cancelled: "bg-rose-500/15 text-rose-300 border border-rose-400/30",
};

function OrdersPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      rememberReturnTo();
      navigate({ to: "/login" });
      return;
    }
    if (user) {
      supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setOrders(((data as unknown) as Order[]) || []);
          setLoading(false);
        });
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <div className="mx-auto max-w-[1100px] px-4 md:px-10 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500 }}>My orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as <span className="font-semibold text-foreground">{user?.email}</span>
              {" · "}
              <Link to="/profile" className="text-primary font-semibold hover:underline">Edit profile</Link>
            </p>
          </div>
          <span className="text-sm text-muted-foreground">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
        </div>

        {orders.length === 0 ? (
          <div className="mt-10 glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 -z-10 opacity-60 bg-mesh pointer-events-none" />
            <div className="mx-auto w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-primary/30 to-aqua/20 border border-white/10 shadow-glow-violet">
              <Package className="w-8 h-8 text-foreground/90" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>No orders yet</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Browse our subscriptions and place your first order.</p>
            <Link to="/" className="btn-aurora inline-flex items-center mt-6 h-11 px-7 text-sm">
              Browse subscriptions
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((o) => (
              <Link to="/orders/$id" params={{ id: o.id }} key={o.id} className="block glass rounded-2xl p-5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-glow-violet transition-all duration-300">
                <article>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Order ID</div>
                    <div className="font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>{o.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full ${statusColors[o.status] || "bg-white/5 text-foreground border border-white/10"}`}>
                      {o.status}
                    </span>
                  </div>
                </header>

                <div className="mt-3 space-y-2">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${it.gradient ?? "from-primary/30 to-aqua/20"} border border-white/10 grid place-items-center text-lg`}>
                        {it.emoji ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-foreground">{it.name ?? it.slug}</div>
                        <div className="text-xs text-muted-foreground">{it.planPeriod} × {it.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <footer className="mt-4 grid sm:grid-cols-3 gap-3 text-xs border-t border-white/10 pt-3">
                  <div>
                    <div className="text-muted-foreground">Payment</div>
                    <div className="font-semibold capitalize text-foreground">{o.payment_method}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">TrxID</div>
                    <div className="font-semibold text-foreground">{o.transaction_id}</div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-bold text-aurora text-base" style={{ fontFamily: "var(--font-heading)" }}>৳{Number(o.total).toLocaleString()}</div>
                  </div>
                </footer>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
