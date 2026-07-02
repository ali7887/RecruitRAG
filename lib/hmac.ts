import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC request signing for the external API (Phase 21). The shared secret comes
// from RAG_API_SECRET; a dev fallback keeps local/demo usage working.
const SECRET = process.env.RAG_API_SECRET ?? "recruitrag-dev-secret";

// HMAC_SHA256(secret, payload) as lowercase hex.
export function signPayload(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

// Constant-time comparison of an incoming X-RAG-Signature against the expected
// signature. Rejects missing or malformed signatures.
export function validateSignature(payload: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = signPayload(payload);
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== providedBuf.length || expectedBuf.length === 0) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
