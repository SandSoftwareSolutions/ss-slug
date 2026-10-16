export interface SlugOptions {
  /** Up to 3 URL-safe characters. Default "-". */
  separator?: string;
  /** Default true. */
  lowercase?: boolean;
  maxLength?: number;
  /** Language for "&": nl, en, de, fr, es, it. Default "en". */
  locale?: string;
  /** Used when nothing usable is left. Default: "n-" and a short hash of the text. */
  fallback?: string;
  /** Extra characters to keep, such as "._". */
  keep?: string;
}

export function transliterate(text: string): string;
export function slugify(text: string, options?: SlugOptions): string;
export function uniqueSlug(text: string, isTaken: (slug: string) => boolean | Promise<boolean>, options?: SlugOptions): Promise<string>;
export function isSlug(text: unknown, options?: { separator?: string }): boolean;
