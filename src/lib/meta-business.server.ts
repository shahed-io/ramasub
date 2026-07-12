// Server-only helpers for Meta Business Integration.
// Never import from client code.
import crypto from "node:crypto";

const ENC_ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.META_ENCRYPTION_KEY;
  if (!raw) throw new Error("META_ENCRYPTION_KEY not set");
  // Normalize to 32 bytes via SHA-256 of the secret
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): { ciphertext: Buffer; last4: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([iv, tag, enc]); // 12 + 16 + N
  return { ciphertext, last4: plaintext.slice(-4) };
}

export function decryptToken(ciphertext: Buffer): string {
  const iv = ciphertext.subarray(0, 12);
  const tag = ciphertext.subarray(12, 28);
  const data = ciphertext.subarray(28);
  const decipher = crypto.createDecipheriv(ENC_ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

export const GRAPH_API_VERSIONS = ["v21.0", "v20.0", "v19.0", "v18.0"] as const;

export function metaGraphUrl(pixelId: string, version: string): string {
  return `https://graph.facebook.com/${version}/${pixelId}/events`;
}

export function pixelInfoUrl(pixelId: string, version: string, accessToken: string): string {
  return `https://graph.facebook.com/${version}/${pixelId}?access_token=${encodeURIComponent(accessToken)}&fields=id,name,last_fired_time,is_unavailable`;
}
