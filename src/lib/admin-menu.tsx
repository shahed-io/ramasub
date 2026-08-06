import type { ReactNode } from "react";
import {
  LayoutDashboard, Package, PackagePlus, FolderTree, PartyPopper,
  Megaphone, Star, BadgePercent, Images, Home, PanelBottom,
  ShoppingBag, Users, Wallet, CreditCard, Boxes, Bell, ReceiptText,
  TicketPercent, Gift, Handshake, Target, Activity, BarChart3, Search,
  BookOpen, Headphones, LayoutTemplate, GalleryHorizontal, Palette, Store,
  FileEdit, Newspaper, Quote, HardDriveDownload, Link2, KeyRound, BadgeCheck,
  PieChart, ClipboardList, Bot, Settings, ShieldCheck, DatabaseBackup, ShoppingCart, ListChecks, Sparkles,
  Plug, Mail, MailCheck, CalendarClock, Zap, ZoomIn, ScanEye, MessagesSquare,
  MessageCircle, LifeBuoy, Send, Facebook, Crosshair, LineChart, CornerUpRight,
  UserCog, UserPlus, PenTool, BrainCircuit, Smartphone, Landmark, ArrowLeftRight,
  Banknote, WandSparkles, Gauge,
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

/**
 * Colour system — every group gets its own clearly distinct hue family so an
 * admin can recognise a section at a glance. Within a group we only shift the
 * shade (light → deep) to separate individual items. All stops resolve through
 * ADMIN_ICON_COLORS (inline styles), so they render exactly as written.
 */
const C = {
  // Overview — brand violet
  brand: "from-violet-500 to-indigo-600",
  brandSoft: "from-violet-400 to-violet-600",
  // Sales — emerald / money green
  sales: "from-emerald-500 to-teal-600",
  salesSoft: "from-emerald-400 to-emerald-600",
  salesDeep: "from-teal-500 to-emerald-700",
  // Catalog — amber / orange
  catalog: "from-amber-500 to-orange-600",
  catalogSoft: "from-amber-400 to-amber-600",
  // Customers — sky / blue
  customer: "from-sky-500 to-blue-600",
  customerSoft: "from-sky-400 to-sky-600",
  customerDeep: "from-blue-600 to-indigo-700",
  // Storefront — fuchsia / pink
  store: "from-fuchsia-500 to-purple-600",
  storeSoft: "from-fuchsia-400 to-fuchsia-600",
  // Marketing — rose / pink
  marketing: "from-rose-500 to-pink-600",
  marketingSoft: "from-rose-400 to-rose-600",
  // Content & SEO — indigo
  content: "from-indigo-500 to-violet-600",
  contentSoft: "from-indigo-400 to-indigo-600",
  // Reports — cyan / teal
  report: "from-cyan-500 to-sky-600",
  reportSoft: "from-cyan-400 to-cyan-600",
  // Integrations — purple
  integration: "from-purple-500 to-violet-700",
  integrationSoft: "from-purple-400 to-purple-600",
  // System — slate
  system: "from-slate-600 to-slate-800",
  systemSoft: "from-slate-500 to-slate-700",
  danger: "from-rose-600 to-red-700",
};


export const ADMIN_MENU: AdminMenuGroup[] = [
  {
    id: "overview",
    title: "Overview",
    titleBn: "ওভারভিউ",
    icon: ic(LayoutDashboard),
    items: [
      { to: "/Mahbub214", label: "Dashboard", labelBn: "ড্যাশবোর্ড", icon: ic(LayoutDashboard), grad: C.brand, exact: true },
      { to: "/Mahbub214/analytics", label: "Analytics Dashboard", labelBn: "অ্যানালিটিক্স ড্যাশবোর্ড", icon: ic(PieChart), grad: C.brandSoft },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    titleBn: "সেলস",
    icon: ic(ShoppingCart),
    items: [
      { to: "/Mahbub214/orders", label: "Orders", labelBn: "অর্ডার", icon: ic(ShoppingBag), grad: C.sales, badge: "LIVE" },
      { to: "/Mahbub214/abandoned-checkout", label: "Abandoned Checkout", labelBn: "অ্যাবান্ডনড চেকআউট", icon: ic(ShoppingCart), grad: C.salesDeep, badge: "NEW" },
      { to: "/Mahbub214/quick-sale", label: "Quick Sale", labelBn: "কুইক সেল", icon: ic(Zap), grad: C.salesSoft },
      { to: "/Mahbub214/payment-links", label: "Payment Links", labelBn: "পেমেন্ট লিঙ্ক", icon: ic(Link2), grad: C.sales, badge: "NEW" },
      { to: "/Mahbub214/invoice-generator", label: "Invoice Generator", labelBn: "ইনভয়েস জেনারেটর", icon: ic(ReceiptText), grad: C.salesSoft },
      { to: "/Mahbub214/invoice-design", label: "Invoice Design", labelBn: "ইনভয়েস ডিজাইন", icon: ic(PenTool), grad: C.salesDeep, badge: "NEW" },
      { to: "/Mahbub214/payments", label: "Payments", labelBn: "পেমেন্ট", icon: ic(CreditCard), grad: C.sales },
      { to: "/Mahbub214/bkash-pgw", label: "bKash PGW", labelBn: "bKash PGW", icon: ic(Smartphone), grad: "from-pink-500 to-rose-600", badge: "NEW" },
      { to: "/Mahbub214/eps-pgw", label: "EPS PGW", labelBn: "EPS PGW", icon: ic(Landmark), grad: "from-amber-500 to-yellow-600", badge: "NEW" },
      { to: "/Mahbub214/sslcommerz-pgw", label: "SSLCommerz PGW", labelBn: "SSLCommerz PGW", icon: ic(Banknote), grad: "from-orange-500 to-amber-600", badge: "NEW" },
      { to: "/Mahbub214/bkash-transactions", label: "bKash Transactions", labelBn: "bKash ট্রানজেকশন", icon: ic(ArrowLeftRight), grad: "from-rose-500 to-pink-600", badge: "NEW" },
      { to: "/Mahbub214/license-manager", label: "License Manager", labelBn: "লাইসেন্স ম্যানেজার", icon: ic(KeyRound), grad: C.salesDeep },
      { to: "/Mahbub214/customer-licenses", label: "Customer Licenses", labelBn: "কাস্টমার লাইসেন্স", icon: ic(BadgeCheck), grad: C.salesSoft, badge: "NEW" },
      { to: "/Mahbub214/wallet", label: "Wallet", labelBn: "ওয়ালেট", icon: ic(Wallet), grad: C.salesSoft },
    ],
  },
  {
    id: "catalog",
    title: "Catalog",
    titleBn: "ক্যাটালগ",
    icon: ic(Package),
    items: [
      { to: "/Mahbub214/products", label: "All Products", labelBn: "সব প্রোডাক্ট", icon: ic(Package), grad: C.catalog },
      { to: "/Mahbub214/add-product", label: "Add New Product", labelBn: "নতুন প্রোডাক্ট যোগ", icon: ic(PackagePlus), grad: C.catalogSoft },
      { to: "/Mahbub214/bulk-update", label: "Bulk Update", labelBn: "বাল্ক আপডেট", icon: ic(ListChecks), grad: C.catalog },
      { to: "/Mahbub214/categories", label: "Categories", labelBn: "ক্যাটাগরি", icon: ic(FolderTree), grad: C.catalogSoft },
      { to: "/Mahbub214/inventory", label: "Inventory", labelBn: "ইনভেন্টরি", icon: ic(Boxes), grad: C.catalog },
      { to: "/Mahbub214/media-gallery", label: "Media Gallery", labelBn: "মিডিয়া গ্যালারি", icon: ic(Images), grad: C.catalogSoft },
      { to: "/Mahbub214/description-preview", label: "Description Preview", labelBn: "ডেসক্রিপশন প্রিভিউ", icon: ic(ScanEye), grad: C.catalog },
    ],
  },
  {
    id: "customers",
    title: "Customers",
    titleBn: "কাস্টমার",
    icon: ic(Users),
    items: [
      { to: "/Mahbub214/users", label: "Customers", labelBn: "কাস্টমার", icon: ic(Users), grad: C.customer },
      { to: "/Mahbub214/notifications", label: "Notifications", labelBn: "নোটিফিকেশন", icon: ic(Bell), grad: C.customerSoft },
      { to: "/Mahbub214/reviews", label: "Manage Reviews", labelBn: "রিভিউ ম্যানেজ", icon: ic(Star), grad: C.customerSoft },
      { to: "/Mahbub214/live-chat", label: "Live Chat", labelBn: "লাইভ চ্যাট", icon: ic(MessagesSquare), grad: C.customer },
      { to: "/Mahbub214/newsletter", label: "Newsletter", labelBn: "নিউজলেটার", icon: ic(Mail), grad: C.customerDeep },
      { to: "/Mahbub214/renewal-reminders", label: "Renewal Reminders", labelBn: "রিনিউয়াল রিমাইন্ডার", icon: ic(CalendarClock), grad: C.customerSoft, badge: "NEW" },
      { to: "/Mahbub214/email-dashboard", label: "Email Dashboard", labelBn: "ইমেইল ড্যাশবোর্ড", icon: ic(MailCheck), grad: C.customerDeep, badge: "NEW" },
      { to: "/Mahbub214/referral", label: "Referral Program", labelBn: "রেফারেল প্রোগ্রাম", icon: ic(UserPlus), grad: C.customer },
      { to: "/Mahbub214/affiliates", label: "Affiliates", labelBn: "অ্যাফিলিয়েট", icon: ic(Handshake), grad: C.customerDeep },
    ],
  },
  {
    id: "storefront",
    title: "Storefront",
    titleBn: "স্টোরফ্রন্ট",
    icon: ic(Home),
    items: [
      { to: "/Mahbub214/homepage-editor", label: "Homepage Editor", labelBn: "হোমপেজ এডিটর", icon: ic(LayoutTemplate), grad: C.store },
      { to: "/Mahbub214/banner-slider", label: "Banner Slider", labelBn: "ব্যানার স্লাইডার", icon: ic(GalleryHorizontal), grad: C.storeSoft },
      { to: "/Mahbub214/footer-editor", label: "Footer Editor", labelBn: "ফুটার এডিটর", icon: ic(PanelBottom), grad: C.store },
      { to: "/Mahbub214/announcement-bar", label: "Announcement Bar", labelBn: "ঘোষণা বার", icon: ic(Megaphone), grad: C.storeSoft },
      { to: "/Mahbub214/welcome-popup", label: "Welcome Popup", labelBn: "ওয়েলকাম পপআপ", icon: ic(PartyPopper), grad: C.store },
      { to: "/Mahbub214/ceo-message", label: "CEO Message", labelBn: "CEO বার্তা", icon: ic(Quote), grad: C.storeSoft },
      { to: "/Mahbub214/themes", label: "Themes", labelBn: "থিম", icon: ic(Palette), grad: C.store },
      { to: "/Mahbub214/shop-config", label: "Shop & WhatsApp", labelBn: "শপ ও হোয়াটসঅ্যাপ", icon: ic(Store), grad: C.storeSoft },
      { to: "/Mahbub214/whatsapp-button", label: "WhatsApp Button", labelBn: "হোয়াটসঅ্যাপ বাটন", icon: ic(MessageCircle), grad: C.store },
      { to: "/Mahbub214/support-widget", label: "Support Widget", labelBn: "সাপোর্ট উইজেট", icon: ic(LifeBuoy), grad: C.storeSoft },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    titleBn: "মার্কেটিং",
    icon: ic(Megaphone),
    items: [
      { to: "/Mahbub214/coupons", label: "Coupons", labelBn: "কুপন", icon: ic(TicketPercent), grad: C.marketing },
      { to: "/Mahbub214/offers", label: "Offers & Giveaways", labelBn: "অফার ও গিভঅ্যাওয়ে", icon: ic(Gift), grad: C.marketingSoft, badge: "NEW" },
      { to: "/Mahbub214/biggest-discount", label: "Biggest Discount", labelBn: "সর্বোচ্চ ডিসকাউন্ট", icon: ic(BadgePercent), grad: C.marketing },
      { to: "/Mahbub214/marketing", label: "Marketing Campaigns", labelBn: "মার্কেটিং ক্যাম্পেইন", icon: ic(Megaphone), grad: C.marketingSoft },
      { to: "/Mahbub214/ad-campaigns", label: "Ad Campaigns", labelBn: "অ্যাড ক্যাম্পেইন", icon: ic(Target), grad: C.marketing },
    ],
  },
  {
    id: "content-seo",
    title: "Content & SEO",
    titleBn: "কনটেন্ট ও SEO",
    icon: ic(FileEdit),
    items: [
      { to: "/Mahbub214/pages", label: "Page Management", labelBn: "পেজ ম্যানেজমেন্ট", icon: ic(FileEdit), grad: C.content },
      { to: "/Mahbub214/zoom-settings", label: "Product Image Zoom", labelBn: "প্রোডাক্ট ইমেজ জুম", icon: ic(ZoomIn), grad: C.contentSoft, badge: "NEW" },
      { to: "/Mahbub214/blog", label: "Blog", labelBn: "ব্লগ", icon: ic(Newspaper), grad: C.content },
      { to: "/Mahbub214/software-downloads", label: "Software Downloads", labelBn: "সফটওয়্যার ডাউনলোড", icon: ic(HardDriveDownload), grad: C.contentSoft },
      { to: "/Mahbub214/help-center", label: "Help Center", labelBn: "হেল্প সেন্টার", icon: ic(BookOpen), grad: C.content },
      { to: "/Mahbub214/search-console", label: "Search Console & SEO", labelBn: "সার্চ কনসোল ও SEO", icon: ic(Search), grad: C.contentSoft },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    titleBn: "রিপোর্ট",
    icon: ic(BarChart3),
    items: [
      { to: "/Mahbub214/reports", label: "Reports", labelBn: "রিপোর্ট", icon: ic(BarChart3), grad: C.report },
      { to: "/Mahbub214/ga4-realtime", label: "GA4 Realtime Report", labelBn: "GA4 রিয়েলটাইম রিপোর্ট", icon: ic(LineChart), grad: C.reportSoft },
    ],
  },
  {
    id: "seo",
    title: "SEO",
    titleBn: "SEO",
    icon: ic(Search),
    items: [
      { to: "/Mahbub214/seo-settings", label: "SEO Settings", labelBn: "SEO সেটিংস", icon: ic(Search), grad: C.content, badge: "NEW" },
      { to: "/Mahbub214/seo-audit", label: "SEO Audit", labelBn: "SEO অডিট", icon: ic(ClipboardList), grad: C.contentSoft, badge: "NEW" },
      { to: "/Mahbub214/redirects", label: "Redirects (301/302)", labelBn: "রিডিরেক্ট (301/302)", icon: ic(CornerUpRight), grad: C.content, badge: "NEW" },
    ],
  },

  {
    id: "integrations",
    title: "Integrations",
    titleBn: "ইন্টিগ্রেশন",
    icon: ic(Plug),
    items: [
      { to: "/Mahbub214/meta-business", label: "Meta Business", labelBn: "মেটা বিজনেস", icon: ic(Facebook), grad: C.integrationSoft, badge: "NEW" },
      { to: "/Mahbub214/facebook-pixels", label: "Facebook Pixels", labelBn: "ফেসবুক পিক্সেল", icon: ic(Crosshair), grad: C.integration, badge: "NEW" },
      { to: "/Mahbub214/support-channels", label: "Support Channels", labelBn: "সাপোর্ট চ্যানেল", icon: ic(Headphones), grad: C.integrationSoft },
      { to: "/Mahbub214/telegram", label: "Telegram Monitor", labelBn: "টেলিগ্রাম মনিটর", icon: ic(Send), grad: C.integration, badge: "NEW" },
    ],
  },

  {
    id: "ai-tools",
    title: "AI Tools",
    titleBn: "AI টুলস",
    icon: ic(Bot),
    items: [
      { to: "/Mahbub214/review-generator", label: "AI Review Generator", labelBn: "AI রিভিউ জেনারেটর", icon: ic(WandSparkles), grad: C.catalogSoft },
      { to: "/Mahbub214/ai-api", label: "AI API Settings", labelBn: "AI API সেটিংস", icon: ic(BrainCircuit), grad: C.catalog },
    ],
  },
  {
    id: "system",
    title: "System",
    titleBn: "সিস্টেম",
    icon: ic(Settings),
    items: [
      { to: "/Mahbub214/settings", label: "General Settings", labelBn: "সাধারণ সেটিংস", icon: ic(Settings), grad: C.system },
      { to: "/Mahbub214/currency", label: "Currency Manager", labelBn: "কারেন্সি ম্যানেজার", icon: ic(Coins), grad: C.systemSoft, badge: "NEW" },
      { to: "/Mahbub214/roles", label: "Admin Roles", labelBn: "অ্যাডমিন রোল", icon: ic(UserCog), grad: C.systemSoft },
      { to: "/Mahbub214/security", label: "Security & MFA", labelBn: "সিকিউরিটি ও MFA", icon: ic(ShieldCheck), grad: C.danger },
      { to: "/Mahbub214/rate-limits", label: "Rate Limits", labelBn: "রেট লিমিট", icon: ic(Gauge), grad: C.danger, badge: "NEW" },
      { to: "/Mahbub214/backup", label: "Backup & Restore", labelBn: "ব্যাকআপ ও রিস্টোর", icon: ic(DatabaseBackup), grad: C.systemSoft },
    ],
  },
];

export const ALL_ADMIN_PAGES = ADMIN_MENU.flatMap((g) => g.items);

export function findAdminPage(pathname: string): AdminMenuItem | undefined {
  return ALL_ADMIN_PAGES.find((p) => p.to === pathname);
}

export const ADMIN_SPARKLES_ICON = ic(Sparkles);
