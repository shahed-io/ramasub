import { createFileRoute } from "@tanstack/react-router";
import { AuthPageEntry } from "@/components/AuthPage";

export const Route = createFileRoute("/forgot-password")({
  component: () => <AuthPageEntry initialMode="login" openForgot />,
  head: () => ({
    meta: [
      { title: "Forgot password — Rama Sub" },
      { name: "description", content: "Reset your Rama Sub account password securely." },
    ],
  }),
});
