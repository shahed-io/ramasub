import { sendTelegramNotification } from "./telegram.functions";

type NotifyInput = {
  event:
    | "order_created"
    | "order_status_changed"
    | "wallet_topup"
    | "support_ticket"
    | "chat_message"
    | "offer_submission"
    | "new_signup"
    | "abandoned_checkout"
    | "test";
  title?: string;
  lines?: Array<[string, string | number]>;
  message?: string;
  url?: string;
};

/** Fire-and-forget Telegram notification. Never throws — never blocks UX. */
export function notifyTelegram(input: NotifyInput): void {
  try {
    void sendTelegramNotification({ data: input }).catch(() => {});
  } catch {
    /* silent */
  }
}
