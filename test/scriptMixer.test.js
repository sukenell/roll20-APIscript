import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

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

  assert.match(output, /^\/\/ \(dex_list\.js\) 260715 by sukenelll/);
  assert.match(output, /on\('ready', function \(\) \{/);
  assert.match(output, /var DexterityOrder = \(function \(\) \{/);
  assert.match(output, /var COMMAND = '!dex-order'/);
  assert.match(output, /function getAttributeValue/);
  assert.match(output, /fighting_brawl/);
  assert.match(output, /names: \['firearms_hg', 'firearms_handgun'\]/);
  assert.match(output, /names: \['firearms_rs', 'firearms_rifle'\]/);
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

test("dexterity order uses the highest combat skill across both firearm attribute schemes", () => {
  const output = buildMixedScript({ "dex-order": true });
  const handlers = {};
  const messages = [];
  const characters = [
    { id: "brawl", name: "근접 캐릭터" },
    { id: "handgun", name: "권총 캐릭터" },
    { id: "rifle", name: "라산 캐릭터" }
  ].map(({ id, name }) => ({
    id,
    get(key) {
      if (key === "name") return name;
      if (key === "controlledby") return "player-1";
      if (key === "archived") return false;
      return "";
    }
  }));
  const attributes = {
    brawl: { dex: 60, fighting_brawl: 70 },
    handgun: { dex: 60, fighting_brawl: 20, firearms_handgun: 99 },
    rifle: { dex: 60, fighting_brawl: 50, firearms_rifle: 93 }
  };

  vm.runInNewContext(output, {
    findObjs: () => characters,
    getAttrByName: (characterId, name) => attributes[characterId][name] ?? "",
    getObj: () => ({}),
    playerIsGM: (playerId) => playerId === "gm",
    sendChat: (speaker, message) => messages.push({ speaker, message }),
    log: () => {},
    on: (event, handler) => {
      handlers[event] = handler;
    }
  });

  handlers.ready();
  handlers["chat:message"]({
    type: "api",
    content: "!dex-order",
    playerid: "gm",
    who: "GM"
  });

  const message = messages[0].message;
  assert.ok(message.indexOf("권총 캐릭터") < message.indexOf("라산 캐릭터"));
  assert.ok(message.indexOf("라산 캐릭터") < message.indexOf("근접 캐릭터"));
  assert.equal(messages[0].speaker, "");
  assert.match(message, /기능치 99 \(사격\)/);
  assert.match(message, /기능치 93 \(라\/산\)/);
});
