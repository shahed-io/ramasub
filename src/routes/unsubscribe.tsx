import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Unsubscribe — AccessNow BD" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/email/unsubscribe?token=${encodeURIComponent(token)}`,
        );
        const json = await res.json();
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (json.valid === false && json.reason === "already_unsubscribed") {
          setState({ kind: "already" });
          return;
        }
        if (json.valid) {
          setState({ kind: "valid" });
          return;
        }
        setState({ kind: "invalid" });
      } catch {
        setState({ kind: "invalid" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        setState({
          kind: "error",
          message: json?.error || "Failed to unsubscribe",
        });
        return;
      }
      if (json.success || json.reason === "already_unsubscribed") {
        setState({ kind: "success" });
      } else {
        setState({ kind: "error", message: "Unexpected response" });
      }
    } catch {
      setState({ kind: "error", message: "Network error" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Email Unsubscribe
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          AccessNow BD email preferences
        </p>

        {state.kind === "loading" && (
          <p className="text-muted-foreground">Verifying your link…</p>
        )}

        {state.kind === "invalid" && (
          <div className="space-y-2">
            <p className="text-destructive font-semibold">Invalid or expired link</p>
            <p className="text-sm text-muted-foreground">
              This unsubscribe link is no longer valid.
            </p>
          </div>
        )}

        {state.kind === "already" && (
          <p className="text-foreground">
            You're already unsubscribed. No more emails will be sent.
          </p>
        )}

        {state.kind === "valid" && (
          <>
            <p className="text-foreground mb-6">
              Are you sure you want to unsubscribe from AccessNow BD emails?
            </p>
            <button
              onClick={confirm}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Confirm Unsubscribe
            </button>
          </>
        )}

        {state.kind === "submitting" && (
          <p className="text-muted-foreground">Processing…</p>
        )}

        {state.kind === "success" && (
          <div className="space-y-2">
            <p className="text-foreground font-semibold">
              You've been unsubscribed.
            </p>
            <p className="text-sm text-muted-foreground">
              You will no longer receive marketing emails from us.
            </p>
          </div>
        )}

        {state.kind === "error" && (
          <p className="text-destructive">{state.message}</p>
        )}
      </div>
    </div>
  );
}
