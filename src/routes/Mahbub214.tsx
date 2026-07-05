import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/Mahbub214")({
  component: AdminGateEntry,
  head: () => ({ meta: [{ title: "Admin — Rama Sub" }, { name: "robots", content: "noindex,nofollow" }] }),
});

export const ADMIN_GATE_KEY = "rs:admin-gate";

function AdminGateEntry() {
  const navigate = useNavigate();
  useEffect(() => {
    try { sessionStorage.setItem(ADMIN_GATE_KEY, "1"); } catch { /* ignore */ }
    navigate({ to: "/admin", replace: true });
  }, [navigate]);
  return (
    <div className="min-h-screen grid place-items-center bg-[#fafafa]">
      <div className="text-sm text-slate-500">Opening admin…</div>
    </div>
  );
}
