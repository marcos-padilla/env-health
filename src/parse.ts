const URL_RE = /^https?:\/\/.+/i;

export function parseIntStrict(raw: string): number | null {
  if (!/^-?\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseFloatStrict(raw: string): number | null {
  const s = raw.trim();
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseBoolStrict(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(v)) return true;
  if (["false", "0", "no", "n", "off"].includes(v)) return false;
  return null;
}

export function parseUrlStrict(raw: string): string | null {
  const s = raw.trim();
  if (!URL_RE.test(s)) return null;
  try {
    new URL(s);
    return s;
  } catch {
    return null;
  }
}

export function parseJsonStrict(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
