import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { DEX_LIST_CODE } from "../src/scripts/0-dex-order/dex_list.js";
import dexOrderModule from "../src/scripts/0-dex-order/index.js";

function createCharacter(
  id,
  name,
  controlledby = "player-1",
  archived = false
) {
  return {
    id,
    get(property) {
      const values = {
        name,
        controlledby,
        archived
      };

      return values[property];
    }
  };
}

function createHandout(id, name, notes = "") {
  const values = { name, notes };

  return {
    id,
    get(property, callback) {
      const value = values[property];

      if (callback) {
        callback(value);
      }

      return value;
    },
    set(property, value) {
      values[property] = value;
    }
  };
}

function createRoll20Sandbox({
  characters = [],
  attributes = {},
  savedState = {},
  handouts = []
} = {}) {
  const handlers = {};
  const messages = [];
  const logs = [];
  const createdObjects = [];

  const sandbox = {
    state: savedState,
    on(eventName, callback) {
      if (eventName === "ready") {
        callback();
        return;
      }

      handlers[eventName] = callback;
    },
    findObjs(query) {
      if (query?._type === "character") {
        return characters;
      }

      if (query?._type === "handout") {
        return handouts.filter(
          (handout) => !query.name || handout.get("name") === query.name
        );
      }

      return [];
    },
    getObj(type, id) {
      if (type === "handout") {
        return handouts.find((handout) => handout.id === id);
      }

      if (type !== "player") {
        return undefined;
      }

      return id === "player-1" || id === "gm" ? { id } : undefined;
    },
    playerIsGM(playerId) {
      return playerId === "gm";
    },
    getAttrByName(characterId, attributeName) {
      return attributes[characterId]?.[attributeName];
    },
    createObj(type, objectAttributes) {
      createdObjects.push({
        type,
        attributes: { ...objectAttributes }
      });

      if (type !== "handout") {
        return undefined;
      }

      const handout = createHandout(
        `handout-${handouts.length + 1}`,
        objectAttributes.name
      );
      handouts.push(handout);
      return handout;
    },
    sendChat(who, content) {
      messages.push({ who, content });
    },
    log(value) {
      logs.push(value);
    }
  };

  vm.runInNewContext(DEX_LIST_CODE, sandbox);

  return {
    createdObjects,
    handouts,
    logs,
    messages,
    savedState,
    send(content, overrides = {}) {
      handlers["chat:message"]({
        type: "api",
        content,
        playerid: "gm",
        who: "GM",
        ...overrides
      });
    }
  };
}

test("!pow-order sorts by Power and renders the Power label", () => {
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("a", "철수"),
      createCharacter("b", "짱구")
    ],
    attributes: {
      a: { dex: 90, pow: 40, con: 60 },
      b: { dex: 30, pow: 80, con: 50 }
    }
  });

  roll20.send("!pow-order");

  assert.equal(roll20.messages.length, 1);
  assert.equal(roll20.messages[0].who, "");
  const output = roll20.messages[0].content;
  assert.match(output, /\{\{name=정신력 순서 확인\}\}/);
  assert.match(output, /\{\{짱구=정신력 80\}\}/);
  assert.match(output, /\{\{철수=정신력 40\}\}/);
  assert.ok(output.indexOf("짱구") < output.indexOf("철수"));
  assert.doesNotMatch(output, /민첩 순서/);
});

test("GM-controlled characters stay excluded until allowlisted", () => {
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("player", "유리"),
      createCharacter("gm-character", "철수", "gm")
    ],
    attributes: {
      player: { dex: 50 },
      "gm-character": { dex: 90 }
    }
  });

  roll20.send("!dex-order");

  const output = roll20.messages.at(-1).content;
  assert.match(output, /유리/);
  assert.doesNotMatch(output, /철수/);
});

test("add command stores trimmed unique names in the shared allowlist", () => {
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("a", "철수", "gm"),
      createCharacter("b", "짱구", "gm")
    ],
    attributes: {
      a: { pow: 40 },
      b: { pow: 80 }
    }
  });

  roll20.send('!dex-order+" 철수, 짱구, 철수, , "');

  assert.deepEqual(
    Array.from(roll20.savedState.AttributeOrder.additionalCharacterNames),
    ["철수", "짱구"]
  );
  assert.match(roll20.messages.at(-1).content, /추가 캐릭터 명단 추가/);
  assert.doesNotMatch(roll20.messages.at(-1).content, /예외/);

  roll20.send("!pow-order");

  const output = roll20.messages.at(-1).content;
  assert.match(output, /정신력 순서 확인/);
  assert.match(output, /철수/);
  assert.match(output, /짱구/);
});

test("remove command deletes multiple names from the shared allowlist", () => {
  const savedState = {
    AttributeOrder: {
      additionalCharacterNames: ["철수", "짱구"]
    }
  };
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("a", "철수", "gm"),
      createCharacter("b", "짱구", "gm")
    ],
    attributes: {
      a: { con: 70 },
      b: { con: 60 }
    },
    savedState
  });

  roll20.send('!con-order-" 철수, 짱구 "');

  assert.deepEqual(
    Array.from(roll20.savedState.AttributeOrder.additionalCharacterNames),
    []
  );

  roll20.send("!con-order");

  const output = roll20.messages.at(-1).content;
  assert.doesNotMatch(output, /철수|짱구/);
});

