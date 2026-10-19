import { createHash } from "node:crypto";

// Letters that do not decompose into a base letter plus an accent, and what they are written as in a URL.
const SPECIAL = {
  ß: "ss", ẞ: "SS", æ: "ae", Æ: "AE", œ: "oe", Œ: "OE", ø: "o", Ø: "O", đ: "d", Đ: "D", ð: "d", Ð: "D", þ: "th", Þ: "TH", ł: "l", Ł: "L",
  ħ: "h", Ħ: "H", ı: "i", ŋ: "ng", Ŋ: "NG", ĸ: "k", ŀ: "l", Ŀ: "L", ſ: "s", ŉ: "n"
};
const WORD_FOR_AMPERSAND = { nl: "en", en: "and", de: "und", fr: "et", es: "y", it: "e" };

/** Letters with diacritics to plain letters (é → e, ü → u, ñ → n, ß → ss, ø → o). Other characters are left alone. */
export function transliterate(text) {
  return String(text)
    .replace(/[ÆŒÞ](?=\p{Ll})/gu, (c) => ({ Æ: "Ae", Œ: "Oe", Þ: "Th" })[c]) // "Ærø" is "Aero", not "AEro"; "ÆRØ" stays "AERO"
    .replace(/[ßẞæÆœŒøØđĐðÐþÞłŁħĦıŋŊĸŀĿſŉ]/g, (c) => SPECIAL[c] ?? c)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

/**
 * Makes text safe for a URL: lowercase letters, digits and a separator, with accents removed (`"Crème brûlée & Café"` →
 * `"creme-brulee-en-cafe"`).
 * Options: `separator` ("-"), `lowercase` (true), `maxLength` (cuts at a word boundary where it can), `locale` (decides what `&` becomes:
 * "nl" → en, "en" → and, "de" → und, "fr" → et, "es" → y, "it" → e), `fallback` (when nothing usable is left, such as text with only emoji
 * or non-Latin letters; default: a short hash of the text so different inputs stay different), `keep` (extra characters to keep, for example "._").
 */
export function slugify(text, { separator = "-", lowercase = true, maxLength, locale = "en", fallback, keep = "" } = {}) {
  if (typeof text !== "string") throw new TypeError("slug: text must be a string");
  if (!/^[A-Za-z0-9_.~-]*$/.test(separator) || separator.length > 3) throw new RangeError("slug: separator must be up to 3 URL-safe characters");
  if (maxLength !== undefined && (!Number.isInteger(maxLength) || maxLength < 1)) throw new RangeError("slug: maxLength must be a whole number of at least 1");
  const ampersand = WORD_FOR_AMPERSAND[String(locale).toLowerCase().split("-")[0]] ?? "and";
  const allowed = keep.replace(/[\\\]^-]/g, "\\$&");
  let s = transliterate(text).replace(/&/g, ` ${ampersand} `).replace(/['’‘`´]/g, "");
  if (lowercase) s = s.toLowerCase();
  s = s.replace(new RegExp(`[^A-Za-z0-9${allowed}]+`, "g"), " ").trim().replace(/ +/g, separator === "" ? "" : separator);
  if (maxLength !== undefined && s.length > maxLength) {
    let cut = s.slice(0, maxLength);
    const boundary = separator ? cut.lastIndexOf(separator) : -1;
    if (boundary > maxLength * 0.5 && s[maxLength] !== undefined && s.slice(maxLength).startsWith(separator)) cut = s.slice(0, maxLength);
    else if (boundary > maxLength * 0.5) cut = cut.slice(0, boundary);
    s = cut.replace(new RegExp(`${separator ? escapeRe(separator) : "(?!)"}+$`), "");
  }
  if (s === "") return fallback ?? `n-${createHash("sha256").update(text).digest("hex").slice(0, 8)}`;
  return s;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A slug that is not taken yet: `uniqueSlug("My post", (s) => exists(s))` gives `my-post`, then `my-post-2`, `my-post-3`...
 * `isTaken` may be async. The number is added inside `maxLength` if you set one (a `RangeError` if it cannot fit).
 */
export async function uniqueSlug(text, isTaken, options = {}) {
  const base = slugify(text, options);
  const separator = options.separator ?? "-";
  if (!(await isTaken(base))) return base;
  for (let n = 2; n < 10_000; n++) {
    const suffix = `${separator}${n}`;
    const trimmed = options.maxLength && base.length + suffix.length > options.maxLength ? base.slice(0, options.maxLength - suffix.length).replace(new RegExp(`${separator ? escapeRe(separator) : "(?!)"}+$`), "") : base;
    if (trimmed === "" && base !== "") throw new RangeError("slug: maxLength is too small to add a number to the slug");
    const candidate = `${trimmed}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error("slug: could not find a free slug");
}

/** Whether text is already a valid slug of this package (lowercase letters, digits and single separators). */
export function isSlug(text, { separator = "-" } = {}) {
  if (typeof text !== "string" || text === "") return false;
  // split instead of a nested-quantifier regex: with separator "" the regex form backtracks exponentially
  return (separator === "" ? [text] : text.split(separator)).every((part) => /^[a-z0-9]+$/.test(part));
}
