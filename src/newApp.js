var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Arena } from "./pokarena/PokeArena";
import { makeRandomPlayer, makeStandardPlayer } from "./pokarena/Player";
// @ts-ignore
import { Dex } from "pokemon-showdown";
import { convertToCSV } from "./pokarena/utils";
import * as fs from "fs";
import { vectorizeTurnInfo } from "./pokarena/vectorization";
Dex.includeFormats();
Dex.includeMods();
var format = Dex.formats.get("gen8randombattle");
Dex.forFormat(format);
function toTeamData(team, won, strategy) {
    var ds = [];
    for (var _i = 0, team_1 = team; _i < team_1.length; _i++) {
        var p = team_1[_i];
        var d = {};
        d["species"] = p.species;
        d["item"] = p.item;
        d["ability"] = p.ability;
        var types = Dex.species.get(p.species).types;
        d["type1"] = types[0];
        d["type2"] = types[1];
        var moves = p.moves;
        for (var i = 0; i < moves.length; i++) {
            d["move".concat(i + 1)] = moves[i];
        }
        d["won"] = won;
        d["strategy"] = strategy;
        ds.push(d);
    }
    return ds;
}
function computeReward(pokemonLeft, otherPokemonLeft, won) {
    if (won) {
        return 0.5 + 0.5 * pokemonLeft / 6;
    }
    return 0.5 * Math.exp(-otherPokemonLeft + 1);
}
function doBattle() {
    return __awaiter(this, void 0, void 0, function () {
        function recordVectorization(activePlayer, battleInfo, request, playerAction) {
            var player = activePlayer;
            var v = vectorizeTurnInfo(battleInfo, playerAction).map(function (x) { return x.toFixed(2); });
            turnResults.push({ player: player, v: v });
        }
        var p1, p2, turnResults, battleResults, _i, turnResults_1, tr, won, _a, ownLeft, otherLeft;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    p1 = makeRandomPlayer();
                    p2 = makeStandardPlayer();
                    turnResults = [];
                    return [4 /*yield*/, new Arena(p1, p2, recordVectorization, false).doBattle()];
                case 1:
                    battleResults = _b.sent();
                    for (_i = 0, turnResults_1 = turnResults; _i < turnResults_1.length; _i++) {
                        tr = turnResults_1[_i];
                        won = battleResults.winner === tr.player;
                        _a = won ? [battleResults.winnerLeftNum, battleResults.loserLeftNum]
                            : [battleResults.loserLeftNum, battleResults.winnerLeftNum], ownLeft = _a[0], otherLeft = _a[1];
                        tr.reward = computeReward(ownLeft, otherLeft, won);
                    }
                    return [2 /*return*/, { battleResults: battleResults, turnResults: turnResults }];
            }
        });
    });
}
function doBattles(n) {
    return __awaiter(this, void 0, void 0, function () {
        var rs, i, _a, _b, e_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    rs = [];
                    i = 0;
                    _c.label = 1;
                case 1:
                    if (!(i < n)) return [3 /*break*/, 6];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    _b = (_a = rs).push;
                    return [4 /*yield*/, doBattle()];
                case 3:
                    _b.apply(_a, [_c.sent()]);
                    if (i % 50 === 0) {
                        console.log("".concat(i, "/").concat(n));
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _c.sent();
                    return [3 /*break*/, 5];
                case 5:
                    i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, rs];
            }
        });
    });
}
function handleBattlesEnd(rs) {
    var ds = [];
    var ts = [];
    for (var _i = 0, rs_1 = rs; _i < rs_1.length; _i++) {
        var r = rs_1[_i];
        var battleResults = r.battleResults, turnResults = r.turnResults;
        var winnerPlayer = battleResults.winner;
        var loserPlayer = battleResults.winner === battleResults.player1 ? battleResults.player2 : battleResults.player1;
        var d = __spreadArray(__spreadArray([], toTeamData(winnerPlayer.team, true, winnerPlayer.strategy), true), toTeamData(loserPlayer.team, false, loserPlayer.strategy), true);
        var t = turnResults.map(function (x) {
            return { reward: x.reward, v: x.v.join(" ") };
        });
        ts = ts.concat(t);
        ds = ds.concat(d);
    }
    var csvData = convertToCSV(ds);
    fs.writeFileSync('./tmp/tmp.csv', csvData);
    var csvData2 = convertToCSV(ts);
    fs.writeFileSync('./tmp/ts.csv', csvData2);
}
var BATTLES = 1000;
console.time("battles_time");
doBattles(BATTLES).then(function (rs) {
    handleBattlesEnd(rs);
    console.timeEnd("battles_time");
});
