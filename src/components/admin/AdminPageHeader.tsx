import { useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ADMIN_MENU, type AdminMenuItem } from "@/lib/admin-menu";
import { useAdminLang } from "@/context/AdminLangContext";

type Desc = { en: string; bn: string };

// Short, plain-language descriptions per admin route. Falls back to group label
// when no entry exists.
const DESCRIPTIONS: Record<string, Desc> = {
  "/admin": { en: "Overview of orders, revenue and store activity", bn: "অর্ডার, আয় ও স্টোর অ্যাক্টিভিটির সারসংক্ষেপ" },
  "/admin/analytics": { en: "Store performance, traffic & sales insights", bn: "স্টোর পারফরম্যান্স, ট্রাফিক ও সেল ইনসাইট" },
  "/admin/customer-insights": { en: "Understand your customers and their behaviour", bn: "কাস্টমার ও তাদের আচরণ বুঝুন" },
  "/admin/activity-log": { en: "Track every admin and system action", bn: "অ্যাডমিন ও সিস্টেমের প্রতিটি কাজ ট্র্যাক করুন" },

  "/admin/orders": { en: "View, search and update customer orders", bn: "কাস্টমার অর্ডার দেখুন, খুঁজুন ও আপডেট করুন" },
  "/admin/abandoned-checkout": { en: "Recover carts customers left behind", bn: "অসমাপ্ত চেকআউট রিকভার করুন" },
  "/admin/quick-sale": { en: "Create a manual order in seconds", bn: "মুহূর্তেই ম্যানুয়াল অর্ডার তৈরি করুন" },
  "/admin/payment-links": { en: "Send payable links to customers", bn: "কাস্টমারকে পেমেন্ট লিঙ্ক পাঠান" },
  "/admin/invoice-generator": { en: "Generate invoices for any order", bn: "যেকোনো অর্ডারের জন্য ইনভয়েস তৈরি করুন" },
  "/admin/invoice-design": { en: "Customize how your invoices look", bn: "ইনভয়েসের ডিজাইন কাস্টমাইজ করুন" },
  "/admin/payments": { en: "Manage payment methods and transactions", bn: "পেমেন্ট মেথড ও লেনদেন ম্যানেজ করুন" },
  "/admin/bkash-pgw": { en: "bKash payment gateway configuration", bn: "bKash পেমেন্ট গেটওয়ে কনফিগ" },
  "/admin/bkash-transactions": { en: "All bKash transactions in one place", bn: "সব bKash লেনদেন এক জায়গায়" },
  "/admin/license-manager": { en: "Manage product licenses and keys", bn: "প্রোডাক্ট লাইসেন্স ও কী ম্যানেজ করুন" },
  "/admin/customer-licenses": { en: "Licenses assigned to each customer", bn: "প্রতিটি কাস্টমারের লাইসেন্স দেখুন" },
  "/admin/order-recovery": { en: "Recover failed or stuck orders", bn: "ব্যর্থ বা আটকে যাওয়া অর্ডার রিকভার করুন" },
  "/admin/tracking": { en: "Track order delivery status", bn: "অর্ডার ডেলিভারি স্ট্যাটাস ট্র্যাক করুন" },
  "/admin/wallet": { en: "Store wallet balance and transactions", bn: "স্টোর ওয়ালেট ব্যালেন্স ও লেনদেন" },
  "/admin/account-delivery": { en: "Deliver account credentials to buyers", bn: "ক্রেতাকে অ্যাকাউন্ট ক্রেডেনশিয়াল ডেলিভারি দিন" },
  "/admin/checkout-policy": { en: "Set rules and policies for checkout", bn: "চেকআউটের নিয়ম ও পলিসি সেট করুন" },
  "/admin/custom-invoice": { en: "Create a fully custom invoice", bn: "সম্পূর্ণ কাস্টম ইনভয়েস তৈরি করুন" },
  "/admin/quick-tools": { en: "Bulk WhatsApp & quick admin shortcuts", bn: "বাল্ক WhatsApp ও কুইক অ্যাডমিন শর্টকাট" },

  "/admin/products": { en: "All products in your catalog", bn: "ক্যাটালগের সব প্রোডাক্ট" },
  "/admin/add-product": { en: "Add a new product to your store", bn: "নতুন প্রোডাক্ট যোগ করুন" },
  "/admin/bulk-update": { en: "Update many products at once", bn: "একসাথে অনেক প্রোডাক্ট আপডেট করুন" },
  "/admin/categories": { en: "Organize products into categories", bn: "প্রোডাক্ট ক্যাটাগরি অনুযায়ী সাজান" },
  "/admin/inventory": { en: "Track stock and inventory levels", bn: "স্টক ও ইনভেন্টরি ট্র্যাক করুন" },
  "/admin/media-gallery": { en: "Manage uploaded images and media", bn: "আপলোড করা ছবি ও মিডিয়া ম্যানেজ করুন" },
  "/admin/description-template": { en: "Templates for product descriptions", bn: "প্রোডাক্ট ডেসক্রিপশনের টেমপ্লেট" },
  "/admin/description-preview": { en: "Preview how descriptions will look", bn: "ডেসক্রিপশন কেমন দেখাবে প্রিভিউ করুন" },

  "/admin/users": { en: "View and manage all customers", bn: "সব কাস্টমার দেখুন ও ম্যানেজ করুন" },
  "/admin/notifications": { en: "Send and manage notifications", bn: "নোটিফিকেশন পাঠান ও ম্যানেজ করুন" },
  "/admin/reviews": { en: "Approve, edit and reply to reviews", bn: "রিভিউ অনুমোদন, এডিট ও জবাব দিন" },
  "/admin/tickets": { en: "Support requests from customers", bn: "কাস্টমারদের সাপোর্ট রিকোয়েস্ট" },
  "/admin/referral": { en: "Reward customers for referrals", bn: "রেফারেলের জন্য কাস্টমারকে রিওয়ার্ড দিন" },
  "/admin/affiliates": { en: "Manage affiliate partners and payouts", bn: "অ্যাফিলিয়েট পার্টনার ও পেআউট ম্যানেজ করুন" },

  "/admin/homepage-editor": { en: "Edit homepage sections and content", bn: "হোমপেজের সেকশন ও কন্টেন্ট এডিট করুন" },
  "/admin/banner-slider": { en: "Manage homepage banner slides", bn: "হোমপেজ ব্যানার স্লাইড ম্যানেজ করুন" },
  "/admin/footer-editor": { en: "Edit footer links and content", bn: "ফুটার লিঙ্ক ও কন্টেন্ট এডিট করুন" },
  "/admin/announcement-bar": { en: "Top announcement bar message", bn: "উপরের ঘোষণা বার মেসেজ" },
  "/admin/welcome-popup": { en: "Configure the welcome popup", bn: "ওয়েলকাম পপআপ কনফিগ করুন" },
  "/admin/ceo-message": { en: "CEO message shown on the site", bn: "সাইটে দেখানো CEO বার্তা" },
  "/admin/themes": { en: "Switch and customize the storefront theme", bn: "স্টোরফ্রন্ট থিম পরিবর্তন ও কাস্টমাইজ করুন" },
  "/admin/shop-config": { en: "Shop info and WhatsApp settings", bn: "শপ তথ্য ও WhatsApp সেটিংস" },
  "/admin/whatsapp-button": { en: "Floating WhatsApp button settings", bn: "ফ্লোটিং WhatsApp বাটন সেটিংস" },
  "/admin/support-widget": { en: "Support chat widget settings", bn: "সাপোর্ট চ্যাট উইজেট সেটিংস" },

  "/admin/coupons": { en: "Create and manage discount coupons", bn: "ডিসকাউন্ট কুপন তৈরি ও ম্যানেজ করুন" },
  "/admin/promotions": { en: "Promotional offers and campaigns", bn: "প্রমোশনাল অফার ও ক্যাম্পেইন" },
  "/admin/review-generator": { en: "Generate authentic looking reviews", bn: "অথেনটিক লুকিং রিভিউ তৈরি করুন" },
  "/admin/security": { en: "Security settings and admin access", bn: "সিকিউরিটি সেটিংস ও অ্যাডমিন অ্যাক্সেস" },
};

