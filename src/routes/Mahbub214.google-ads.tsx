import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/Mahbub214/google-ads")({
  beforeLoad: () => {
    throw redirect({ to: "/Mahbub214/tracking-pixels", search: { tab: "google_ads" } });
  },
});
