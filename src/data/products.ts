export type Plan = { period: string; price: string; original?: string; popular?: boolean };

export type ProductMeta = {
  seo_title?: string;
  meta_description?: string;
  tags?: string[];
  gallery?: string[];
  video_url?: string;
};

export type Product = {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  category: string;
  badge: string | null;
  tagline: string;
  description: string;
  shortDescription?: string;
  deliveryTime: string;
  warranty: string;
  features: string[];
  plans: Plan[];
  imageUrl?: string;
  meta?: ProductMeta;
};

// Map DB row (snake_case) to UI Product (camelCase)
type DbProduct = {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  category: string;
  badge: string | null;
  tagline: string;
  description: string;
  delivery_time: string;
  warranty: string;
  features: unknown;
  plans: unknown;
  image_url?: string | null;
  short_description?: string | null;
  meta?: ProductMeta | null;
};

export function rowToProduct(r: DbProduct): Product {
  return {
    slug: r.slug,
    name: r.name,
    emoji: r.emoji,
    gradient: r.gradient,
    category: r.category,
    badge: r.badge,
    tagline: r.tagline,
    description: r.description,
    shortDescription: r.short_description || undefined,
    deliveryTime: r.delivery_time,
    warranty: r.warranty,
    features: Array.isArray(r.features) ? (r.features as string[]) : [],
    plans: Array.isArray(r.plans) ? (r.plans as Plan[]) : [],
    imageUrl: r.image_url || undefined,
    meta: r.meta ?? undefined,
  };
}
