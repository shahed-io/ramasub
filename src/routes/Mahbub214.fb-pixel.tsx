import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/Mahbub214/fb-pixel")({
  beforeLoad: () => {
    throw redirect({ to: "/Mahbub214/tracking-pixels", search: { tab: "facebook_pixel" } });
  },
});
