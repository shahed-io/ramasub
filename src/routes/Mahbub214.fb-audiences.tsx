import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/Mahbub214/fb-audiences")({
  beforeLoad: () => {
    throw redirect({ to: "/Mahbub214/tracking-pixels", search: { tab: "fb_audience" } });
  },
});
