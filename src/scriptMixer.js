import dexOrderModule from "./scripts/0-dex-order/index.js";
import tokenRandomModule from "./scripts/1-token-random/index.js";

export const SCRIPT_MODULES = [dexOrderModule, tokenRandomModule];

export function getSelectedModules(selected = {}) {
  return SCRIPT_MODULES.filter((module) => selected[module.id]);
}

export function buildMixedScript(selected = {}) {
  return getSelectedModules(selected)
    .map((module) => module.code)
    .join("\n\n");
}
