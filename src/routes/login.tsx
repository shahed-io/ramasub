import { createFileRoute } from "@tanstack/react-router";
import { AuthPageEntry } from "@/components/AuthPage";

export const Route = createFileRoute("/login")({
  component: () => <AuthPageEntry initialMode="login" />,
  head: () => ({
    meta: [
      { title: "Sign in — AccessNow BD" },
      { name: "description", content: "Sign in to your AccessNow BD account to manage orders and digital products." },
    ],
  }),
});
