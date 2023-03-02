var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { MoveType } from "./pt";
import { normalizeName, oneHotEncode } from "./utils";
import { Dex } from "pokemon-showdown";
function vectorizeTurnInfo(battleInfo, playerAction) {
    var v = [];
    for (var i = 0; i < 6; i++) {
        var p = battleInfo.playerSide[i];
        var v1 = vectorizePlayerPokemon(p, playerAction, !!p);
        v = v.concat(v1);
    }
    for (var i = 0; i < 6; i++) {
        var p = battleInfo.opponentSide[i];
        var v2 = vectorizeOpponentPokemon(p, !!p);
        v = v.concat(v2);
    }
    // console.log("@@@@@@@@" + v.length)
    return v;
}
var POKEMON_TYPES = [
    "normal",
    "fire",
    "water",
    "grass",
    "electric",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dark",
    "dragon",
    "steel",
    "fairy"
];
var POKEMON_ABILITIES = [
    "intimidate",
    "wonderguard",
    "speedboost",
    "protean",
    "multiscale",
    "levitate",
    "magicguard"
];
var MOVE_CATEGORIES = [
    "physical",
    "special",
    "status"
];
var ITEMS = [
    "choicescarf",
    "choiceband",
    "leftovers",
    "lifeorb",
    "baloon",
    "heavydutyboots",
    "focussash"
];
var BOOST_TARGETS = ["atk", "spa", "def", "def", "spd", "spe"];
var STATS = __spreadArray(["hp"], BOOST_TARGETS, true);
function vectorizeOpponentPokemon(pokemon, valid) {
    if (!valid) {
        var size = 2 + POKEMON_TYPES.length + STATS.length + vectorizeDexMove(undefined, false).length * 6;
        // console.log(size)
        return new Array(size).fill(0);
    }
    var statEncoding = [];
    for (var _i = 0, STATS_1 = STATS; _i < STATS_1.length; _i++) {
        var s = STATS_1[_i];
        statEncoding.push(pokemon.species.baseStats[s] / 255);
    }
    var typesEncoding = oneHotEncode(POKEMON_TYPES, pokemon.species.types);
    var hpPercentage = pokemon.hpPercentage;
    var moves = [];
    for (var i = 0; i < 6; i++) {
        var move = pokemon === null || pokemon === void 0 ? void 0 : pokemon.potentialMoves[i];
        var vMove = vectorizeDexMove(move, !!move);
        moves = moves.concat(vMove);
        // console.log("@@@@@@@@" + vMove.length)
    }
    var encoding = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], statEncoding, true), typesEncoding, true), moves, true), [
        pokemon.isActive ? 1 : 0,
        hpPercentage
    ], false);
    return encoding;
}
function vectorizePlayerPokemon(pokemon, playerAction, valid) {
    if (!valid) {
        var size = 5 + POKEMON_TYPES.length + ITEMS.length + POKEMON_TYPES.length + vectorizePlayerMove(undefined, playerAction, false).length * 4;
        var v = new Array(size).fill(0);
        return v;
    }
    // TODO make sure this is correct
    var isSelectedSwap = playerAction.type === MoveType.SWAP && playerAction.swapTarget === pokemon.species.id;
    var ability = normalizeName(pokemon.ability);
    var abilityEncoding = oneHotEncode(POKEMON_ABILITIES, [ability]);
    var item = normalizeName(pokemon.item);
    var itemEncoding = oneHotEncode(ITEMS, [item]);
    var types = pokemon.types.map(normalizeName);
    var typesEncoding = oneHotEncode(POKEMON_TYPES, types);
    var boostsEncoding = [];
    for (var _i = 0, BOOST_TARGETS_1 = BOOST_TARGETS; _i < BOOST_TARGETS_1.length; _i++) {
        var t = BOOST_TARGETS_1[_i];
        boostsEncoding.push(pokemon.boosts[t] / 6);
    }
    var statEncoding = [];
    for (var _a = 0, STATS_2 = STATS; _a < STATS_2.length; _a++) {
        var s = STATS_2[_a];
        statEncoding.push(pokemon.baseStoredStats[s] / 255);
    }
    var hp = pokemon.hp / 714;
    var maxhp = pokemon.maxhp / 714;
    var movesEncoding = [];
    // const pokemon.moves
    for (var i = 0; i < 4; i++) {
        var slot = pokemon.moveSlots[i];
        movesEncoding = movesEncoding.concat(vectorizePlayerMove(slot, playerAction, !!slot));
    }
    var ret = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
        valid ? 1 : 0,
        isSelectedSwap ? 1 : 0,
        pokemon.isActive ? 1 : 0,
        hp,
        maxhp
    ], abilityEncoding, true), itemEncoding, true), typesEncoding, true), movesEncoding, true);
    // console.log("@@@@ " + abilityEncoding.length)
    // console.log("@@@ " + itemEncoding.length)
    // console.log("@@ " + typesEncoding.length)
    // console.log("@ " + movesEncoding.length)
    // console.log("@ " + ret.length)
    return ret;
}
function vectorizePlayerMove(move, playerAction, valid) {
    if (!valid) {
        var size = 7 + vectorizeDexMove(undefined, false).length;
        return new Array(size).fill(0);
    }
    var isSelectedMove = playerAction.type === MoveType.ATTACK && playerAction.moveTarget === move.id;
    var pp = move.pp / 40;
    var maxpp = move.maxpp / 40;
    var disabled = move.disabled ? 1 : 0;
    var used = move.used ? 1 : 0;
    var dexMove = Dex.getActiveMove(move.id);
    var vDexMove = vectorizeDexMove(dexMove, valid);
    // console.log(vDexMove.length)
    return __spreadArray([
        isSelectedMove ? 1 : 0,
        valid ? 1 : 0,
        pp,
        maxpp,
        disabled,
        used
    ], vDexMove, true);
}
function vectorizeDexMove(dexMove, valid) {
    var _a;
    if (!valid) {
        var size = 7 + 5 + BOOST_TARGETS.length + POKEMON_TYPES.length + MOVE_CATEGORIES.length;
        return new Array(size).fill(0);
    }
    var accuracy = (dexMove.accuracy === true ? 100 : dexMove.accuracy) / 100; //can be true for 100%
    var basePower = dexMove.basePower / 250;
    var priority = dexMove.priority;
    var priorityEncoding = [0, 0, 0, 0, 0];
    priorityEncoding[priority] = 1;
    var type = dexMove.type.toLowerCase();
    var typeEncoding = oneHotEncode(POKEMON_TYPES, [type]);
    var category = dexMove.category.toLowerCase();
    var categoryEncoding = oneHotEncode(MOVE_CATEGORIES, [category]);
    var useTargetOffensive = dexMove.useTargetOffensive ? 1 : 0;
    var ignoreImmunity = dexMove.ignoreImmunity ? 1 : 0;
    var ignoreDefensive = dexMove.ignoreDefensive ? 1 : 0;
    var volatileStatus = dexMove.volatileStatus ? 1 : 0; //protect
    var boosts = (_a = dexMove.boosts) !== null && _a !== void 0 ? _a : {}; // {atk:,spa:,def:,spd:,spe:}
    var boostEncoding = [];
    for (var _i = 0, BOOST_TARGETS_2 = BOOST_TARGETS; _i < BOOST_TARGETS_2.length; _i++) {
        var t = BOOST_TARGETS_2[_i];
        boostEncoding.push(boosts[t] ? boosts[t] / 3 : 0);
    }
    var target = dexMove.target === "self" ? 1 : 0; // self|normal
    var encoding = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
        accuracy,
        basePower
    ], boostEncoding, true), priorityEncoding, true), typeEncoding, true), categoryEncoding, true), [
        useTargetOffensive,
        ignoreDefensive,
        ignoreImmunity,
        volatileStatus,
        target
    ], false);
    // console.log("@" + priorityEncoding.length)
    return encoding;
}
export { vectorizeTurnInfo };
