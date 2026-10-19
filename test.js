import assert from "node:assert/strict";
import { test } from "node:test";

import { isSlug, slugify, transliterate, uniqueSlug } from "./src/index.js";

test("accents and special letters become plain letters", () => {
  assert.equal(transliterate("Crème brûlée, Café, Ünïcödé, ñandú, Łódź, Øresund, Straße, Ærø, Œuvre, Đorđe, þing"), "Creme brulee, Cafe, Unicode, nandu, Lodz, Oresund, Strasse, Aero, Oeuvre, Dorde, thing");
  assert.equal(transliterate("already plain"), "already plain");
  assert.equal(transliterate("日本語"), "日本語");
});

test("typical titles", () => {
  const cases = {
    "Hello World": "hello-world",
    "  Spaces   everywhere  ": "spaces-everywhere",
    "Crème brûlée & Café": "creme-brulee-and-cafe",
    "Tom's 10 best tips!": "toms-10-best-tips",
    "Wat is HACCP? (een uitleg)": "wat-is-haccp-een-uitleg",
    "a/b\\c:d": "a-b-c-d",
    "--leading and trailing--": "leading-and-trailing",
    "snake_case and kebab-case": "snake-case-and-kebab-case",
    "Ünïcödé": "unicode"
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(slugify(input), expected, input);
});

test("& is written in the language of the page", () => {
  assert.equal(slugify("Zout & Peper", { locale: "nl" }), "zout-en-peper");
  assert.equal(slugify("Salt & Pepper", { locale: "en-GB" }), "salt-and-pepper");
  assert.equal(slugify("Salz & Pfeffer", { locale: "de" }), "salz-und-pfeffer");
  assert.equal(slugify("Sel & Poivre", { locale: "fr" }), "sel-et-poivre");
  assert.equal(slugify("A & B", { locale: "xx" }), "a-and-b");
});

test("separator, case and keep", () => {
  assert.equal(slugify("Hello World", { separator: "_" }), "hello_world");
  assert.equal(slugify("Hello World", { lowercase: false }), "Hello-World");
  assert.equal(slugify("Hello World", { separator: "" }), "helloworld");
  assert.equal(slugify("file name v1.2_final", { keep: "._" }), "file-name-v1.2_final");
  assert.throws(() => slugify("x", { separator: "/" }), RangeError);
  assert.throws(() => slugify("x", { separator: "----" }), RangeError);
});

test("maxLength cuts at a word boundary and never leaves a trailing separator", () => {
  assert.equal(slugify("the quick brown fox jumps", { maxLength: 15 }), "the-quick-brown");
  assert.equal(slugify("the quick brown fox jumps", { maxLength: 16 }), "the-quick-brown");
  assert.equal(slugify("the quick brown fox jumps", { maxLength: 9 }), "the-quick");
  assert.equal(slugify("supercalifragilistic", { maxLength: 8 }), "supercal");
  assert.equal(slugify("ab cd", { maxLength: 3 }), "ab");
  for (const max of [1, 2, 5, 10, 20]) {
    const s = slugify("alpha beta gamma delta epsilon", { maxLength: max });
    assert.ok(s.length <= max && !s.endsWith("-") && !s.startsWith("-"), `${max}: ${s}`);
  }
  assert.throws(() => slugify("x", { maxLength: 0 }), RangeError);
});

test("text with nothing usable gets a stable fallback, so different inputs stay different", () => {
  const a = slugify("🎉🎉🎉");
  const b = slugify("日本語");
  assert.match(a, /^n-[0-9a-f]{8}$/);
  assert.equal(slugify("🎉🎉🎉"), a);
  assert.notEqual(a, b);
  assert.equal(slugify("???", { fallback: "untitled" }), "untitled");
  assert.equal(slugify(""), slugify(""));
});

test("uniqueSlug adds -2, -3 ... until free, also with async checks", async () => {
  const taken = new Set(["my-post", "my-post-2"]);
  assert.equal(await uniqueSlug("My Post", (s) => taken.has(s)), "my-post-3");
  assert.equal(await uniqueSlug("Other", async (s) => taken.has(s)), "other");
  assert.equal(await uniqueSlug("My Post", (s) => taken.has(s), { separator: "_" }), "my_post");
});

test("uniqueSlug keeps the number inside maxLength", async () => {
  const taken = new Set(["abcdefgh"]);
  const result = await uniqueSlug("abcdefghij", (s) => taken.has(s), { maxLength: 8 });
  assert.equal(result, "abcdef-2");
  assert.ok(result.length <= 8);
});

test("isSlug", () => {
  for (const ok of ["a", "hello-world", "v2-final-3"]) assert.equal(isSlug(ok), true, ok);
  for (const bad of ["", "Hello", "a--b", "-a", "a-", "a b", "é", 5, null]) assert.equal(isSlug(bad), false, String(bad));
  assert.equal(isSlug("a_b", { separator: "_" }), true);
  assert.throws(() => slugify(5), TypeError);
});

test("ŉ is written as n, not dropped", () => {
  assert.equal(transliterate("ŉ"), "n");
  assert.equal(slugify("ŉ x"), "n-x");
});

test("isSlug does not backtrack exponentially (empty separator, long input)", () => {
  const start = Date.now();
  assert.equal(isSlug("a".repeat(40) + "!", { separator: "" }), false);
  assert.equal(isSlug("abc123", { separator: "" }), true);
  assert.equal(isSlug("a-b-", { separator: "-" }), false);
  assert.equal(isSlug("a--b"), false);
  assert.ok(Date.now() - start < 500);
});

test("uniqueSlug with a maxLength too small for the number throws instead of giving '-2'", async () => {
  await assert.rejects(uniqueSlug("abc", (s) => s === "ab", { maxLength: 2 }), RangeError);
  assert.equal(await uniqueSlug("abcdef", (s) => s === "abcd", { maxLength: 4 }), "ab-2");
});
