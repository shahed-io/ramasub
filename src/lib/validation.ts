import { z } from "zod";

/**
 * Shared strict input schemas.
 *
 * Rule for this codebase: every server function / API route validates its input
 * against a schema that pins **type, length and format**, and *rejects* anything
 * that does not match. We do not silently coerce, truncate or sanitize unknown
 * input — a bad request must fail loudly with a 4xx-style error.
 *
 * All object schemas are `.strict()` so unexpected keys are rejected too.
 */

// ── primitives ───────────────────────────────────────────────────────────────

export const uuid = z.string().uuid({ message: "Invalid id" });

export const email = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email({ message: "Invalid email address" });

/** Bangladeshi / international phone: digits, optional +, 6–20 chars. */
export const phone = z
  .string()
  .trim()
  .min(6, { message: "Phone number is too short" })
  .max(20, { message: "Phone number is too long" })
  .regex(/^\+?[0-9][0-9\s-]{5,19}$/, { message: "Invalid phone number" });

/** URL-safe slug used for products, blogs, pages, offers. */
export const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, { message: "Invalid slug" });

/** Absolute https(s) URL. */
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url({ message: "Invalid URL" })
  .refine((v) => /^https?:\/\//i.test(v), { message: "URL must start with http(s)://" });

/** Site-relative path (`/foo/bar`) — blocks protocol-relative and traversal. */
export const relPath = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .regex(/^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/]*$/, { message: "Invalid path" })
  .refine((v) => !v.includes(".."), { message: "Path traversal is not allowed" });

/** Redirect target: a site-relative path OR an absolute http(s) URL. */
export const pathOrUrl = z.union([relPath, httpUrl]);

/** Free-text with a hard length cap; empty strings are rejected. */
export const text = (max: number, min = 1) =>
  z.string().trim().min(min, { message: "This field is required" }).max(max, {
    message: `Must be ${max} characters or fewer`,
  });

/** Optional free text: trims, treats "" as undefined, still length-capped. */
export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Must be ${max} characters or fewer` })
    .optional()
    .transform((v) => (v ? v : undefined));

/** Optional free text where "" is a meaningful "clear this value". */
export const nullableText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v && v.length ? v : null));

export const intIn = (min: number, max: number) =>
  z.coerce.number().int({ message: "Must be a whole number" }).min(min).max(max);

export const numIn = (min: number, max: number) =>
  z.coerce.number().finite({ message: "Must be a number" }).min(min).max(max);

export const bool = z.boolean();

/** Digits only, e.g. Meta pixel / GA numeric ids. */
export const digits = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${min},${max}}$`), { message: `Must be ${min}–${max} digits` });

/** ISO calendar date `YYYY-MM-DD` — rejects impossible dates too. */
export const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" })
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" });

/** Opaque token / id from a third party: printable ASCII, no whitespace. */
export const token = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/, { message: "Invalid token format" });

/** JSON object of bounded size — used for pass-through metadata payloads. */
export const jsonObject = (maxBytes = 8_000) =>
  z
    .record(z.string().max(120), z.unknown())
    .refine((v) => JSON.stringify(v).length <= maxBytes, {
      message: `Payload must be ${maxBytes} bytes or fewer`,
    });

// ── helpers ─────────────────────────────────────────────────────────────────

/**
 * Wraps a schema for use in `.inputValidator(...)`.
 * Throws a single-line, user-safe message listing the offending fields.
 */
export function validator<S extends z.ZodTypeAny>(schema: S) {
  return (input: unknown): z.output<S> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw new Error(formatIssues(parsed.error));
    return parsed.data;
  };
}

/** Parse-or-throw for API route handlers and helper functions. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown, context?: string): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const detail = formatIssues(parsed.error);
    throw new Error(context ? `${context}: ${detail}` : detail);
  }
  return parsed.data;
}

/**
 * Parse for HTTP routes: returns either the data or a ready-to-return
 * 400 Response listing what failed (no internals leaked).
 */
export function parseRequest<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): { ok: true; data: z.output<S> } | { ok: false; response: Response } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    response: new Response(
      JSON.stringify({ error: "Validation failed", detail: formatIssues(parsed.error) }),
      { status: 400, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
    ),
  };
}

export function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");
}

export { z };
