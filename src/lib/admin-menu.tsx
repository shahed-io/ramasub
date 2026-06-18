import type { ReactNode } from "react";
import {
  LayoutDashboard, Package, PlusSquare, FolderTree, Image as ImageIcon, PartyPopper,
  Megaphone, Star, Percent, MessageCircle, Images, Home, PanelBottom,
  ShoppingBag, Users, Wallet, CreditCard, Truck, Boxes, Bell, FileText,
  TicketPercent, Gift, Share2, Megaphone as MegaphoneIcon, Target, Activity, BarChart3, Search,
  MapPin, LifeBuoy, BookOpen, Headphones,
  FileEdit, Newspaper, UserCircle2, Download,
  PieChart, UsersRound, ClipboardList, Bot, Settings, ShieldCheck, DatabaseBackup, ShoppingCart, ListChecks, Sparkles,
  Plug, Mail, CalendarDays, Code2,
} from "lucide-react";

export type AdminBadge = "LIVE" | "NEW" | "BETA";

export type AdminMenuItem = {
  to: string;
  label: string;
  labelBn?: string;
  icon: ReactNode;
  /** Tailwind gradient classes for the round icon background */
  grad: string;
  /** Optional small status badge (LIVE, NEW, BETA) */
  badge?: AdminBadge;
  /** If true, render as the dashboard root */
  exact?: boolean;
};

export type AdminMenuGroup = {
  id: string;
  title: string;
  titleBn?: string;
  icon: ReactNode;
  items: AdminMenuItem[];
};

const ic = (Icon: any) => <Icon className="w-5 h-5" strokeWidth={2.75} absoluteStrokeWidth />;

