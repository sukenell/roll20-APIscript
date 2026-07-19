export const DEX_LIST_CODE = `// (dex_list.js) 260715 by NELL

on('ready', function () {
    var DexterityOrder = (function () {
        /* 명령어 */
        var COMMAND = '!dex-order';
        var COMBAT_ATTRIBUTES = [
            {
                names: ['fighting_brawl'],
                label: '근접전'
            },
            {
                names: ['firearms_hg', 'firearms_handgun'],
                label: '사격'
            },
            {
                names: ['firearms_rs', 'firearms_rifle'],
                label: '라/산'
            }
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
            var controlledBy =
                String(character.get('controlledby') || '')
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

        /*
         * 같은 기능에 여러 속성명이 있는 경우
         * 그중 실제로 저장된 가장 높은 값을 사용합니다.
         */
        function getAttributeValue(characterId, attributeNames) {
            var values = attributeNames.map(function (attributeName) {
                return toNumber(
                    getAttrByName(
                        characterId,
                        attributeName,
                        'current'
                    )
                );
            });

            return Math.max.apply(null, values);
        }

        /*
         * 근접전, 사격, 라/산 중 가장 높은 기능치를 구합니다.
         */
        function getCombatInfo(characterId) {
            var combatValues = COMBAT_ATTRIBUTES.map(
                function (attribute) {
                    return {
                        label: attribute.label,
                        value: getAttributeValue(
                            characterId,
                            attribute.names
                        )
                    };
                }
            );

            combatValues.sort(function (a, b) {
                return b.value - a.value;
            });

            return combatValues[0];
        }

        function getCharacterInfo(character, sheetIndex) {
            return {
                id: character.id,
                name: String(
                    character.get('name') || '이름 없음'
                ),
                dex: toNumber(
                    getAttrByName(
                        character.id,
                        'dex',
                        'current'
                    )
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
             * 민첩을 기준으로 내림차순 정렬합니다.
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
             * 모든 민첩이 같고 기능치가 서로 다르면
             * 가장 높은 전투 기능치를 기준으로 정렬합니다.
             */
            if (!allCombatEqual) {
                characters.sort(function (a, b) {
                    if (
                        a.combat.value !==
                        b.combat.value
                    ) {
                        return (
                            b.combat.value -
                            a.combat.value
                        );
                    }

                    return a.sheetIndex - b.sheetIndex;
                });
            }
            return {
                characters: characters,
                showCombat: true
            };
        }

        function buildTemplate(characters, showCombat) {
            var output =
                '/desc &{template:default} ' +
                '{{name=민첩 순서 확인}}';

            if (characters.length === 0) {
                return output +
                    ' {{결과=현재 플레이어가 제어하는 ' +
                    '캐릭터가 없습니다.}}';
            }

            characters.forEach(function (character) {
                var name =
                    escapeTemplateText(character.name);

                var value =
                    '민첩 ' + character.dex;

                if (showCombat) {
                    value +=
                        ' / 기능치 ' +
                        character.combat.value +
                        ' (' +
                        escapeTemplateText(
                            character.combat.label
                        ) +
                        ')';
                }

                output +=
                    ' {{' +
                    name +
                    '=' +
                    value +
                    '}}';
            });

            return output;
        }

        function showOrder() {
            var characters = findObjs({
                _type: 'character'
            })
                .filter(function (character) {
                    return (
                        character.get('archived') !== true
                    );
                })
                .filter(isPlayerControlled)
                .map(function (character, index) {
                    return getCharacterInfo(
                        character,
                        index
                    );
                });

            var result = sortCharacters(characters);

            sendChat(
                '',
                buildTemplate(
                    result.characters,
                    result.showCombat
                )
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
                    String(msg.who || '')
                        .replace(/"/g, '') +
                    '" 이 명령은 GM만 사용할 수 있습니다.'
                );

                return;
            }

            try {
                showOrder();
            } catch (error) {
                log(
                    'DexterityOrder 오류: ' +
                    (
                        error && error.stack
                            ? error.stack
                            : error
                    )
                );

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
            registerEventHandlers:
                registerEventHandlers
        };
    }());

    DexterityOrder.registerEventHandlers();
});`;
