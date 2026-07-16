import assert from "node:assert/strict";
import test from "node:test";

import {
  SCRIPT_MODULES,
  buildMixedScript,
  getSelectedModules
} from "../src/scriptMixer.js";

test("script catalog contains the dexterity order script", () => {
  assert.deepEqual(
    SCRIPT_MODULES.map((module) => ({
      id: module.id,
      title: module.title,
      command: module.command
    })),
    [
      {
        id: "dex-order",
        title: "- 캐릭터 민첩 리스트 출력",
        command: "!dex-order"
      }
    ]
  );
});

test("script catalog shows the supplied dexterity order description", () => {
  assert.equal(
    SCRIPT_MODULES[0].description,
    "플레이어블 캐릭터의 모든 민첩을 높은순에서 낮은순으로 나열합니다. 모두의 민첩이 같을시엔 근접전 기능치로 리스트를 나열합니다."
  );
});

test("buildMixedScript returns blank output when the script is not selected", () => {
  const output = buildMixedScript({});

  assert.equal(output, "");
});

test("buildMixedScript exports the supplied dexterity order script when selected", () => {
  const output = buildMixedScript({ "dex-order": true });

  assert.match(output, /var DexterityOrder = DexterityOrder \|\|/);
  assert.match(output, /var COMMAND = '!dex-order'/);
  assert.match(output, /fighting_brawl/);
  assert.match(output, /firearms_hg/);
  assert.match(output, /firearms_rs/);
  assert.equal(output.includes(".split(/\\s+/)[0]"), true);
  assert.match(output, /DexterityOrder\.registerEventHandlers\(\)/);
});

test("getSelectedModules ignores unknown keys", () => {
  const selected = getSelectedModules({ "dex-order": true, unknown: true });

  assert.deepEqual(
    selected.map((module) => module.id),
    ["dex-order"]
  );
});
