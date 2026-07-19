import dexOrderModule from "./scripts/0-dex-order/index.js";
import tokenRandomModule from "./scripts/1-token-random/index.js";

export const SCRIPT_MODULES = [dexOrderModule, tokenRandomModule];

export function getSelectedModules(selected = {}) {
  return SCRIPT_MODULES.filter((module) => selected[module.id]);
}

export function buildMixedScript(selected = {}) {
  const modules = getSelectedModules(selected);

  if (!modules.length) {
    return "";
  }

  const parts = modules.map((module) => splitModuleCode(module.code));
  const comments = parts.flatMap((part) => part.comments).join("\n");
  const definitions = parts.map((part) => part.definition).join("\n\n");
  const registrations = parts
    .map((part) => `        ${part.registration}`)
    .join("\n");

  return `${comments}

on('ready', function () {
${definitions}

    function registerEventHandlers() {
${registrations}
    }

    registerEventHandlers();
});`;
}

function splitModuleCode(code) {
  const lines = String(code).trim().split("\n");
  const comments = [];

  while (lines[0]?.trim().startsWith("//")) {
    comments.push(lines.shift().trim());
  }

  while (lines[0]?.trim() === "") {
    lines.shift();
  }

  if (lines.shift()?.trim() !== "on('ready', function () {") {
    throw new Error("스크립트 모듈의 ready 시작 형식이 올바르지 않습니다.");
  }

  if (lines.pop()?.trim() !== "});") {
    throw new Error("스크립트 모듈의 ready 종료 형식이 올바르지 않습니다.");
  }

  const registrationIndex = lines.findLastIndex((line) =>
    /^\s*[A-Za-z_$][\w$]*\.registerEventHandlers\(\);\s*$/.test(line)
  );

  if (registrationIndex === -1) {
    throw new Error("스크립트 모듈의 이벤트 등록 코드를 찾을 수 없습니다.");
  }

  const registration = lines[registrationIndex].trim();
  lines.splice(registrationIndex, 1);

  while (lines.at(-1)?.trim() === "") {
    lines.pop();
  }

  return {
    comments,
    definition: lines.join("\n"),
    registration
  };
}
