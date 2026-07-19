import { SCRIPT_MODULES, buildMixedScript } from "./scriptMixer.js";

const state = {
  selected: Object.fromEntries(SCRIPT_MODULES.map((module) => [module.id, false]))
};

const elements = {
  codePreview: document.querySelector("#code-preview"),
  copyCode: document.querySelector("#copy-code"),
  copyStatus: document.querySelector("#copy-status"),
  moduleList: document.querySelector("#module-list")
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

    setCopyStatus("복사됨");
  } catch {
    setCopyStatus("복사 실패");
  }
});

function renderModuleList() {
  const rows = SCRIPT_MODULES.map((module) => {
    const row = document.createElement("div");
    row.className = "module-row";

    const titleId = `module-${module.id}-title`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(state.selected[module.id]);
    checkbox.setAttribute("aria-labelledby", titleId);
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
    description.textContent = module.description;

    const command = document.createElement("code");
    command.textContent = module.command;

    text.append(titleLine, description, command);
    row.append(checkbox, text);
    return row;
  });

  elements.moduleList.replaceChildren(...rows);
}

function renderPreview() {
  elements.codePreview.value = buildMixedScript(state.selected);
}

function setCopyStatus(value) {
  elements.copyStatus.textContent = value;
  window.clearTimeout(setCopyStatus.timer);
  setCopyStatus.timer = window.setTimeout(() => {
    elements.copyStatus.textContent = "";
  }, 1400);
}

function copyWithFallback(text) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.inset = "0 auto auto 0";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}
