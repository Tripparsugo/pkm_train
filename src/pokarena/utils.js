import { Teams, Dex } from "pokemon-showdown";
function buildAIAveraging(ai1, ai2, ai_w1) {
    return null;
}
function buildAIPipeline(ais) {
    return null;
}
function playerToStreamPlayer(player) {
    return {
        "name": player.id,
        "id": player.id,
        "team": Teams.pack(player.team)
    };
}
function timeout(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function computeMoveAveragePower(activeMoveDex, activePokemonTypes, opponentActivePokemonTypes) {
    var effToMultiplier = new Map();
    effToMultiplier.set(-2, 0.25);
    effToMultiplier.set(-1, 0.5);
    effToMultiplier.set(0, 1);
    effToMultiplier.set(1, 2);
    effToMultiplier.set(2, 4);
    var moveType = activeMoveDex.type;
    if (!Dex.getImmunity(moveType, opponentActivePokemonTypes)) {
        return 0;
    }
    var movePower = activeMoveDex.basePower;
    var isStab = activePokemonTypes.includes(moveType);
    var eff = Dex.getEffectiveness(moveType, opponentActivePokemonTypes);
    var moveAccuracy = activeMoveDex.accuracy;
    var multiplier = effToMultiplier.get(eff);
    if (isStab) {
        multiplier = multiplier * 1.5;
    }
    var actualMovePower = multiplier * movePower;
    var actualAverageMovePower = actualMovePower * moveAccuracy / 100;
    return actualAverageMovePower;
}
// from https://gist.github.com/cyphunk/6c255fa05dd30e69f438a930faeb53fe
function softmax(logits) {
    var maxLogit = logits.reduce(function (a, b) { return Math.max(a, b); }, -Infinity);
    var scores = logits.map(function (l) { return Math.exp(l - maxLogit); });
    var denom = scores.reduce(function (a, b) { return a + b; });
    return scores.map(function (s) { return s / denom; });
}
function oneHotEncode(categories, values) {
    categories.sort();
    return categories.map(function (c) { return values.includes(c) ? 1 : 0; });
}
function convertToCSV(arr) {
    var array = [Object.keys(arr[0])].concat(arr);
    return array.map(function (it) {
        return Object.values(it).toString();
    }).join('\n');
}
function normalizeName(name) {
    return name.toLowerCase().replaceAll(/[’:.\-% ]/ig, "");
}
export { playerToStreamPlayer, timeout, computeMoveAveragePower, softmax, convertToCSV, oneHotEncode, normalizeName };
