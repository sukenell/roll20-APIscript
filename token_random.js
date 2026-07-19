// (token_random.js) 260719 by sukenelll

on('ready', function () {
    var COMMAND = '!r';

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

        var currentSide = parseInt(
            token.get('currentSide'),
            10
        );
        var sideIndex;

        if (
            !isNaN(currentSide) &&
            currentSide >= 0 &&
            currentSide < sides.length
        ) {
            sideIndex =
                randomInteger(sides.length - 1) - 1;

            if (sideIndex >= currentSide) {
                sideIndex += 1;
            }
        } else {
            sideIndex =
                randomInteger(sides.length) - 1;
        }

        var imageUrl = decodeURIComponent(
            sides[sideIndex]
        )
            .replace('/max.', '/thumb.')
            .replace('/med.', '/thumb.')
            .replace('/original.', '/thumb.');

        token.set({
            currentSide: sideIndex,
            imgsrc: imageUrl
        });
    }

    function handleChatMessage(msg) {
        if (msg.type !== 'api') {
            return;
        }

        if (String(msg.content || '').trim() !== COMMAND) {
            return;
        }

        (msg.selected || []).forEach(
            randomizeTokenSide
        );
    }

    on('chat:message', handleChatMessage);
});
