import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("page exposes only the module list, code preview, and copy action", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");

  assert.match(html, /id="module-list"/);
  assert.match(html, /id="code-preview"/);
  assert.match(html, /id="copy-code"/);
  assert.match(html, /src="src\/scriptMixer.js"/);
  assert.match(html, /src="src\/app.js"/);
  assert.equal(html.includes("Roll20 API Script Mixer"), false);
  assert.equal(html.includes("체크한 기능만 섞어서 코드로 만들기"), false);
  assert.equal(html.includes("준비됨"), false);
  assert.equal(html.includes("스크립트 선택"), false);
  assert.equal(html.includes("프리뷰 코드"), false);
  assert.equal(html.includes('id="module-search"'), false);
  assert.equal(html.includes('id="category-tabs"'), false);
  assert.equal(html.includes('id="select-all"'), false);
  assert.equal(html.includes('id="clear-all"'), false);
  assert.equal(html.includes('id="selected-count"'), false);
  assert.equal(html.includes('id="preview-meta"'), false);
});

test("browser app keeps checkbox selection and preview without filtering or bulk actions", () => {
  const source = readFileSync(new URL("src/app.js", root), "utf8");

  assert.match(source, /renderModuleList/);
  assert.match(source, /buildMixedScript/);
  assert.match(source, /navigator\.clipboard/);
  assert.equal(source.includes("renderCategoryTabs"), false);
  assert.equal(source.includes("getFilteredModules"), false);
  assert.equal(source.includes("toggleAllModules"), false);
  assert.equal(source.includes("selectedCount"), false);
});

test("preview panel stays inside the viewport and scrolls internally", () => {
  const css = readFileSync(new URL("src/styles.css", root), "utf8");

  assert.match(css, /\.app-shell\s*{[^}]*height:\s*100vh/s);
  assert.match(css, /\.app-shell\s*{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.workspace\s*{[^}]*min-height:\s*0/s);
  assert.match(css, /\.preview-panel\s*{[^}]*min-height:\s*0/s);
  assert.match(css, /\.code-preview\s*{[^}]*overflow:\s*auto/s);
  assert.match(css, /\.code-preview\s*{[^}]*min-height:\s*0/s);
});

test("module choices have no background color or rounded corners", () => {
  const css = readFileSync(new URL("src/styles.css", root), "utf8");
  const moduleRow = css.match(/\.module-row\s*{([^}]*)}/s)?.[1] ?? "";

  assert.equal(moduleRow.includes("background:"), false);
  assert.equal(moduleRow.includes("border-radius:"), false);
  assert.equal(css.includes(".module-row:has(input:checked)"), false);
});