test("non-GM players cannot change the allowlist", () => {
  const roll20 = createRoll20Sandbox();

  roll20.send('!pow-order+"철수"', {
    playerid: "player-1",
    who: "Player"
  });

  assert.deepEqual(
    Array.from(roll20.savedState.AttributeOrder.additionalCharacterNames),
    []
  );
  assert.equal(roll20.messages.at(-1).who, "특성치 순서");
  assert.match(roll20.messages.at(-1).content, /GM만 사용할 수 있습니다/);
});

test("!con-order sorts by Constitution and renders only the Health label", () => {
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("a", "철수"),
      createCharacter("b", "짱구")
    ],
    attributes: {
      a: { dex: 90, pow: 80, con: 40 },
      b: { dex: 30, pow: 20, con: 70 }
    }
  });

  roll20.send("!con-order");

  const output = roll20.messages.at(-1).content;
  assert.match(output, /\{\{name=건강 순서 확인\}\}/);
  assert.match(output, /\{\{짱구=건강 70\}\}/);
  assert.match(output, /\{\{철수=건강 40\}\}/);
  assert.ok(output.indexOf("짱구") < output.indexOf("철수"));
  assert.doesNotMatch(output, /민첩 순서|정신력 순서/);
});

test("order results omit a chat sender before the description", () => {
  const commands = ["!dex-order", "!pow-order", "!con-order"];

  commands.forEach((command) => {
    const roll20 = createRoll20Sandbox();

    roll20.send(command);

    assert.equal(roll20.messages.at(-1).who, "");
  });
});

test("equal selected values use the existing combat-skill fallback", () => {
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("a", "철수"),
      createCharacter("b", "짱구")
    ],
    attributes: {
      a: { con: 50, fighting_brawl: 20 },
      b: { con: 50, fighting_brawl: 70 }
    }
  });

  roll20.send("!con-order");

  const output = roll20.messages.at(-1).content;
  assert.ok(output.indexOf("짱구") < output.indexOf("철수"));
  assert.match(output, /짱구=건강 50 \/ 기능치 70 \(근접전\)/);
});

test("malformed allowlist syntax returns label-aware usage", () => {
  const roll20 = createRoll20Sandbox();

  roll20.send('!con-order+"철수');

  assert.equal(roll20.messages.length, 1);
  assert.equal(roll20.messages[0].who, "특성치 순서");
  assert.match(roll20.messages[0].content, /사용법/);
  assert.match(roll20.messages[0].content, /!con-order\+"철수, 짱구"/);
});

test("commands that only share an order-command prefix are ignored", () => {
  const roll20 = createRoll20Sandbox();

  roll20.send("!dex-ordering");
  roll20.send("!pow-order-helper");

  assert.equal(roll20.messages.length, 0);
});

test("archived allowlisted characters stay excluded from an empty result", () => {
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("archived", "철수", "gm", true)
    ],
    attributes: {
      archived: { pow: 80 }
    },
    savedState: {
      AttributeOrder: {
        additionalCharacterNames: ["철수"]
      }
    }
  });

  roll20.send("!pow-order");

  const output = roll20.messages.at(-1).content;
  assert.doesNotMatch(output, /철수/);
  assert.match(output, /현재 순서를 확인할 캐릭터가 없습니다/);
});

test("legacy GM-name state migrates into the additional character list", () => {
  const savedState = {
    AttributeOrder: {
      gmCharacterNames: ["짱구"]
    }
  };
  const roll20 = createRoll20Sandbox({
    characters: [
      createCharacter("player", "철수"),
      createCharacter("unassigned", "짱구", "")
    ],
    attributes: {
      player: { dex: 50 },
      unassigned: { dex: 80 }
    },
    savedState
  });

  assert.deepEqual(
    Array.from(savedState.AttributeOrder.additionalCharacterNames),
    ["짱구"]
  );
  assert.equal(savedState.AttributeOrder.gmCharacterNames, undefined);

  roll20.send("!dex-order");

  const output = roll20.messages.at(-1).content;
  assert.match(output, /철수/);
  assert.match(output, /짱구/);
});

test("an order command creates and populates the command handout", () => {
  const roll20 = createRoll20Sandbox();

  roll20.send("!pow-order");

  assert.equal(roll20.handouts.length, 1);
  const handout = roll20.handouts[0];
  assert.equal(handout.get("name"), "특성치 순서 명령어 안내");
  assert.equal(
    roll20.savedState.AttributeOrder.handoutId,
    handout.id
  );
  assert.deepEqual(roll20.createdObjects, [
    {
      type: "handout",
      attributes: {
        name: "특성치 순서 명령어 안내"
      }
    }
  ]);

  const notes = handout.get("notes");
  assert.match(notes, /!dex-order/);
  assert.match(notes, /!pow-order/);
  assert.match(notes, /!con-order/);
  assert.match(notes, /추가 캐릭터 명단/);
  assert.match(notes, /!dex-order\+&quot;철수, 짱구&quot;/);
  assert.match(notes, /!dex-order-&quot;철수, 짱구&quot;/);
  assert.match(notes, /현재 없음/);
  assert.match(roll20.messages.at(-1).content, /정신력 순서 확인/);
});

test("mixer metadata advertises all attribute order commands", () => {
  assert.match(dexOrderModule.title, /특성치/);
  assert.match(dexOrderModule.command, /!dex-order/);
  assert.match(dexOrderModule.command, /!pow-order/);
  assert.match(dexOrderModule.command, /!con-order/);
  assert.match(dexOrderModule.description, /민첩/);
  assert.match(dexOrderModule.description, /정신력/);
  assert.match(dexOrderModule.description, /건강/);
});
