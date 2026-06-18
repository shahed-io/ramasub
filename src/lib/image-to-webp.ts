// Browser-side image → WebP converter using <canvas>.
// Skips formats the browser shouldn't rasterize (svg, gif, already-webp).

const SKIP_TYPES = new Set(["image/webp", "image/svg+xml", "image/gif"]);

export type WebpOptions = {
  /** 0–1 quality, default 0.85 */
  quality?: number;
  /** Max longest edge in pixels; if image is larger it will be scaled down. Default 2000. */
  maxDimension?: number;
};

function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob).catch(() => loadHTMLImage(blob));
  }
  return loadHTMLImage(blob);
}

function loadHTMLImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function dims(bm: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ("width" in bm && "height" in bm) return { w: bm.width, h: bm.height };
  return { w: 0, h: 0 };
}

/**
 * Convert a File/Blob to a WebP Blob. Returns the original if it's already
 * webp/svg/gif or if conversion is unsupported / produces no gain.
 */
export async function blobToWebp(
  input: Blob,
  opts: WebpOptions = {},
): Promise<{ blob: Blob; converted: boolean; contentType: string }> {
  const quality = opts.quality ?? 0.85;
  const maxDim = opts.maxDimension ?? 2000;

  if (SKIP_TYPES.has(input.type)) {
    return { blob: input, converted: false, contentType: input.type || "image/webp" };
  }
  if (typeof document === "undefined") {
    return { blob: input, converted: false, contentType: input.type || "application/octet-stream" };
  }

  try {
    const bm = await loadBitmap(input);
    const { w, h } = dims(bm);
    if (!w || !h) throw new Error("decode failed");

    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d ctx");
    ctx.drawImage(bm as CanvasImageSource, 0, 0, outW, outH);

    const webp: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob null"))), "image/webp", quality);
    });

    if ("close" in bm && typeof bm.close === "function") bm.close();

    // If WebP is somehow larger, keep original.
    if (webp.size >= input.size && input.type.startsWith("image/")) {
      return { blob: input, converted: false, contentType: input.type };
    }
    return { blob: webp, converted: true, contentType: "image/webp" };
  } catch {
    return { blob: input, converted: false, contentType: input.type || "application/octet-stream" };
  }
}

/** Convert a File to a WebP File (keeps the base name, swaps extension). */
export async function fileToWebp(file: File, opts?: WebpOptions): Promise<File> {
  const { blob, converted, contentType } = await blobToWebp(file, opts);
  if (!converted) return file;
  const base = file.name.replace(/\.[^./\\]+$/, "");
  return new File([blob], `${base}.webp`, { type: contentType, lastModified: Date.now() });
}
