import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
  const { assertAdminMfaGrant } = await import("@/lib/admin-mfa-guard.server");
  await assertAdminMfaGrant(userId);
}

/** Admin-only: returns a short-lived signed URL for a wallet top-up screenshot. */
export const getWalletScreenshotUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        // Storage object key: "<uuid>/<file>". No absolute paths, no traversal.
        path: z
          .string()
          .trim()
          .min(3)
          .max(500)
          .regex(/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/, "Invalid file path")
          .refine((v) => !v.includes(".."), "Invalid file path"),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("payment-screenshots")
      .createSignedUrl(data.path, 60 * 5); // 5 minutes
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
