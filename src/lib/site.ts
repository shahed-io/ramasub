/**
 * Central site URL constants — use these everywhere instead of hardcoding domains.
 * If the brand domain ever changes, only this file needs updating.
 */
export const SITE_URL = "https://ramasub.com";
export const SITE_NAME = "Rama Sub";
export const SITE_BRAND_TAG = "RAMASUB.COM";

/** Build a fully-qualified URL from a relative path. */
export const siteUrl = (path: string = "/"): string => {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};
