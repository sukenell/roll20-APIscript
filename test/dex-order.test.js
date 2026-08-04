import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import { DEX_LIST_CODE } from "../src/scripts/0-dex-order/dex_list.js";

function createCharacter(id, name, controlledby = "player-1") {
  return {
    id,
    get(property) {
      const values = {
        name,
        controlledby,
        archived: false
      };

      return values[property];
    }
  };
}

function createRoll20Sandbox({ characters = [], attributes = {}, savedState = {} } = {}) {
  const handlers = {};
  const messages = [];
  const logs = [];

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
      return query?._type === "character" ? characters : [];
    },
    getObj(type, id) {
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
    sendChat(who, content) {
      messages.push({ who, content });
    },
    log(value) {
      logs.push(value);
    }
  };

  vm.runInNewContext(DEX_LIST_CODE, sandbox);

  return {
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
  const output = roll20.messages[0].content;
  assert.match(output, /\{\{name=정신력 순서 확인\}\}/);
  assert.match(output, /\{\{짱구=정신력 80\}\}/);
  assert.match(output, /\{\{철수=정신력 40\}\}/);
  assert.ok(output.indexOf("짱구") < output.indexOf("철수"));
  assert.doesNotMatch(output, /민첩 순서/);
});
