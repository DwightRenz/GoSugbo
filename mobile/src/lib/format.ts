// Plus Code (Open Location Code) — e.g. "2GG3+H5P", "2GC2+HXR, De Guzman Street"
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i;

export function isPlusCode(s: string | null | undefined): boolean {
  return !!s && PLUS_CODE_RE.test(s.trim());
}

/**
 * Strip a leading Plus Code from a string, keeping any street part.
 *   "2GC2+HXR, De Guzman Street" → "De Guzman Street"
 *   "2GG3+H5P"                  → null
 */
export function stripPlusCode(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!isPlusCode(trimmed)) return trimmed;
  const idx = trimmed.indexOf(",");
  if (idx === -1) return null;
  const rest = trimmed.slice(idx + 1).trim();
  return rest || null;
}

/**
 * Best-effort human-readable place label.
 * Order: line1 (sanitized) → line2 → city → province → fallback.
 * Generic labels like "Pickup"/"Destination" are skipped.
 */
export function formatPlace(
  addr:
    | {
        label?: string | null;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        province?: string | null;
      }
    | null
    | undefined,
  fallback = "Pinned location",
): string {
  if (!addr) return fallback;
  const line1 = stripPlusCode(addr.line1);
  const line2 = stripPlusCode(addr.line2);
  const candidates = [line1, line2, addr.city, addr.province];
  for (const c of candidates) {
    if (c) return c;
  }
  return fallback;
}
