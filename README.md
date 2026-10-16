# @sandsoftwaresolutions/slug

[![CI](https://github.com/SandSoftwareSolutions/ss-slug/actions/workflows/ci.yml/badge.svg)](https://github.com/SandSoftwareSolutions/ss-slug/actions/workflows/ci.yml)

Make URLs from titles: `"Crème brûlée & Café"` becomes `creme-brulee-en-cafe`. Accents and special letters are handled, `&` is written in your language, and two different titles never end up with the same empty slug. No dependencies.

## Install

```bash
npm install @sandsoftwaresolutions/slug
```

## Usage

```js
import { slugify, uniqueSlug, isSlug } from "@sandsoftwaresolutions/slug";

slugify("Crème brûlée & Café");                          // "creme-brulee-and-cafe"
slugify("Zout & Peper", { locale: "nl" });               // "zout-en-peper"
slugify("A very long title about nothing", { maxLength: 20 });   // "a-very-long-title" (cuts at a word)
slugify("Tom's tips");                                    // "toms-tips"  (apostrophes disappear, no "tom-s")

const slug = await uniqueSlug(title, (s) => db.slugExists(s));   // "my-post", "my-post-2", "my-post-3"...
isSlug("hello-world");                                     // true
```

## Details

- **Accents and special letters:** `é → e`, `ü → u`, `ñ → n`, `ß → ss`, `æ → ae`, `ø → o`, `ł → l`, `đ → d`, `þ → th`. A capital stays natural: `Ærø → Aero`.
- **`&`** becomes `en` (`locale: "nl"`), `and` (`en`), `und` (`de`), `et` (`fr`), `y` (`es`) or `e` (`it`).
- **Nothing usable left** (a title with only emoji or non-Latin letters, say): you get `fallback` if you gave one, otherwise `n-` and a short hash of the text, so different titles still get different slugs instead of all being `""`.
- **`maxLength`** cuts at a word boundary where it reasonably can, never leaves a trailing separator, and `uniqueSlug` keeps its `-2` inside the limit.
- Options: `separator` (up to 3 URL-safe characters), `lowercase`, `keep` (extra characters to keep, such as `._`).
- Non-Latin scripts (Chinese, Arabic, Cyrillic...) are not transliterated; for those pass a `fallback` or an id.
- `transliterate(text)` is the accent removal on its own.
