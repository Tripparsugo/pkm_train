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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { MoveType } from "./pt";
// import * as fs from "fs";
// TODO
// @ts-ignore
import { BattleStream, Dex } from 'pokemon-showdown';
import { normalizeName, playerToStreamPlayer } from "./utils";
Dex.includeFormats();
Dex.includeMods();
var Arena = /** @class */ (function () {
    function Arena(player1, player2, beforeTurnCallback, log) {
        this.battleLog = [];
        this.player1 = player1;
        this.player1.id = "p1";
        this.player2 = player2;
        this.player2.id = "p2";
        this.stream = new BattleStream();
        this.hasFinished = false;
        this.log = log;
        this.beforeTurnCallback = beforeTurnCallback;
    }
    Arena.prototype.doBattle = function () {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function () {
            var _b, _c, output, e_1_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this._initBattle();
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 7, 8, 13]);
                        _b = __asyncValues(this.stream);
                        _d.label = 2;
                    case 2: return [4 /*yield*/, _b.next()];
                    case 3:
                        if (!(_c = _d.sent(), !_c.done)) return [3 /*break*/, 6];
                        output = _c.value;
                        return [4 /*yield*/, this.doTurn(output)];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5: return [3 /*break*/, 2];
                    case 6: return [3 /*break*/, 13];
                    case 7:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 13];
                    case 8:
                        _d.trys.push([8, , 11, 12]);
                        if (!(_c && !_c.done && (_a = _b["return"]))) return [3 /*break*/, 10];
                        return [4 /*yield*/, _a.call(_b)];
                    case 9:
                        _d.sent();
                        _d.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 12: return [7 /*endfinally*/];
                    case 13: return [2 /*return*/, this.battleRecord];
                }
            });
        });
    };
    Arena.prototype.handleError = function (s) {
        throw new Error("Did not finish battle");
    };
    Arena.prototype.getBattleInfo = function (request) {
        var _a, _b;
        var activePlayerId = request.side.id;
        // const activePkm = request.active[0]
        // const otherActivePkm = this.stream.battle.sides[1].id === activePlayerId ? this.stream.battle.sides[0].active : this.stream.battle.sides[1].active
        var playerSide = this.stream.battle.sides[0].id === activePlayerId ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon;
        var otherTeam = this.stream.battle.sides[1].id === activePlayerId ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon;
        var battleHistory = null;
        var opponentSide = [];
        for (var _i = 0, otherTeam_1 = otherTeam; _i < otherTeam_1.length; _i++) {
            var p = otherTeam_1[_i];
            //never seen pkm
            if (p.activeTurns === 0 && !p.isActive) {
                continue;
            }
            var species = p.species;
            if (!species.randomBattleMoves) {
                // console.log("")
            }
            var potentialMoves = (_b = (_a = species === null || species === void 0 ? void 0 : species.randomBattleMoves) === null || _a === void 0 ? void 0 : _a.map(function (m) { return Dex.getActiveMove(m); })) !== null && _b !== void 0 ? _b : [];
            var knownMoveSlots = p.moveSlots.filter(function (ms) { return ms.used; });
            var _loop_1 = function (pm) {
                var tmp = knownMoveSlots.filter(function (ms) { return ms.id === pm.id; });
                var moveSlot = null;
                if (tmp.length > 0) {
                    moveSlot = tmp[0];
                }
                pm.moveSlot = moveSlot;
            };
            for (var _c = 0, potentialMoves_1 = potentialMoves; _c < potentialMoves_1.length; _c++) {
                var pm = potentialMoves_1[_c];
                _loop_1(pm);
            }
            var hpPercentage = p.hp / p.maxhp;
            var status_1 = p.status;
            var boosts = p.boosts;
            var isActive = p.isActive;
            opponentSide.push({
                species: species,
                potentialMoves: potentialMoves,
                hpPercentage: hpPercentage,
                status: status_1,
                boosts: boosts,
                isActive: isActive
            });
        }
        return {
            playerSide: playerSide,
            battleHistory: battleHistory,
            opponentSide: opponentSide
        };
    };
    //TODO fix
    Arena.prototype.playerActionToStreamCommand = function (playerAction, request) {
        var playerId = request.side.id;
        var i;
        var command;
        switch (playerAction.type) {
            case MoveType.ATTACK:
                i = 0;
                var activeMoves = request.active[0].moves;
                while (true) {
                    // if(!activeMoves[i]){
                    //     console.log("@" + activeMoves)
                    // }
                    //TODO
                    if (activeMoves[i].id === playerAction.moveTarget) {
                        break;
                    }
                    i++;
                }
                //command idx starts at 1
                //TODO
                command = ">".concat(playerId, " move ").concat(i + 1);
                break;
            case MoveType.SWAP:
                i = 0;
                var playerSide = request.side.pokemon;
                while (true) {
                    // if(i === playerSide.length){
                    //     console.log("hh")
                    // }
                    // const a = Dex.getName(playerSide[i].ident.split(" ")[1])
                    var pName = normalizeName(playerSide[i].details.split(",")[0]);
                    if (pName === playerAction.swapTarget) {
                        break;
                    }
                    i++;
                }
                command = ">".concat(playerId, " switch ").concat(i + 1);
                break;
            default:
                throw new Error("Unknown action");
        }
        if (this.log) {
            // const availableMoves = request.active[0].moves.filter(m => m.pp > 0 && m.disabled === false).map(m => m.move)
            // const otherActivePkm =
            // console.log("active pkm: " + request.side.)
            // console.log("available moves: " + availableMoves)
            // console.log("opposing pkmn: " + otherActivePkm)
            // console.log("picked move: " + availableMoves[move.value - 1])
            // console.log(command)
        }
        this.battleLog.push(command);
        return command;
    };
    Arena.prototype.handleRequest = function (s) {
        var request = JSON.parse(s.substring("|request".length + 1));
        if (request.wait) {
            return;
        }
        var playerId = request.side.id;
        var activePlayer = this.player1.id === playerId ? this.player1 : this.player2;
        var battleInfo = this.getBattleInfo(request);
        var playerAction = activePlayer.pickMove(battleInfo, request);
        var v = this.beforeTurnCallback(activePlayer, battleInfo, request, playerAction);
        //TODO vectorize
        var command = this.playerActionToStreamCommand(playerAction, request);
        this.stream.write(command);
    };
    Arena.prototype.handleWin = function (s) {
        var winnerName = s.substring("|win|".length);
        var _a = this.player1.id === winnerName ?
            [this.player1, this.player2] : [this.player2, this.player1], winnerPlayer = _a[0], loserPlayer = _a[1];
        if (this.log) {
            console.log(winnerName + " won");
        }
        var winnerteamStatus = this.stream.battle.sides[0].id === winnerPlayer.id ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon;
        var loserteamStatus = this.stream.battle.sides[0].id === winnerPlayer.id ? this.stream.battle.sides[1].pokemon : this.stream.battle.sides[0].pokemon;
        var battleRecord = {
            winner: winnerPlayer,
            player1: this.player1,
            player2: this.player2,
            winnerLeftNum: winnerteamStatus.filter(function (p) { return p.hp > 0; }).length,
            loserLeftNum: loserteamStatus.filter(function (p) { return p.hp > 0; }).length,
            turns: undefined
        };
        this.battleRecord = battleRecord;
    };
    Arena.prototype.doTurn = function (streamOut) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, tmp;
            return __generator(this, function (_b) {
                // if (this.stream.buf.length === 0) {
                //     await timeout(30)
                //     if (this.stream.buf.length === 0) {
                //         throw new Error("Could not finish match due to buffer timeout :/")
                //     }
                // }
                // if (this.log) {
                //     console.log(streamOut)
                // }
                this.battleLog.push(streamOut);
                for (_i = 0, _a = streamOut.split("\n"); _i < _a.length; _i++) {
                    tmp = _a[_i];
                    if (tmp.startsWith("|error|")) {
                        this.handleError(tmp);
                    }
                    if (tmp.startsWith("|win|")) {
                        this.handleWin(tmp);
                    }
                    if (tmp.startsWith("|request|")) {
                        this.handleRequest(tmp);
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    Arena.prototype._initBattle = function () {
        var formatInput = { formatid: "${format.id}" };
        this.stream.write(">start ".concat(JSON.stringify(formatInput)));
        this.stream.write(">player ".concat(this.player1.id, " ").concat(JSON.stringify(playerToStreamPlayer(this.player1))));
        this.stream.write(">player ".concat(this.player2.id, " ").concat(JSON.stringify(playerToStreamPlayer(this.player2))));
    };
    return Arena;
}());
export { Arena };
