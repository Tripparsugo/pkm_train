import {ActionEvaluation, ActionEvaluator, BattleInfo, MoveType, OpponentPokemonInfo} from "./pt";
import {computeMoveAveragePower, modelEvalToActionEval} from "./utils";
import {Dex, Pokemon} from 'pokemon-showdown';
import * as _ from "lodash"
// import {NeuralNetwork} from "brain.js";
import * as tf from "@tensorflow/tfjs-node"
import {LayersModel} from "@tensorflow/tfjs-node"
import {vectorizeBattleInfo} from "./vectorization";


function makeInitialActionEvaluation(battleInfo, request): ActionEvaluation[] {
    const actionEvaluations: ActionEvaluation[] = []
    const BASE_EVALUATION = 1
    const activePokemon = battleInfo.playerSide.filter(p => p.isActive)[0]
    const canSwap = !(activePokemon && activePokemon.trapped)
    for (const pk of battleInfo.playerSide.slice(1,6)) {
        const swappable = pk !== activePokemon && pk.hp > 0
        actionEvaluations.push(
            {
                playerAction: {type: MoveType.SWAP, swapTarget: pk.species.id},
                evaluation: BASE_EVALUATION,
                available: canSwap && swappable

            }
        )
    }

    const mustSwap = request.forceSwitch



    for(let i=0; i< 4; i++){
        if(!activePokemon){
            actionEvaluations.push(
                {
                    playerAction: {type: MoveType.ATTACK, moveTarget: undefined},
                    evaluation: BASE_EVALUATION,
                    available: false
                }
            )
        } else {
            const pm = activePokemon.moveSlots[i]
            const availableMove = !!pm && !pm.disabled && pm.pp > 0
            actionEvaluations.push(
                {
                    playerAction: {type: MoveType.ATTACK, moveTarget: pm?.id},
                    evaluation: BASE_EVALUATION,
                    available: !mustSwap && availableMove
                }
            )



        }
    }



    const struggle = activePokemon &&  activePokemon.moves.map(m => m.id).includes("struggle")
    actionEvaluations.push(
        {
            playerAction: {type: MoveType.ATTACK, moveTarget: "struggle"},
            evaluation: BASE_EVALUATION,
            available: struggle
        }
    )


    return actionEvaluations
}


function computeVsMaxPower(ownPokemon: Pokemon, opposingPokemon: OpponentPokemonInfo) {
    let maxAgainstPower = 0
    let maxReceivingPower = 0
    if (!ownPokemon.moveSlots) {
        // console.log("")
    }
    for (const ms of ownPokemon.moveSlots) {
        const dexMove = Dex.getActiveMove(ms.id)
        const pow = computeMoveAveragePower(dexMove, ownPokemon.species.types, opposingPokemon.species.types)
        if (pow > maxAgainstPower) {
            maxAgainstPower = pow
        }
    }
    for (const m of opposingPokemon.potentialMoves) {
        const dexMove = Dex.getActiveMove(m.id)
        const pow = computeMoveAveragePower(dexMove, opposingPokemon.species.types, ownPokemon.species.types,)
        if (pow > maxReceivingPower) {
            maxReceivingPower = pow
        }


    }

    return {maxReceivingPower, maxAgainstPower}


}

//boosts evaluation for powerful moves
class MovePowerEvaluator implements ActionEvaluator {
    evaluationStrategy: "boost_powerful_moves"

    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]) {
        const activePokemon = battleInfo.playerSide.filter(p => p.isActive)[0]
        const opponentActivePokemon = battleInfo.opponentSide.filter(p => p.isActive)[0]
        const POWER_BASE = 70
        const updatedEvaluations:  ActionEvaluation[] = _.cloneDeep(initialEvaluations)
        for (const e of updatedEvaluations) {
            if(!e.available){
                continue
            }
            if (e.playerAction.type !== MoveType.ATTACK) {
                continue
            }
            const move = Dex.getActiveMove(e.playerAction.moveTarget)
            if (move.basePower === 0 || move.category === "status") {
                continue
            }
            const avgPower = computeMoveAveragePower(move, activePokemon.species.types, opponentActivePokemon.species.types)
            e.evaluation *= (avgPower + 10) / POWER_BASE

        }

        return updatedEvaluations
    }
}


