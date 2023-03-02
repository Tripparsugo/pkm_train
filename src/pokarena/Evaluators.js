import { MoveType } from "./pt";
import { computeMoveAveragePower } from "./utils";
// @ts-ignore
import { Dex } from 'pokemon-showdown';
// @ts-ignore
import * as _ from "lodash";
// import {NeuralNetwork} from "brain.js";
function makeInitialActionEvaluation(battleInfo, request) {
    var actionEvaluations = [];
    var BASE_EVALUATION = 1;
    var activePokemon = battleInfo.playerSide.filter(function (p) { return p.isActive; })[0];
    for (var _i = 0, _a = battleInfo.playerSide; _i < _a.length; _i++) {
        var pk = _a[_i];
        //trapped can also be "hidden"
        if (activePokemon && activePokemon.trapped) {
            if (activePokemon.trapped) {
                // console.log("")
            }
            break;
        }
        if (pk !== activePokemon && pk.hp > 0) {
            actionEvaluations.push({
                playerAction: { type: MoveType.SWAP, swapTarget: pk.species.id },
                evaluation: BASE_EVALUATION
            });
        }
    }
    if (request.forceSwitch) {
        return actionEvaluations;
    }
    if (!request.active[0].moves) {
        // console.log("here")
    }
    var activeMovesIds = request.active[0].moves.map(function (m) { return m.id; });
    for (var _b = 0, _c = activePokemon.moveSlots; _b < _c.length; _b++) {
        var pm = _c[_b];
        if (!pm.disabled && pm.pp > 0 && activeMovesIds.includes(pm.id)) {
            actionEvaluations.push({
                playerAction: { type: MoveType.ATTACK, moveTarget: pm.id },
                evaluation: BASE_EVALUATION
            });
        }
    }
    if (activeMovesIds.includes("struggle")) {
        actionEvaluations.push({
            playerAction: { type: MoveType.ATTACK, moveTarget: "struggle" },
            evaluation: BASE_EVALUATION
        });
    }
    return actionEvaluations;
}
function computeVsMaxPower(ownPokemon, opposingPokemon) {
    var maxAgainstPower = 0;
    var maxReceivingPower = 0;
    if (!ownPokemon.moveSlots) {
        // console.log("")
    }
    for (var _i = 0, _a = ownPokemon.moveSlots; _i < _a.length; _i++) {
        var ms = _a[_i];
        var dexMove = Dex.getActiveMove(ms.id);
        var pow = computeMoveAveragePower(dexMove, ownPokemon.species.types, opposingPokemon.species.types);
        if (pow > maxAgainstPower) {
            maxAgainstPower = pow;
        }
    }
    for (var _b = 0, _c = opposingPokemon.potentialMoves; _b < _c.length; _b++) {
        var m = _c[_b];
        var dexMove = Dex.getActiveMove(m.id);
        var pow = computeMoveAveragePower(dexMove, opposingPokemon.species.types, ownPokemon.species.types);
        if (pow > maxReceivingPower) {
            maxReceivingPower = pow;
        }
    }
    return { maxReceivingPower: maxReceivingPower, maxAgainstPower: maxAgainstPower };
}
//boosts evaluation for powerful moves
var MovePowerEvaluator = /** @class */ (function () {
    function MovePowerEvaluator() {
    }
    MovePowerEvaluator.prototype.evaluateMoves = function (battleInfo, initialEvaluations) {
        var activePokemon = battleInfo.playerSide.filter(function (p) { return p.isActive; })[0];
        var opponentActivePokemon = battleInfo.opponentSide.filter(function (p) { return p.isActive; })[0];
        var POWER_BASE = 70;
        var updatedEvaluations = _.cloneDeep(initialEvaluations);
        for (var _i = 0, updatedEvaluations_1 = updatedEvaluations; _i < updatedEvaluations_1.length; _i++) {
            var e = updatedEvaluations_1[_i];
            if (e.playerAction.type !== MoveType.ATTACK) {
                continue;
            }
            var move = Dex.getActiveMove(e.playerAction.moveTarget);
            if (move.basePower === 0 || move.category === "status") {
                continue;
            }
            var avgPower = computeMoveAveragePower(move, activePokemon.species.types, opponentActivePokemon.species.types);
            e.evaluation *= (avgPower + 10) / POWER_BASE;
        }
        return updatedEvaluations;
    };
    return MovePowerEvaluator;
}());
var BoostMoveEvaluator = /** @class */ (function () {
    function BoostMoveEvaluator() {
    }
    BoostMoveEvaluator.prototype.evaluateMoves = function (battleInfo, initialEvaluations) {
        var activePokemon = battleInfo.playerSide.filter(function (p) { return p.isActive; })[0];
        if (!activePokemon) {
            return initialEvaluations;
        }
        var opponentActivePokemon = battleInfo.opponentSide.filter(function (p) { return p.isActive; })[0];
        var totalPokemonBoosts = 0;
        for (var boostedStat in activePokemon.boosts) {
            totalPokemonBoosts += activePokemon.boosts[boostedStat];
        }
        var updatedEvaluations = _.cloneDeep(initialEvaluations);
        for (var _i = 0, updatedEvaluations_2 = updatedEvaluations; _i < updatedEvaluations_2.length; _i++) {
            var e = updatedEvaluations_2[_i];
            var totalMoveBoosts = 0;
            if (e.playerAction.type === MoveType.ATTACK) {
                var move = Dex.getActiveMove(e.playerAction.moveTarget);
                if (move.category === "status" && move.target === "self" && !!move.boosts) {
                    for (var boostedStat in move.boosts) {
                        totalMoveBoosts += move.boosts[boostedStat];
                    }
                    // do move if boost and high hp and not already boosted
                    e.evaluation *= (totalMoveBoosts + 1) / (totalPokemonBoosts + 1);
                    e.evaluation *= activePokemon.hp / activePokemon.maxhp;
                }
            }
        }
        return updatedEvaluations;
    };
    return BoostMoveEvaluator;
}());
var SwapOnWeakOffenceDefenceEvaluator = /** @class */ (function () {
    function SwapOnWeakOffenceDefenceEvaluator() {
    }
    SwapOnWeakOffenceDefenceEvaluator.prototype.evaluateMoves = function (battleInfo, initialEvaluations) {
        var activePokemon = battleInfo.playerSide.filter(function (p) { return p.isActive; })[0];
        var opponentActivePokemon = battleInfo.opponentSide.filter(function (p) { return p.isActive; })[0];
        if (!opponentActivePokemon || !activePokemon) {
            return initialEvaluations;
        }
        var updatedEvaluations = _.cloneDeep(initialEvaluations);
        var _a = computeVsMaxPower(activePokemon, opponentActivePokemon), maxReceivingPowerActive = _a.maxReceivingPower, maxAgainstPowerActive = _a.maxAgainstPower;
        var _loop_1 = function (e) {
            var targetSwap = battleInfo.playerSide.filter(function (p) { return p.species.id === e.playerAction.swapTarget; })[0];
            var _c = computeVsMaxPower(targetSwap, opponentActivePokemon), maxReceivingPowerTarget = _c.maxReceivingPower, maxAgainstPowerTarget = _c.maxAgainstPower;
            // higher for higher swap chance
            var swapFactor = maxReceivingPowerActive / (maxAgainstPowerActive + 30) * (maxAgainstPowerTarget + 10) / (maxReceivingPowerTarget + 40);
            e.evaluation *= swapFactor;
        };
        for (var _i = 0, _b = updatedEvaluations.filter(function (ev) { return ev.playerAction.type === MoveType.SWAP; }); _i < _b.length; _i++) {
            var e = _b[_i];
            _loop_1(e);
        }
        return updatedEvaluations;
    };
    return SwapOnWeakOffenceDefenceEvaluator;
}());
var IdentityEvaluator = /** @class */ (function () {
    function IdentityEvaluator() {
        this.evaluationStrategy = "identity";
    }
    IdentityEvaluator.prototype.evaluateMoves = function (battleInfo, initialEvaluations) {
        return initialEvaluations;
    };
    return IdentityEvaluator;
}());
var SwapDiscourageEvaluator = /** @class */ (function () {
    function SwapDiscourageEvaluator() {
        this.evaluationStrategy = "swap";
    }
    SwapDiscourageEvaluator.prototype.evaluateMoves = function (battleInfo, initialEvaluations) {
        var updatedEvaluations = _.cloneDeep(initialEvaluations);
        updatedEvaluations.filter(function (ev) { return ev.playerAction.type === MoveType.SWAP; }).forEach(function (ev) { return ev.evaluation *= 0.7; });
        return updatedEvaluations;
    };
    return SwapDiscourageEvaluator;
}());
// class DeepEvaluator implements ActionEvaluator {
//     readonly evaluationStrategy: string;
//     private readonly deepBrain: NeuralNetwork<any, any>
//
//     constructor(deepBrain) {
//         this.evaluationStrategy = "swap";
//         this.deepBrain = deepBrain
//     }
//
//     evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]): ActionEvaluation[] {
//         const updatedEvaluations = _.cloneDeep(initialEvaluations)
//         updatedEvaluations.filter(ev=> ev.playerAction.type === MoveType.SWAP).forEach(ev=> ev.evaluation *= 0.7)
//
//         return updatedEvaluations;
//     }
//
//
// }
var PipelineEvaluator = /** @class */ (function () {
    function PipelineEvaluator(evaluators, evaluationStrategy) {
        if (evaluationStrategy) {
            this.evaluationStrategy = evaluationStrategy;
        }
        else {
            this.evaluationStrategy = evaluators.map(function (e) { return e.evaluationStrategy; }).join("#");
        }
        this.evaluators = evaluators;
    }
    PipelineEvaluator.prototype.evaluateMoves = function (battleInfo, initialEvaluations) {
        var updatedEvaluations = initialEvaluations;
        for (var _i = 0, _a = this.evaluators; _i < _a.length; _i++) {
            var e = _a[_i];
            updatedEvaluations = e.evaluateMoves(battleInfo, updatedEvaluations);
        }
        return updatedEvaluations;
    };
    return PipelineEvaluator;
}());
export { makeInitialActionEvaluation, PipelineEvaluator, MovePowerEvaluator, BoostMoveEvaluator, IdentityEvaluator, SwapOnWeakOffenceDefenceEvaluator, SwapDiscourageEvaluator };
