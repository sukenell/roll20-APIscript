import { SCRIPT_MODULES, buildMixedScript } from "./scriptMixer.js";

const state = {
  selected: Object.fromEntries(SCRIPT_MODULES.map((module) => [module.id, false]))
};

const elements = {
  codePreview: document.querySelector("#code-preview"),
  copyCode: document.querySelector("#copy-code"),
  copyStatus: document.querySelector("#copy-status"),
  moduleList: document.querySelector("#module-list"),
  previewMeta: document.querySelector("#preview-meta")
};

renderModuleList();
renderPreview();

elements.copyCode.addEventListener("click", async () => {
  const code = buildMixedScript(state.selected);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      copyWithFallback(code);
    }

    elements.copyStatus.replaceChildren("코드가 복사되었습니다.");
  } catch (error) {
    elements.copyStatus.replaceChildren("코드를 복사하지 못했습니다.");
    console.error("코드 복사 실패", error);
  }
});

function renderModuleList() {
  const rows = SCRIPT_MODULES.map((module) => {
    const row = document.createElement("div");
    row.className = "module-row";

    const titleId = `module-${module.id}-title`;
    const descriptionId = `module-${module.id}-description`;
    const commandId = `module-${module.id}-command`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(state.selected[module.id]);
    checkbox.setAttribute("aria-labelledby", titleId);
    checkbox.setAttribute("aria-describedby", `${descriptionId} ${commandId}`);
    checkbox.addEventListener("change", () => {
      state.selected = {
        ...state.selected,
        [module.id]: checkbox.checked
      };
      renderPreview();
    });

    const text = document.createElement("span");
    text.className = "module-copy";

    const titleLine = document.createElement("strong");
    titleLine.id = titleId;
    titleLine.textContent = module.title;

    const description = document.createElement("small");
    description.id = descriptionId;
    description.textContent = module.description;

    const command = document.createElement("code");
    command.id = commandId;
    command.textContent = module.command;

    text.append(titleLine, description, command);
    row.append(checkbox, text);
    return row;
  });

  elements.moduleList.replaceChildren(...rows);
}

function renderPreview() {
  elements.codePreview.value = buildMixedScript(state.selected);
  const selectedCount = SCRIPT_MODULES.filter(
    (module) => state.selected[module.id]
  ).length;

  elements.previewMeta.textContent = `${selectedCount} ${
    selectedCount === 1 ? "module" : "modules"
  }`;
}

function copyWithFallback(text) {
  const previousFocus = document.activeElement;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.inset = "0 auto auto 0";
  field.style.opacity = "0";
  document.body.append(field);
  try {
    field.select();
    if (document.execCommand("copy") === false) {
      throw new Error("Fallback copy command failed");
    }
  } finally {
    field.remove();
    if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }
}
