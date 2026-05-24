const MOJIBAKE_PATTERN = /[àâð]/;

function isReactElementLike(value) {
  return Boolean(value && typeof value === "object" && "$$typeof" in value);
}

export function decodeDisplayText(value) {
  if (typeof value !== "string" || !MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

export function normalizeLocalizedCopy(value) {
  if (typeof value === "string") {
    return decodeDisplayText(value);
  }

  if (typeof value === "function") {
    return (...args) => normalizeLocalizedCopy(value(...args));
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeLocalizedCopy(item));
  }

  if (!value || typeof value !== "object" || isReactElementLike(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, normalizeLocalizedCopy(entryValue)])
  );
}
