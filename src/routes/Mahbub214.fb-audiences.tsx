import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/fb-audiences")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/tracking-pixels", search: { tab: "fb_audience" } });
  },
});
