import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/styles.css", import.meta.url), "utf8")
]);

function ruleBody(source, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `CSS rule not found: ${selector}`);
  return match[1];
}

function declaration(rule, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return rule.match(new RegExp(`${escapedProperty}:\\s*([^;]+);`))?.[1].trim();
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)
      .map((channel) => Number.parseInt(channel, 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      );
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };

  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test("existing labels provide a native heading structure without changing their text", () => {
  assert.match(
    html,
    /<h1 class="eyebrow" lang="en">Roll20 API script by nell<\/h1>/
  );
  assert.match(
    html,
    /<section class="module-panel" aria-labelledby="module-heading">\s*<h2 class="sr-only" id="module-heading">선택 가능한 스크립트<\/h2>/
  );
  assert.match(
    html,
    /<section class="preview-panel" aria-labelledby="preview-heading">[\s\S]*?<h2 id="preview-heading" lang="en">R20 API<\/h2>/
  );

  const staticStrings = [
    "Roll20 API script by nell",
    "선택 가능한 스크립트",
    "R20 API",
    "LIVE PREVIEW",
    "roll20-api.js",
    "0 modules",
    "복사"
  ];
  let cursor = -1;
  for (const text of staticStrings) {
    const next = html.indexOf(text, cursor + 1);
    assert.ok(next > cursor, `기존 문구와 순서를 유지해야 합니다: ${text}`);
    cursor = next;
  }
});

test("existing English snippets declare their language without changing copy", () => {
  assert.match(html, /<span lang="en">LIVE PREVIEW<\/span>/);
  assert.match(html, /<strong lang="en">roll20-api\.js<\/strong>/);
  assert.match(html, /<output id="preview-meta" lang="en">0 modules<\/output>/);
});

