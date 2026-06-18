import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/fb-pixel")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/tracking-pixels", search: { tab: "facebook_pixel" } });
  },
});