export const ADMIN_MENU: AdminMenuGroup[] = [
  {
    id: "overview",
    title: "Overview",
    titleBn: "ওভারভিউ",
    icon: ic(LayoutDashboard),
    items: [
      { to: "/admin", label: "Dashboard", labelBn: "ড্যাশবোর্ড", icon: ic(LayoutDashboard), grad: "from-violet-500 to-indigo-500", exact: true },
      { to: "/admin/analytics", label: "Analytics Dashboard", labelBn: "অ্যানালিটিক্স ড্যাশবোর্ড", icon: ic(PieChart), grad: "from-violet-500 to-indigo-600" },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    titleBn: "সেলস",
    icon: ic(ShoppingCart),
    items: [
      { to: "/admin/orders", label: "Orders", labelBn: "অর্ডার", icon: ic(ShoppingBag), grad: "from-orange-500 to-amber-500", badge: "LIVE" },
      { to: "/admin/abandoned-checkout", label: "Abandoned Checkout", labelBn: "অ্যাবান্ডনড চেকআউট", icon: ic(ShoppingCart), grad: "from-fuchsia-500 to-pink-500", badge: "NEW" },
      { to: "/admin/quick-sale", label: "Quick Sale", labelBn: "কুইক সেল", icon: ic(Sparkles), grad: "from-violet-500 to-fuchsia-500" },
      { to: "/admin/payment-links", label: "Payment Links", labelBn: "পেমেন্ট লিঙ্ক", icon: ic(CreditCard), grad: "from-teal-500 to-emerald-600", badge: "NEW" },
      { to: "/admin/invoice-generator", label: "Invoice Generator", labelBn: "ইনভয়েস জেনারেটর", icon: ic(FileText), grad: "from-sky-500 to-blue-600" },
      { to: "/admin/invoice-design", label: "Invoice Design", labelBn: "ইনভয়েস ডিজাইন", icon: ic(FileEdit), grad: "from-fuchsia-500 to-pink-500", badge: "NEW" },
      { to: "/admin/payments", label: "Payments", labelBn: "পেমেন্ট", icon: ic(CreditCard), grad: "from-emerald-500 to-green-600" },
      { to: "/admin/bkash-pgw", label: "bKash PGW", labelBn: "bKash PGW", icon: ic(CreditCard), grad: "from-pink-500 to-rose-500", badge: "NEW" },
      { to: "/admin/bkash-transactions", label: "bKash Transactions", labelBn: "bKash ট্রানজেকশন", icon: ic(Activity), grad: "from-orange-500 to-pink-500", badge: "NEW" },
      { to: "/admin/license-manager", label: "License Manager", labelBn: "লাইসেন্স ম্যানেজার", icon: ic(ShieldCheck), grad: "from-rose-500 to-red-600" },
      { to: "/admin/customer-licenses", label: "Customer Licenses", labelBn: "কাস্টমার লাইসেন্স", icon: ic(ShieldCheck), grad: "from-rose-500 to-pink-600", badge: "NEW" },
      { to: "/admin/order-recovery", label: "Order Recovery", labelBn: "অর্ডার রিকভারি", icon: ic(ShoppingCart), grad: "from-emerald-500 to-teal-500" },
      { to: "/admin/tracking", label: "Order Tracking", labelBn: "অর্ডার ট্র্যাকিং", icon: ic(MapPin), grad: "from-emerald-500 to-teal-600" },
      { to: "/admin/wallet", label: "Wallet", labelBn: "ওয়ালেট", icon: ic(Wallet), grad: "from-amber-400 to-orange-500" },
    ],
  },
  {
    id: "catalog",
    title: "Catalog",
    titleBn: "ক্যাটালগ",
    icon: ic(Package),
    items: [
      { to: "/admin/products", label: "All Products", labelBn: "সব প্রোডাক্ট", icon: ic(Package), grad: "from-violet-500 to-fuchsia-500" },
      { to: "/admin/add-product", label: "Add New Product", labelBn: "নতুন প্রোডাক্ট যোগ", icon: ic(PlusSquare), grad: "from-emerald-500 to-teal-500" },
      { to: "/admin/bulk-update", label: "Bulk Update", labelBn: "বাল্ক আপডেট", icon: ic(ListChecks), grad: "from-amber-500 to-orange-500" },
      { to: "/admin/categories", label: "Categories", labelBn: "ক্যাটাগরি", icon: ic(FolderTree), grad: "from-slate-600 to-indigo-700" },
      { to: "/admin/inventory", label: "Inventory", labelBn: "ইনভেন্টরি", icon: ic(Boxes), grad: "from-amber-500 to-orange-500" },
      { to: "/admin/media-gallery", label: "Media Gallery", labelBn: "মিডিয়া গ্যালারি", icon: ic(Images), grad: "from-blue-500 to-indigo-600" },
      { to: "/admin/description-template", label: "Description Template", labelBn: "ডেসক্রিপশন টেমপ্লেট", icon: ic(FileEdit), grad: "from-violet-500 to-fuchsia-500" },
      { to: "/admin/description-preview", label: "Description Preview", labelBn: "ডেসক্রিপশন প্রিভিউ", icon: ic(FileEdit), grad: "from-fuchsia-500 to-pink-500" },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    titleBn: "কাস্টমার",
    icon: ic(Users),
    items: [
      { to: "/admin/users", label: "Customers", labelBn: "কাস্টমার", icon: ic(Users), grad: "from-cyan-500 to-teal-500" },
      { to: "/admin/notifications", label: "Notifications", labelBn: "নোটিফিকেশন", icon: ic(Bell), grad: "from-rose-500 to-red-500" },
      { to: "/admin/reviews", label: "Manage Reviews", labelBn: "রিভিউ ম্যানেজ", icon: ic(Star), grad: "from-amber-400 to-orange-500" },
      { to: "/admin/tickets", label: "Support Tickets", labelBn: "সাপোর্ট টিকেট", icon: ic(LifeBuoy), grad: "from-emerald-500 to-green-600" },
      { to: "/admin/live-chat", label: "Live Chat", labelBn: "লাইভ চ্যাট", icon: ic(MessageCircle), grad: "from-violet-500 to-fuchsia-500" },
      { to: "/admin/newsletter", label: "Newsletter", labelBn: "নিউজলেটার", icon: ic(Mail), grad: "from-orange-500 to-amber-500" },
      { to: "/admin/renewal-reminders", label: "Renewal Reminders", labelBn: "রিনিউয়াল রিমাইন্ডার", icon: ic(CalendarDays), grad: "from-orange-500 to-rose-500", badge: "NEW" },
      { to: "/admin/email-dashboard", label: "Email Dashboard", labelBn: "ইমেইল ড্যাশবোর্ড", icon: ic(Activity), grad: "from-green-500 to-emerald-600", badge: "NEW" },
      { to: "/admin/referral", label: "Referral Program", labelBn: "রেফারেল প্রোগ্রাম", icon: ic(Gift), grad: "from-pink-500 to-fuchsia-500" },
      { to: "/admin/affiliates", label: "Affiliates", labelBn: "অ্যাফিলিয়েট", icon: ic(Share2), grad: "from-violet-500 to-purple-600" },
    ],
  },
  {
    id: "storefront",
    title: "Storefront",
    titleBn: "স্টোরফ্রন্ট",
    icon: ic(Home),
    items: [
      { to: "/admin/homepage-editor", label: "Homepage Editor", labelBn: "হোমপেজ এডিটর", icon: ic(Home), grad: "from-orange-400 to-amber-500" },
      { to: "/admin/banner-slider", label: "Banner Slider", labelBn: "ব্যানার স্লাইডার", icon: ic(ImageIcon), grad: "from-fuchsia-500 to-pink-500" },
      { to: "/admin/footer-editor", label: "Footer Editor", labelBn: "ফুটার এডিটর", icon: ic(PanelBottom), grad: "from-slate-600 to-indigo-700" },
      { to: "/admin/announcement-bar", label: "Announcement Bar", labelBn: "ঘোষণা বার", icon: ic(Megaphone), grad: "from-orange-500 to-rose-500" },
      { to: "/admin/welcome-popup", label: "Welcome Popup", labelBn: "ওয়েলকাম পপআপ", icon: ic(PartyPopper), grad: "from-pink-500 to-rose-500" },
      { to: "/admin/ceo-message", label: "CEO Message", labelBn: "CEO বার্তা", icon: ic(UserCircle2), grad: "from-amber-500 to-orange-500" },
      { to: "/admin/themes", label: "Themes", labelBn: "থিম", icon: ic(Sparkles), grad: "from-violet-500 to-fuchsia-500" },
      { to: "/admin/shop-config", label: "Shop & WhatsApp", labelBn: "শপ ও হোয়াটসঅ্যাপ", icon: ic(MessageCircle), grad: "from-green-500 to-emerald-600" },
      { to: "/admin/whatsapp-button", label: "WhatsApp Button", labelBn: "হোয়াটসঅ্যাপ বাটন", icon: ic(MessageCircle), grad: "from-green-500 to-emerald-600" },
      { to: "/admin/support-widget", label: "Support Widget", labelBn: "সাপোর্ট উইজেট", icon: ic(MessageCircle), grad: "from-violet-500 to-fuchsia-600" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    titleBn: "মার্কেটিং",
    icon: ic(MegaphoneIcon),
    items: [
      { to: "/admin/coupons", label: "Coupons", labelBn: "কুপন", icon: ic(TicketPercent), grad: "from-rose-500 to-pink-500" },
      { to: "/admin/biggest-discount", label: "Biggest Discount", labelBn: "সর্বোচ্চ ডিসকাউন্ট", icon: ic(Percent), grad: "from-rose-500 to-red-600" },
      { to: "/admin/marketing", label: "Marketing Campaigns", labelBn: "মার্কেটিং ক্যাম্পেইন", icon: ic(MegaphoneIcon), grad: "from-orange-500 to-rose-500" },
      { to: "/admin/ad-campaigns", label: "Ad Campaigns", labelBn: "অ্যাড ক্যাম্পেইন", icon: ic(Target), grad: "from-rose-500 to-red-500" },
    ],
  },
  {
    id: "content-seo",
    title: "Content & SEO",
    titleBn: "কনটেন্ট ও SEO",
    icon: ic(FileEdit),
    items: [
      { to: "/admin/pages", label: "Page Management", labelBn: "পেজ ম্যানেজমেন্ট", icon: ic(FileEdit), grad: "from-orange-500 to-amber-500" },
      { to: "/admin/blog", label: "Blog", labelBn: "ব্লগ", icon: ic(Newspaper), grad: "from-rose-500 to-red-500" },
      { to: "/admin/software-downloads", label: "Software Downloads", labelBn: "সফটওয়্যার ডাউনলোড", icon: ic(Download), grad: "from-emerald-500 to-green-600" },
      { to: "/admin/help-center", label: "Help Center", labelBn: "হেল্প সেন্টার", icon: ic(BookOpen), grad: "from-emerald-500 to-teal-600" },
      { to: "/admin/search-console", label: "Search Console & SEO", labelBn: "সার্চ কনসোল ও SEO", icon: ic(Search), grad: "from-cyan-500 to-blue-600" },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    titleBn: "রিপোর্ট",
    icon: ic(BarChart3),
    items: [
      { to: "/admin/reports", label: "Reports", labelBn: "রিপোর্ট", icon: ic(BarChart3), grad: "from-blue-500 to-indigo-600" },
      { to: "/admin/ga4-realtime", label: "GA4 Realtime Report", labelBn: "GA4 রিয়েলটাইম রিপোর্ট", icon: ic(Activity), grad: "from-amber-500 to-orange-500" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    titleBn: "ইন্টিগ্রেশন",
    icon: ic(Plug),
    items: [
      { to: "/admin/fb-pixel", label: "Facebook Pixel", labelBn: "ফেসবুক পিক্সেল", icon: ic(BarChart3), grad: "from-blue-600 to-indigo-700" },
      { to: "/admin/fb-audiences", label: "FB Custom Audiences", labelBn: "FB কাস্টম অডিয়েন্স", icon: ic(UsersRound), grad: "from-blue-500 to-violet-600", badge: "NEW" },
      { to: "/admin/google-ads", label: "Google Ads", labelBn: "গুগল অ্যাডস", icon: ic(Activity), grad: "from-sky-500 to-blue-600" },
      { to: "/admin/other-pixels", label: "Other Pixels", labelBn: "অন্যান্য পিক্সেল", icon: ic(Code2), grad: "from-orange-500 to-rose-500", badge: "NEW" },
      { to: "/admin/support-channels", label: "Support Channels", labelBn: "সাপোর্ট চ্যানেল", icon: ic(Headphones), grad: "from-emerald-500 to-green-600" },
    ],
  },

  {
    id: "ai-tools",
    title: "AI Tools",
    titleBn: "AI টুলস",
    icon: ic(Bot),
    items: [
      { to: "/admin/ai-command", label: "AI Command Center", labelBn: "AI কমান্ড সেন্টার", icon: ic(Sparkles), grad: "from-violet-500 to-fuchsia-500" },
      { to: "/admin/review-generator", label: "AI Review Generator", labelBn: "AI রিভিউ জেনারেটর", icon: ic(Sparkles), grad: "from-amber-500 to-orange-600" },
      { to: "/admin/ai-api", label: "AI API Settings", labelBn: "AI API সেটিংস", icon: ic(Bot), grad: "from-violet-500 to-fuchsia-500" },
    ],
  },
  {
    id: "system",
    title: "System",
    titleBn: "সিস্টেম",
    icon: ic(Settings),
    items: [
      { to: "/admin/settings", label: "General Settings", labelBn: "সাধারণ সেটিংস", icon: ic(Settings), grad: "from-slate-600 to-slate-800" },
      { to: "/admin/roles", label: "Admin Roles", labelBn: "অ্যাডমিন রোল", icon: ic(ShieldCheck), grad: "from-rose-500 to-red-500" },
      { to: "/admin/security", label: "Security & MFA", labelBn: "সিকিউরিটি ও MFA", icon: ic(ShieldCheck), grad: "from-rose-600 to-red-700" },
      { to: "/admin/backup", label: "Backup & Restore", labelBn: "ব্যাকআপ ও রিস্টোর", icon: ic(DatabaseBackup), grad: "from-cyan-500 to-blue-600" },
    ],
  },
];

export const ALL_ADMIN_PAGES = ADMIN_MENU.flatMap((g) => g.items);

export function findAdminPage(pathname: string): AdminMenuItem | undefined {
  return ALL_ADMIN_PAGES.find((p) => p.to === pathname);
}
