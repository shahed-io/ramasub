import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/google-ads")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/tracking-pixels", search: { tab: "google_ads" } });
  },
});
