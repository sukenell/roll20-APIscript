export const SCRIPT_MODULES = [
  {
    id: "dex-order",
    title: "- 캐릭터 민첩 리스트 출력",
    category: "전투",
    command: "!dex-order",
    description: "플레이어블 캐릭터의 모든 민첩을 높은순에서 낮은순으로 나열합니다. 모두의 민첩이 같을시엔 근접전 기능치로 리스트를 나열합니다.",
    code: `// (dex_list.js) 260716 by sukenelll

var DexterityOrder = DexterityOrder || (function () {
    'use strict';

    var COMMAND = '!dex-order';

    var COMBAT_ATTRIBUTES = [
        { name: 'fighting_brawl', label: '근접전' },
        { name: 'firearms_hg', label: '권총' },
        { name: 'firearms_rs', label: '라/산탄총' }
    ];

    function toNumber(value) {
        var number = parseFloat(value);

        return isNaN(number) ? 0 : number;
    }

    function escapeTemplateText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/{/g, '&#123;')
            .replace(/}/g, '&#125;')
            .replace(/=/g, '&#61;');
    }

    function isPlayerControlled(character) {
        var controlledBy = String(character.get('controlledby') || '')
            .split(',')
            .map(function (id) {
                return id.trim();
            })
            .filter(function (id) {
                return id !== '';
            });

        if (controlledBy.indexOf('all') !== -1) {
            return true;
        }

        return controlledBy.some(function (playerId) {
            var player = getObj('player', playerId);

            return player && !playerIsGM(playerId);
        });
    }

    function getCombatInfo(characterId) {
        var combatValues = COMBAT_ATTRIBUTES.map(function (attribute) {
            return {
                name: attribute.name,
                label: attribute.label,
                value: toNumber(
                    getAttrByName(characterId, attribute.name, 'current')
                )
            };
        });

        combatValues.sort(function (a, b) {
            return b.value - a.value;
        });

        return combatValues[0];
    }

    function getCharacterInfo(character, sheetIndex) {
        return {
            id: character.id,
            name: String(character.get('name') || '이름 없음'),
            dex: toNumber(
                getAttrByName(character.id, 'dex', 'current')
            ),
            combat: getCombatInfo(character.id),
            sheetIndex: sheetIndex
        };
    }

    function allValuesEqual(characters, getValue) {
        if (characters.length < 2) {
            return true;
        }

        var firstValue = getValue(characters[0]);

        return characters.every(function (character) {
            return getValue(character) === firstValue;
        });
    }

    function sortCharacters(characters) {
        var allDexEqual = allValuesEqual(
            characters,
            function (character) {
                return character.dex;
            }
        );

        /*
         * 모든 캐릭터의 민첩이 같지 않으면
         * 민첩만을 기준으로 내림차순 정렬합니다.
         *
         * 민첩이 같은 캐릭터끼리는 기존 시트 순서를 유지합니다.
         */
        if (!allDexEqual) {
            characters.sort(function (a, b) {
                if (a.dex !== b.dex) {
                    return b.dex - a.dex;
                }

                return a.sheetIndex - b.sheetIndex;
            });

            return {
                characters: characters,
                showCombat: false
            };
        }

        var allCombatEqual = allValuesEqual(
            characters,
            function (character) {
                return character.combat.value;
            }
        );

        /*
         * 모든 캐릭터의 민첩이 같고
         * 전투 기능치가 서로 다르면 전투 기능치로 정렬합니다.
         */
        if (!allCombatEqual) {
            characters.sort(function (a, b) {
                if (a.combat.value !== b.combat.value) {
                    return b.combat.value - a.combat.value;
                }

                return a.sheetIndex - b.sheetIndex;
            });
        }

        /*
         * 민첩과 전투 기능치가 모두 같다면 정렬하지 않고
         * 기존 캐릭터 시트 순서를 유지합니다.
         *
         * 모든 민첩이 같은 상황이므로 전투 기능치는 표시합니다.
         */
        return {
            characters: characters,
            showCombat: true
        };
    }

    function buildTemplate(characters, showCombat) {
        var output =
            '/desc &{template:default} {{name=민첩 순서 확인}}';

        if (characters.length === 0) {
            return output +
                ' {{결과=플레이어가 제어하는 캐릭터가 없습니다.}}';
        }

        characters.forEach(function (character) {
            var name = escapeTemplateText(character.name);
            var value = '민첩 ' + character.dex;

            if (showCombat) {
                value +=
                    ' / 전투 ' + character.combat.value +
                    ' (' +
                    escapeTemplateText(character.combat.label) +
                    ')';
            }

            output += ' {{' + name + '=' + value + '}}';
        });

        return output;
    }

    function showOrder() {
        var characters = findObjs({
            _type: 'character'
        })
            .filter(function (character) {
                return character.get('archived') !== true;
            })
            .filter(isPlayerControlled)
            .map(function (character, index) {
                return getCharacterInfo(character, index);
            });

        var result = sortCharacters(characters);

        sendChat(
            '민첩 순서',
            buildTemplate(result.characters, result.showCombat)
        );
    }

    function handleChatMessage(msg) {
        if (msg.type !== 'api') {
            return;
        }

        var command = String(msg.content || '')
            .trim()
            .split(/\\s+/)[0]
            .toLowerCase();

        if (command !== COMMAND) {
            return;
        }

        if (!playerIsGM(msg.playerid)) {
            sendChat(
                '민첩 순서',
                '/w "' +
                String(msg.who || '').replace(/"/g, '') +
                '" 이 명령은 GM만 사용할 수 있습니다.'
            );
            return;
        }

        try {
            showOrder();
        } catch (error) {
            log('DexterityOrder 오류: ' + error.stack);

            sendChat(
                '민첩 순서',
                '/w gm 실행 중 오류가 발생했습니다. ' +
                'API 콘솔을 확인하세요.'
            );
        }
    }

    function registerEventHandlers() {
        on('chat:message', handleChatMessage);
    }

    return {
        registerEventHandlers: registerEventHandlers
    };
}());

on('ready', function () {
    'use strict';
    DexterityOrder.registerEventHandlers();
});`
  }
];

export function getSelectedModules(selected = {}) {
  return SCRIPT_MODULES.filter((module) => selected[module.id]);
}

export function buildMixedScript(selected = {}) {
  return getSelectedModules(selected)
    .map((module) => module.code)
    .join("\\n\\n");
}