const HIDE_ON = new Set(["/admin", "/admin/analytics"]);

function findItem(pathname: string): { group: { id: string; title: string; titleBn?: string; icon: ReactNode }; item: AdminMenuItem } | null {
  for (const g of ADMIN_MENU) {
    const item = g.items.find((i) => i.to === pathname);
    if (item) return { group: g as any, item };
  }
  return null;
}

export function AdminPageHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useAdminLang();
  if (HIDE_ON.has(pathname)) return null;
  const ctx = useMemo(() => findItem(pathname), [pathname]);
  if (!ctx) return null;

  const { group, item } = ctx;
  const title = t(item.label, item.labelBn ?? item.label);
  const groupLabel = t(group.title, group.titleBn ?? group.title);
  const desc = DESCRIPTIONS[item.to];
  const subtitle = desc
    ? `${groupLabel} • ${t(desc.en, desc.bn)}`
    : `${groupLabel} • ${t("Manage and configure", "ম্যানেজ ও কনফিগার করুন")}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-sky-50 p-5 sm:p-6 mb-5">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 w-56 h-56 rounded-full bg-violet-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-0 w-72 h-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="relative flex items-start gap-4 min-w-0">
        <span className="shrink-0 w-12 h-12 rounded-xl bg-white shadow-sm ring-1 ring-violet-100 grid place-items-center text-violet-600 [&_svg]:w-6 [&_svg]:h-6">
          {item.icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent truncate">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-snug">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
