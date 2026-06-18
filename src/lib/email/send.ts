import { supabase } from "@/integrations/supabase/client";

export interface SendTransactionalEmailArgs {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
}

/**
 * Client helper: enqueues a transactional email via /lovable/email/transactional/send.
 * Requires the user to be authenticated — the route validates the Supabase JWT.
 */
export async function sendTransactionalEmail({
  templateName,
  recipientEmail,
  idempotencyKey,
  templateData,
}: SendTransactionalEmailArgs): Promise<{ success: boolean; reason?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be signed in to send this email.");

  const res = await fetch("/lovable/email/transactional/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      templateName,
      recipientEmail,
      idempotencyKey,
      templateData,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to send email (${res.status})`);
  }
  return res.json();
}
