export const DEX_LIST_CODE = `// (dex_list.js) 260715 by sukenelll

on('ready', function () {
    var AttributeOrder = (function () {
        /* 정렬할 특성치와 명령어 */
        var ORDER_ATTRIBUTES = [
            {
                command: '!dex-order',
                label: '민첩',
                names: ['dex']
            },
            {
                command: '!pow-order',
                label: '정신력',
                names: ['pow']
            },
            {
                command: '!con-order',
                label: '건강',
                names: ['con']
            }
        ];
        var STATE_NAMESPACE = 'AttributeOrder';
        var DEFAULT_GM_CHARACTER_NAMES = [];
        var ORDER_COMMAND_PATTERN =
            /^!(dex|pow|con)-order(?=$|\\s|[+-]\\s*")/i;
        var MANAGE_COMMAND_PATTERN =
            /^!(dex|pow|con)-order\\s*([+-])\\s*"([^"]*)"\\s*$/i;
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

        function findOrderAttribute(command) {
            return ORDER_ATTRIBUTES.find(function (attribute) {
                return attribute.command === command;
            });
        }

        function normalizeCharacterNames(names) {
            var result = [];

            names.forEach(function (name) {
                var normalizedName = String(name || '').trim();

                if (
                    normalizedName !== '' &&
                    result.indexOf(normalizedName) === -1
                ) {
                    result.push(normalizedName);
                }
            });

            return result;
        }

        function parseCharacterNames(value) {
            return normalizeCharacterNames(
                String(value || '').split(',')
            );
        }

        function initializeState() {
            if (
                !state[STATE_NAMESPACE] ||
                typeof state[STATE_NAMESPACE] !== 'object'
            ) {
                state[STATE_NAMESPACE] = {};
            }

            if (
                !Array.isArray(
                    state[STATE_NAMESPACE]
                        .gmCharacterNames
                )
            ) {
                state[STATE_NAMESPACE]
                    .gmCharacterNames =
                    normalizeCharacterNames(
                        DEFAULT_GM_CHARACTER_NAMES
                    );
            } else {
                state[STATE_NAMESPACE]
                    .gmCharacterNames =
                    normalizeCharacterNames(
                        state[STATE_NAMESPACE]
                            .gmCharacterNames
                    );
            }
        }

        function getGmCharacterNames() {
            return state[STATE_NAMESPACE]
                .gmCharacterNames;
        }

        function isAllowedGmCharacter(character) {
            var characterName = String(
                character.get('name') || ''
            ).trim();

            return getGmCharacterNames()
                .indexOf(characterName) !== -1;
        }

        function updateGmCharacterNames(action, names) {
            var currentNames = getGmCharacterNames();

            if (action === '+') {
                state[STATE_NAMESPACE]
                    .gmCharacterNames =
                    normalizeCharacterNames(
                        currentNames.concat(names)
                    );
            } else {
                state[STATE_NAMESPACE]
                    .gmCharacterNames =
                    currentNames.filter(function (name) {
                        return names.indexOf(name) === -1;
                    });
            }
        }

        function showGmCharacterNamesResult(
            orderAttribute,
            action,
            names
        ) {
            var actionLabel =
                action === '+' ? '추가' : '삭제';

            sendChat(
                orderAttribute.label + ' 순서',
                '/w gm GM 캐릭터 예외 명단 ' +
                actionLabel + ': ' +
                names.map(escapeTemplateText).join(', ')
            );
        }

        function showCommandUsage(orderAttribute) {
            sendChat(
                orderAttribute.label + ' 순서',
                '/w gm 사용법: ' +
                orderAttribute.command +
                ' 또는 ' +
                orderAttribute.command +
                '+"철수, 짱구" / ' +
                orderAttribute.command +
                '-"철수, 짱구"'
            );
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

        function getCharacterInfo(
            character,
            sheetIndex,
            orderAttribute
        ) {
            return {
                id: character.id,
                name: String(
                    character.get('name') || '이름 없음'
                ),
                orderValue: getAttributeValue(
                    character.id,
                    orderAttribute.names
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
            var allOrderValuesEqual = allValuesEqual(
                characters,
                function (character) {
                    return character.orderValue;
                }
            );

            /*
             * 모든 캐릭터의 선택 특성치가 같지 않으면
             * 선택 특성치를 기준으로 내림차순 정렬합니다.
             */
            if (!allOrderValuesEqual) {
                characters.sort(function (a, b) {
                    if (a.orderValue !== b.orderValue) {
                        return b.orderValue - a.orderValue;
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
             * 모든 선택 특성치가 같고 기능치가 서로 다르면
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

        function buildTemplate(
            characters,
            showCombat,
            orderAttribute
        ) {
            var output =
                '/desc &{template:default} ' +
                '{{name=' +
                escapeTemplateText(orderAttribute.label) +
                ' 순서 확인}}';

            if (characters.length === 0) {
                return output +
                    ' {{결과=현재 순서를 확인할 ' +
                    '캐릭터가 없습니다.}}';
            }

            characters.forEach(function (character) {
                var name =
                    escapeTemplateText(character.name);

                var value =
                    escapeTemplateText(orderAttribute.label) +
                    ' ' +
                    character.orderValue;

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

        function showOrder(orderAttribute) {
            var characters = findObjs({
                _type: 'character'
            })
                .filter(function (character) {
                    return (
                        character.get('archived') !== true
                    );
                })
                .filter(function (character) {
                    return (
                        isPlayerControlled(character) ||
                        isAllowedGmCharacter(character)
                    );
                })
                .map(function (character, index) {
                    return getCharacterInfo(
                        character,
                        index,
                        orderAttribute
                    );
                });

            var result = sortCharacters(characters);

            sendChat(
                orderAttribute.label + ' 순서',
                buildTemplate(
                    result.characters,
                    result.showCombat,
                    orderAttribute
                )
            );
        }

        function handleChatMessage(msg) {
            if (msg.type !== 'api') {
                return;
            }

            var content = String(msg.content || '')
                .trim();

            var manageCommandMatch =
                content.match(MANAGE_COMMAND_PATTERN);

            var orderCommandMatch =
                content.match(ORDER_COMMAND_PATTERN);

            var command = manageCommandMatch
                ? '!' +
                    manageCommandMatch[1]
                        .toLowerCase() +
                    '-order'
                : orderCommandMatch
                    ? '!' +
                        orderCommandMatch[1]
                            .toLowerCase() +
                        '-order'
                : content
                    .split(/\\s+/)[0]
                    .toLowerCase();

            var orderAttribute =
                findOrderAttribute(command);

            if (!orderAttribute) {
                return;
            }

            if (!playerIsGM(msg.playerid)) {
                sendChat(
                    orderAttribute.label + ' 순서',
                    '/w "' +
                    String(msg.who || '')
                        .replace(/"/g, '') +
                    '" 이 명령은 GM만 사용할 수 있습니다.'
                );

                return;
            }

            if (manageCommandMatch) {
                var names = parseCharacterNames(
                    manageCommandMatch[3]
                );

                if (names.length === 0) {
                    sendChat(
                        orderAttribute.label + ' 순서',
                        '/w gm 캐릭터 이름을 입력하세요.'
                    );

                    return;
                }

                updateGmCharacterNames(
                    manageCommandMatch[2],
                    names
                );
                showGmCharacterNamesResult(
                    orderAttribute,
                    manageCommandMatch[2],
                    names
                );

                return;
            }

            if (
                !manageCommandMatch &&
                content.toLowerCase() !==
                    orderAttribute.command
            ) {
                showCommandUsage(orderAttribute);

                return;
            }

            try {
                showOrder(orderAttribute);
            } catch (error) {
                log(
                    orderAttribute.label + ' 순서 오류: ' +
                    (
                        error && error.stack
                            ? error.stack
                            : error
                    )
                );

                sendChat(
                    orderAttribute.label + ' 순서',
                    '/w gm 실행 중 오류가 발생했습니다. ' +
                    'API 콘솔을 확인하세요.'
                );
            }
        }

        function registerEventHandlers() {
            on('chat:message', handleChatMessage);
        }

        return {
            initializeState: initializeState,
            registerEventHandlers:
                registerEventHandlers
        };
    }());

    AttributeOrder.initializeState();
    AttributeOrder.registerEventHandlers();
});`;
