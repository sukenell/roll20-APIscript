import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8")
]);

test("copy button remains without a layout-shifting status element", () => {
  assert.match(html, /id="copy-code"/);
  assert.doesNotMatch(html, /copy-status/);
  assert.doesNotMatch(app, /copyStatus|setCopyStatus/);
  assert.doesNotMatch(styles, /\.copy-status/);
});
