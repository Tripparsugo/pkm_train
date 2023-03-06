import {ActionEvaluator, ActionPicker, BattleInfo, Player, PlayerAction, PokemonSet} from "./pt";
import {
    BoostMoveEvaluator, DeepActionEvaluator,
    IdentityEvaluator,
    makeInitialActionEvaluation,
    MovePowerEvaluator,
    PipelineEvaluator, SwapDiscourageEvaluator, SwapOnWeakOffenceDefenceEvaluator
} from "./Evaluators";
import {Teams} from "pokemon-showdown";
import * as tf from "@tensorflow/tfjs-node"
import {BestPicker, RandomPicker, SoftmaxPicker} from "./Pickers";
// import * as brain from "brain.js"
import * as fs from "fs"
import {getLatestModelOrCreateNew} from "./utils";

const FORMAT = ""

class ConcretePlayer implements Player {
    id: string;
    readonly strategy: string;
    readonly team: PokemonSet[];
    private readonly actionEvaluator: ActionEvaluator
    private readonly actionPicker: ActionPicker


    constructor(strategy: string, team: PokemonSet[], actionEvaluator: ActionEvaluator, actionPicker: ActionPicker) {
        this.id = null;
        if (strategy) {
            this.strategy = strategy;
        } else {
            this.strategy = `evaluator:${actionEvaluator.evaluationStrategy}+picker:${actionPicker.pickStrategy}`
        }
        this.team = team;
        this.actionEvaluator = actionEvaluator;
        this.actionPicker = actionPicker;
    }

    pickMove(battleInfo: BattleInfo, request: any): PlayerAction {
        const initialEvaluation = makeInitialActionEvaluation(battleInfo, request)
        const evaluations = this.actionEvaluator.evaluateMoves(battleInfo, initialEvaluation)
        if (evaluations.length === 0) {
            // console.log("ff")
        }


        const action = this.actionPicker.pickMove(evaluations)
        return action
    }
}




function makeRandomPlayer(): Player {
    const team = Teams.generate(FORMAT)
    const player = new ConcretePlayer("random", team, new IdentityEvaluator(), new RandomPicker())
    return player
}


function makeStandardPlayer(): Player {
    const team = Teams.generate(FORMAT)
    const evaluator = new PipelineEvaluator([new MovePowerEvaluator(),
        new BoostMoveEvaluator(), new SwapOnWeakOffenceDefenceEvaluator, new SwapDiscourageEvaluator()], "standard")
    const player = new ConcretePlayer("standard", team, evaluator, new SoftmaxPicker())
    return player
}


async function makeLatestDeepPlayer(training: boolean): Promise<Player> {
    const model = await getLatestModelOrCreateNew()
    const ev = new DeepActionEvaluator(model)
    const picker = training ? new SoftmaxPicker() : new BestPicker()
    const team = Teams.generate(FORMAT)
    const player = new ConcretePlayer("deep", team, ev, picker)
    return player
}


function makePlayer(randomPlayerChance: number,): Player {
    return null
}

export {makeRandomPlayer, makeStandardPlayer, makeLatestDeepPlayer, getLatestModelOrCreateNew}