class BoostMoveEvaluator implements ActionEvaluator {
    evaluationStrategy: "boost_powerful_moves"

    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]) {
        const activePokemon = battleInfo.playerSide.filter(p => p.isActive)[0]
        if (!activePokemon) {
            return initialEvaluations
        }
        const opponentActivePokemon = battleInfo.opponentSide.filter(p => p.isActive)[0]
        let totalPokemonBoosts = 0
        for (const boostedStat in activePokemon.boosts) {
            totalPokemonBoosts += activePokemon.boosts[boostedStat]
        }
        const updatedEvaluations = _.cloneDeep(initialEvaluations)
        for (const e of updatedEvaluations) {
            if(!e.available){
                continue
            }
            let totalMoveBoosts = 0
            if (e.playerAction.type === MoveType.ATTACK) {

                const move = Dex.getActiveMove(e.playerAction.moveTarget)

                if (move.category === "status" && move.target === "self" && !!move.boosts) {
                    for (const boostedStat in move.boosts) {
                        totalMoveBoosts += move.boosts[boostedStat]
                    }
                    // do move if boost and high hp and not already boosted
                    e.evaluation *= (totalMoveBoosts + 1) / (totalPokemonBoosts + 1)
                    e.evaluation *= activePokemon.hp / activePokemon.maxhp
                }

            }


        }
        return updatedEvaluations
    }
}


class DeepActionEvaluator implements ActionEvaluator {
    readonly evaluationStrategy: string;
    readonly model: tf.LayersModel

    constructor(model: LayersModel) {
        this.model = model
    }

    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]): ActionEvaluation[] {
        const updatedEvaluations: ActionEvaluation[] = _.cloneDeep(initialEvaluations)

        const v = vectorizeBattleInfo(battleInfo, true)
        const t = tf.tensor(v, [1, v.length])
        // @ts-ignore
        const ps = this.model.predict(t).dataSync()

        for(let i=0; i< ps.length; i++){
            updatedEvaluations[i].evaluation = ps[i]
        }
        return updatedEvaluations
    }

}

class SwapOnWeakOffenceDefenceEvaluator implements ActionEvaluator {
    evaluationStrategy: "boost_powerful_moves"

    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]) {
        const activePokemon = battleInfo.playerSide.filter(p => p.isActive)[0]
        const opponentActivePokemon = battleInfo.opponentSide.filter(p => p.isActive)[0]
        if (!opponentActivePokemon || !activePokemon) {
            return initialEvaluations
        }
        const updatedEvaluations = _.cloneDeep(initialEvaluations)
        const {
            maxReceivingPower: maxReceivingPowerActive,
            maxAgainstPower: maxAgainstPowerActive
        } = computeVsMaxPower(activePokemon, opponentActivePokemon)


        for (const e of updatedEvaluations.filter(ev => ev.playerAction.type === MoveType.SWAP)) {
            const targetSwap: Pokemon = battleInfo.playerSide.filter(p => p.species.id === e.playerAction.swapTarget)[0]
            const {
                maxReceivingPower: maxReceivingPowerTarget,
                maxAgainstPower: maxAgainstPowerTarget
            } = computeVsMaxPower(targetSwap, opponentActivePokemon)

            // higher for higher swap chance
            const swapFactor = maxReceivingPowerActive / (maxAgainstPowerActive + 30) * (maxAgainstPowerTarget + 10) / (maxReceivingPowerTarget + 40)
            e.evaluation *= swapFactor

        }
        return updatedEvaluations
    }
}


class IdentityEvaluator implements ActionEvaluator {
    readonly evaluationStrategy: string;

    constructor() {
        this.evaluationStrategy = "identity";
    }

    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]): ActionEvaluation[] {
        return initialEvaluations;
    }


}


class SwapDiscourageEvaluator implements ActionEvaluator {
    readonly evaluationStrategy: string;

    constructor() {
        this.evaluationStrategy = "swap";
    }

    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]): ActionEvaluation[] {
        const updatedEvaluations = _.cloneDeep(initialEvaluations)
        updatedEvaluations.filter(ev => ev.playerAction.type === MoveType.SWAP).forEach(ev => ev.evaluation *= 0.7)

        return updatedEvaluations;
    }


}


class PipelineEvaluator implements ActionEvaluator {
    readonly evaluationStrategy: string;
    private readonly evaluators: ActionEvaluator[]

    constructor(evaluators: ActionEvaluator[], evaluationStrategy: string) {
        if (evaluationStrategy) {
            this.evaluationStrategy = evaluationStrategy;
        } else {
            this.evaluationStrategy = evaluators.map(e => e.evaluationStrategy).join("#")
        }
        this.evaluators = evaluators
    }


    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]): ActionEvaluation[] {
        let updatedEvaluations = _.cloneDeep(initialEvaluations)
        for (const e of this.evaluators) {
            updatedEvaluations = e.evaluateMoves(battleInfo, updatedEvaluations)
        }
        return updatedEvaluations

    }

}


export {
    makeInitialActionEvaluation,
    PipelineEvaluator,
    MovePowerEvaluator,
    BoostMoveEvaluator,
    IdentityEvaluator,
    SwapOnWeakOffenceDefenceEvaluator,
    SwapDiscourageEvaluator,
    DeepActionEvaluator
}
