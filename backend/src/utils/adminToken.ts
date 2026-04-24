import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

function stripLeadingBom(s: string): string {
  let out = s;
  while (out.length > 0 && out.charCodeAt(0) === 0xfeff) {
    out = out.slice(1).trim();
  }
  return out;
}

/** `ADMIN_API_TOKEN` from the host: trim + strip UTF-8 BOM (common when pasting from some editors). */
export function normalizeStoredAdminToken(raw: string): string {
  return stripLeadingBom(raw.trim());
}

/**
 * Value from `x-admin-token` / `admin-token`: trim, BOM, strip one layer of wrapping quotes,
 * optional one-shot URI decode when `%`-escapes are present (fixes accidental encodeURIComponent on the client).
 */
export function normalizeClientAdminToken(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  let s = stripLeadingBom(raw.trim());
  if (s.length === 0) return undefined;
  if ((s.startsWith('"') && s.endsWith('"') && s.length >= 2) || (s.startsWith("'") && s.endsWith("'") && s.length >= 2)) {
    s = stripLeadingBom(s.slice(1, -1).trim());
  }
  if (s.length === 0) return undefined;
  if (/%[0-9A-Fa-f]{2}/i.test(s)) {
    try {
      const dec = decodeURIComponent(s);
      if (dec.length > 0 && dec !== s) s = dec;
    } catch {
      /* keep s */
    }
  }
  return s.length > 0 ? s : undefined;
}

export function adminSecretsEqual(stored: string, provided: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Primary `x-admin-token`; optional alias `admin-token` for misnamed clients. */
export function readAdminTokenFromRequest(req: Request): string | undefined {
  const raw = req.get("x-admin-token") ?? req.get("admin-token");
  return normalizeClientAdminToken(raw ?? undefined);
}
