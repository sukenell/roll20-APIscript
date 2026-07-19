export const TOKEN_RANDOM_CODE = `// (token_random.js) 260718 by sukenelll

on('ready', function () {
    var TokenRandom = (function () {
        var COMMAND = '!r';

        function normalizeImageUrl(value) {
            var url = String(value || '');

            try {
                url = decodeURIComponent(url);
            } catch (error) {
                /* 이미 디코딩된 URL은 그대로 사용합니다. */
            }

            return url
                .replace('/max.', '/thumb.')
                .replace('/med.', '/thumb.')
                .replace('/original.', '/thumb.');
        }

        function getMatchingWeights(sides) {
            var normalizedSides = sides.map(
                normalizeImageUrl
            );
            var tables = {};

            findObjs({
                _type: 'tableitem'
            }).forEach(function (item) {
                var tableId = item.get(
                    '_rollabletableid'
                );

                tables[tableId] =
                    tables[tableId] || [];
                tables[tableId].push(item);
            });

            var matches = Object.keys(tables)
                .map(function (tableId) {
                    var remaining =
                        tables[tableId].slice();
                    var weights = [];

                    if (
                        remaining.length !==
                        normalizedSides.length
                    ) {
                        return null;
                    }

                    for (
                        var index = 0;
                        index < normalizedSides.length;
                        index += 1
                    ) {
                        var itemIndex =
                            remaining.findIndex(
                                function (item) {
                                    return (
                                        normalizeImageUrl(
                                            item.get('avatar')
                                        ) ===
                                        normalizedSides[index]
                                    );
                                }
                            );

                        if (itemIndex === -1) {
                            return null;
                        }

                        var weight = parseInt(
                            remaining[itemIndex]
                                .get('weight'),
                            10
                        );

                        weights.push(
                            isNaN(weight) || weight < 0
                                ? 0
                                : weight
                        );
                        remaining.splice(itemIndex, 1);
                    }

                    return weights;
                })
                .filter(function (weights) {
                    return weights !== null;
                });

            return matches.length === 1
                ? matches[0]
                : null;
        }

        function chooseWeightedSide(weights) {
            var totalWeight = weights.reduce(
                function (total, weight) {
                    return total + weight;
                },
                0
            );

            if (totalWeight < 1) {
                return null;
            }

            var roll = randomInteger(totalWeight);

            for (
                var index = 0;
                index < weights.length;
                index += 1
            ) {
                roll -= weights[index];

                if (roll <= 0) {
                    return index;
                }
            }

            return weights.length - 1;
        }

        function randomizeTokenSide(selection) {
            if (selection._type !== 'graphic') {
                return;
            }

            var token = getObj('graphic', selection._id);

            if (!token) {
                return;
            }

            var sides = String(token.get('sides') || '')
                .split('|')
                .filter(function (side) {
                    return side !== '';
                });

            if (sides.length < 2) {
                return;
            }

            var weights = getMatchingWeights(sides);
            var sideIndex = weights
                ? chooseWeightedSide(weights)
                : null;

            if (sideIndex === null) {
                var currentSide = parseInt(
                    token.get('currentSide'),
                    10
                );

                if (
                    !isNaN(currentSide) &&
                    currentSide >= 0 &&
                    currentSide < sides.length
                ) {
                    sideIndex =
                        randomInteger(
                            sides.length - 1
                        ) - 1;

                    if (sideIndex >= currentSide) {
                        sideIndex += 1;
                    }
                } else {
                    sideIndex =
                        randomInteger(sides.length) - 1;
                }
            }

            token.set({
                currentSide: sideIndex,
                imgsrc: normalizeImageUrl(
                    sides[sideIndex]
                )
            });
        }

        function handleChatMessage(msg) {
            if (msg.type !== 'api') {
                return;
            }

            var command = String(msg.content || '').trim();

            if (command !== COMMAND) {
                return;
            }

            (msg.selected || []).forEach(
                randomizeTokenSide
            );
        }

        function registerEventHandlers() {
            on('chat:message', handleChatMessage);
        }

        return {
            registerEventHandlers: registerEventHandlers
        };
    }());

    TokenRandom.registerEventHandlers();
});`;
