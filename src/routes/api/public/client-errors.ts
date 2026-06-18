import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ErrorSchema = z.object({
  type: z.enum(["error", "unhandledrejection", "console.error"]).default("error"),
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  url: z.string().max(1000).optional(),
  source: z.string().max(500).optional(),
  line: z.number().optional(),
  column: z.number().optional(),
  userAgent: z.string().max(500).optional(),
  timestamp: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/public/client-errors")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const data = ErrorSchema.parse(json);
          // Logged to server console — viewable via server-function-logs
          console.error("[client-error]", JSON.stringify(data));
        } catch (e) {
          console.error("[client-error] invalid payload", e);
          return new Response("Bad Request", { status: 400 });
        }
        return new Response("ok", { status: 200 });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
