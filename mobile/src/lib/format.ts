// ---------- existing ----------
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i;

export function isPlusCode(s: string | null | undefined): boolean {
  return !!s && PLUS_CODE_RE.test(s.trim());
}

export function stripPlusCode(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!isPlusCode(trimmed)) return trimmed;
  const idx = trimmed.indexOf(",");
  if (idx === -1) return null;
  const rest = trimmed.slice(idx + 1).trim();
  return rest || null;
}

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

// ---------- NEW ----------

/** Format a number as ₱X.XX (or ₱X if whole). */
export function formatPeso(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  const hasCents = Math.abs(amount % 1) > 0.001;
  return hasCents ? `₱${amount.toFixed(2)}` : `₱${Math.round(amount)}`;
}

/** "4:35" / "0:07" — for the QR expiry countdown. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
