import { createFileRoute } from "@tanstack/react-router";
import { Route as AdminRoute } from "./admin";

export const Route = createFileRoute("/admin/$")({
  component: AdminRoute.options.component!,
  head: () => ({
    meta: [
      { title: "404 — Page Not Found" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
