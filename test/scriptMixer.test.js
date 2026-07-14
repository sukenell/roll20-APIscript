import assert from "node:assert/strict";
import test from "node:test";

import {
  SCRIPT_MODULES,
  buildMixedScript,
  getSelectedModules
} from "../src/scriptMixer.js";

test("script catalog only contains the user-provided token image list checker", () => {
  assert.deepEqual(
    SCRIPT_MODULES.map((module) => ({
      id: module.id,
      title: module.title,
      command: module.command
    })),
    [
      {
        id: "bigside",
        title: "-토큰 이미지 리스트 확인",
        command: "!bigside / !bigside-set"
      }
    ]
  );
});

test("buildMixedScript returns blank output when the first script is not selected", () => {
  const output = buildMixedScript({});

  assert.equal(output, "");
});

test("buildMixedScript exports only the token image list checker when selected", () => {
  const output = buildMixedScript({ bigside: true });

  assert.match(output, /const SG_BIGSIDE =/);
  assert.match(output, /renderSidePicker/);
  assert.match(output, /!bigside/);
  assert.match(output, /!bigside-set/);
  assert.match(output, /currentSide/);
  assert.equal(/const SG_(?!BIGSIDE)/.test(output), false);
});

test("getSelectedModules ignores unknown keys", () => {
  const selected = getSelectedModules({ bigside: true, unknown: true });

  assert.deepEqual(
    selected.map((module) => module.id),
    ["bigside"]
  );
});
