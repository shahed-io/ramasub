import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Frown } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminNotFound,
  head: () => ({
    meta: [
      { title: "404 — Page Not Found" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminNotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="relative mx-auto w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-100 to-orange-100 blur-xl opacity-70" />
          <div className="relative w-full h-full rounded-full bg-white shadow-lg ring-1 ring-slate-200 grid place-items-center">
            <Frown className="w-14 h-14 text-rose-500" strokeWidth={1.6} />
          </div>
        </div>
        <div className="text-[80px] leading-none font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500">
          404
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          দুঃখিত! আপনি যে পেজটি খুঁজছেন সেটি খুঁজে পাওয়া যায়নি। লিঙ্কটি ভুল হতে পারে অথবা পেজটি সরিয়ে ফেলা হয়েছে।
        </p>
        <div className="mt-7 flex items-center justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 text-white font-semibold text-sm shadow-lg shadow-fuchsia-500/30 hover:shadow-xl hover:shadow-fuchsia-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
