import { createFileRoute } from "@tanstack/react-router";
import { AuthPageEntry } from "@/components/AuthPage";

export const Route = createFileRoute("/register")({
  component: () => <AuthPageEntry initialMode="signup" />,
  head: () => ({
    meta: [
      { title: "Create account — AccessNow BD" },
      { name: "description", content: "Register a free AccessNow BD account to order digital products and subscriptions." },
    ],
  }),
});