test("promoted headings retain the original text metrics", () => {
  const eyebrowRule = styles.match(/\.eyebrow\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const toolbarHeadingRule =
    styles.match(/\.preview-toolbar h2\s*\{[\s\S]*?\}/)?.[0] ?? "";
  assert.match(eyebrowRule, /line-height:\s*normal;/);
  assert.match(toolbarHeadingRule, /line-height:\s*normal;/);
});

test("the stacked layout expands instead of clipping content at narrow widths", () => {
  const responsiveStart = styles.indexOf("@media (max-width: 980px)");
  const responsiveEnd = styles.indexOf("@media (max-width: 680px)");
  assert.ok(responsiveStart >= 0 && responsiveEnd > responsiveStart);
  const responsiveStyles = styles.slice(responsiveStart, responsiveEnd);

  const shellRule = ruleBody(responsiveStyles, ".app-shell");
  assert.equal(declaration(shellRule, "height"), "auto");
  assert.deepEqual(
    [...shellRule.matchAll(/min-height:\s*(100d?vh);/g)].map((match) => match[1]),
    ["100vh", "100dvh"]
  );
  assert.equal(declaration(shellRule, "overflow"), "visible");

  const workspaceRule = ruleBody(responsiveStyles, ".workspace");
  assert.equal(declaration(workspaceRule, "grid-template-columns"), "1fr");
  assert.equal(declaration(workspaceRule, "grid-template-rows"), "auto auto");

  const modulePanelRule = ruleBody(responsiveStyles, ".module-panel");
  assert.equal(declaration(modulePanelRule, "max-height"), "none");
  assert.equal(declaration(modulePanelRule, "overflow"), "visible");
  assert.equal(
    declaration(ruleBody(responsiveStyles, ".module-list"), "overflow"),
    "visible"
  );
  assert.equal(
    declaration(ruleBody(responsiveStyles, ".preview-panel"), "overflow"),
    "visible"
  );
  assert.equal(
    declaration(ruleBody(responsiveStyles, ".code-preview"), "min-height"),
    "18rem"
  );
});

test("the body can shrink when a narrow viewport gains a vertical scrollbar", () => {
  const responsiveStart = styles.indexOf("@media (max-width: 980px)");
  const responsiveEnd = styles.indexOf("@media (max-width: 680px)");
  const responsiveStyles = styles.slice(responsiveStart, responsiveEnd);

  assert.equal(declaration(ruleBody(responsiveStyles, "body"), "min-width"), "0");
});

test("long module commands wrap within their grid column", () => {
  assert.equal(declaration(ruleBody(styles, ".module-copy"), "min-width"), "0");

  const codeRule = ruleBody(styles, ".module-copy code");
  assert.equal(declaration(codeRule, "overflow-wrap"), "anywhere");
  assert.equal(declaration(codeRule, "white-space"), "normal");
  assert.equal(declaration(codeRule, "width"), "auto");
});

test("preview metadata keeps at least 4.5 to 1 text contrast", () => {
  const color = declaration(ruleBody(styles, ".preview-document-bar output"), "color");
  const ratio = contrastRatio(color, "#ffffff");
  assert.ok(ratio >= 4.5, `metadata contrast was ${ratio.toFixed(2)}:1`);
});

test("focus-visible indicators use outlines with at least 3 to 1 contrast", () => {
  const outlineColor = (rule) =>
    rule.match(/outline:\s*\d+px\s+solid\s+(#[0-9a-f]{6});/i)?.[1];

  const hoverRule = ruleBody(styles, ".copy-button:hover");
  assert.equal(declaration(hoverRule, "background"), "#35d7bb");
  assert.equal(declaration(hoverRule, "color"), "#2b2f36");

  const copyFocusRule = ruleBody(styles, ".copy-button:focus-visible");
  const copyOutline = outlineColor(copyFocusRule);
  const copyBackground = declaration(copyFocusRule, "background");
  assert.ok(
    contrastRatio(copyOutline, copyBackground) >= 3,
    "copy focus outline must contrast with its focused background"
  );
  assert.match(copyFocusRule, /outline-offset:\s*-\d+px;/);

  const previewRule = ruleBody(styles, ".code-preview");
  const previewFocusRule = ruleBody(styles, ".code-preview:focus-visible");
  assert.ok(
    contrastRatio(outlineColor(previewFocusRule), declaration(previewRule, "background")) >= 3,
    "preview focus outline must contrast with the textarea background"
  );
  assert.match(previewFocusRule, /outline-offset:\s*-\d+px;/);

  const checkboxFocusRule = ruleBody(styles, ".module-row input:focus-visible");
  assert.ok(
    contrastRatio(
      outlineColor(checkboxFocusRule),
      declaration(ruleBody(styles, ":root"), "background")
    ) >= 3,
    "checkbox focus outline must contrast with the page background"
  );

  assert.doesNotMatch(styles, /outline:\s*none;/);
  for (const focusRule of [copyFocusRule, previewFocusRule, checkboxFocusRule]) {
    assert.doesNotMatch(focusRule, /box-shadow:/);
  }
});

test("forced-colors mode gives every interactive control a system-color outline", () => {
  const forcedColorsStart = styles.indexOf("@media (forced-colors: active)");
  assert.ok(forcedColorsStart >= 0, "forced-colors override is required");
  const forcedColorsStyles = styles.slice(forcedColorsStart);

  for (const selector of [
    ".copy-button:focus-visible",
    ".module-row input:focus-visible",
    ".code-preview:focus-visible"
  ]) {
    assert.ok(forcedColorsStyles.includes(selector), `${selector} needs an override`);
  }
  assert.match(
    forcedColorsStyles,
    /outline:\s*\d+px\s+solid\s+(?:Highlight|CanvasText);/
  );
  assert.doesNotMatch(forcedColorsStyles, /forced-color-adjust:\s*none;/);
});

test("copy feedback is permanently present for assistive technology only", () => {
  assert.match(html, /id="copy-code"[^>]*>복사<\/button>/);
  assert.match(
    html,
    /<output\s+class="sr-only"\s+id="copy-status"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"\s*><\/output>/
  );
  assert.match(styles, /\.sr-only\s*\{[\s\S]*?position:\s*absolute;/);

  const textarea = html.match(/<textarea[\s\S]*?<\/textarea>/)?.[0] ?? "";
  assert.doesNotMatch(textarea, /aria-live=/);
});

class FakeElement {
  constructor(ownerDocument, tagName = "div") {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    this.style = {};
    this.isConnected = true;
    this.replaceChildrenCalls = 0;
    this.textContent = "";
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  append(...children) {
    this.children.push(...children);
    for (const child of children) {
      if (child && typeof child === "object") {
        child.parentNode = this;
        child.isConnected = true;
      }
    }
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(
        (child) => child !== this
      );
    }
    this.isConnected = false;
  }

  replaceChildren(...children) {
    this.replaceChildrenCalls += 1;
    this.children = children;
    this.textContent = children.join("");
  }

  select() {
    this.ownerDocument.activeElement = this;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

let harnessSequence = 0;

async function createAppHarness({ execCommandResult = true } = {}) {
  const document = {
    activeElement: null,
    execCommandCalls: 0,
    createElement(tagName) {
      return new FakeElement(this, tagName);
    },
    execCommand(command) {
      assert.equal(command, "copy");
      this.execCommandCalls += 1;
      return execCommandResult;
    }
  };

  const elements = {
    "#code-preview": new FakeElement(document, "textarea"),
    "#copy-code": new FakeElement(document, "button"),
    "#copy-status": new FakeElement(document, "output"),
    "#module-list": new FakeElement(document),
    "#preview-meta": new FakeElement(document, "output")
  };
  document.body = new FakeElement(document, "body");
  document.querySelector = (selector) => elements[selector];

  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: document
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {}
  });

  await import(`../src/app.js?ui-test=${harnessSequence++}`);

  return {
    document,
    elements,
    restore() {
      if (originalDocument) {
        Object.defineProperty(globalThis, "document", originalDocument);
      } else {
        delete globalThis.document;
      }
      if (originalNavigator) {
        Object.defineProperty(globalThis, "navigator", originalNavigator);
      } else {
        delete globalThis.navigator;
      }
    }
  };
}

test("each module checkbox describes its explanation and command", async () => {
  const harness = await createAppHarness();
  try {
    assert.ok(harness.elements["#module-list"].children.length > 0);
    for (const row of harness.elements["#module-list"].children) {
      const [checkbox, copy] = row.children;
      const [title, description, command] = copy.children;
      assert.equal(checkbox.getAttribute("aria-labelledby"), title.id);
      assert.ok(description.id);
      assert.ok(command.id);
      assert.equal(
        checkbox.getAttribute("aria-describedby"),
        `${description.id} ${command.id}`
      );
    }
  } finally {
    harness.restore();
  }
});

test("fallback copy restores focus and re-announces repeated success", async () => {
  const harness = await createAppHarness();
  try {
    const button = harness.elements["#copy-code"];
    const status = harness.elements["#copy-status"];
    const click = button.listeners.get("click");
    button.focus();

    await click();
    await click();

    assert.equal(harness.document.execCommandCalls, 2);
    assert.equal(harness.document.body.children.length, 0);
    assert.equal(harness.document.activeElement, button);
    assert.equal(status.textContent, "코드가 복사되었습니다.");
    assert.equal(status.replaceChildrenCalls, 2);
  } finally {
    harness.restore();
  }
});

test("a false fallback result is treated as copy failure after cleanup", async () => {
  const harness = await createAppHarness({ execCommandResult: false });
  const originalConsoleError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    const button = harness.elements["#copy-code"];
    const status = harness.elements["#copy-status"];
    button.focus();

    await button.listeners.get("click")();

    assert.equal(harness.document.body.children.length, 0);
    assert.equal(harness.document.activeElement, button);
    assert.equal(status.textContent, "코드를 복사하지 못했습니다.");
    assert.equal(errors.length, 1);
  } finally {
    console.error = originalConsoleError;
    harness.restore();
  }
});
