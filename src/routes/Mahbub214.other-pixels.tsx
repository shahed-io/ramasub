import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/other-pixels")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/tracking-pixels", search: { tab: "other" } });
  },
});
