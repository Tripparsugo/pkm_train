import {ActionEvaluation, ActionEvaluator, ActionPicker, BattleInfo, Player, PlayerAction, PokemonSet} from "./pt";
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
import {getLatestModelOrCreateNew, loadModel} from "./utils";
import {type} from "os";

const FORMAT = ""

type TurnCallback = (player: Player, battleInfo: BattleInfo, evs: ActionEvaluation[], pickedAction: PlayerAction) => void
class ConcretePlayer implements Player {
    id: string;
    readonly strategy: string;
    readonly team: PokemonSet[];
    private readonly actionEvaluator: ActionEvaluator
    private readonly actionPicker: ActionPicker
    private _turnCallback: TurnCallback



    constructor(strategy: string, team: PokemonSet[], actionEvaluator: ActionEvaluator, actionPicker: ActionPicker, turnCallback) {
        this.id = null;
        if (strategy) {
            this.strategy = strategy;
        } else {
            this.strategy = `evaluator:${actionEvaluator.evaluationStrategy}+picker:${actionPicker.pickStrategy}`
        }
        this.team = team;
        this.actionEvaluator = actionEvaluator;
        this.actionPicker = actionPicker;
        this._turnCallback = turnCallback
    }



    setTurnCallback(value: TurnCallback) {
        this._turnCallback = value;
    }

    pickMove(battleInfo: BattleInfo, request: any): PlayerAction {
        const initialEvaluation = makeInitialActionEvaluation(battleInfo, request)
        const evaluations = this.actionEvaluator.evaluateMoves(battleInfo, initialEvaluation)
        if (evaluations.length === 0) {
            // console.log("ff")
        }


        const action = this.actionPicker.pickMove(evaluations)
        this._turnCallback(this, battleInfo, evaluations, action)
        return action
    }
}


function makeRandomPlayer(turnCallback): Player {
    const team = Teams.generate(FORMAT)
    const player = new ConcretePlayer("random", team, new IdentityEvaluator(), new RandomPicker(), turnCallback)
    return player
}


function makeStandardPlayer(): Player {
    const team = Teams.generate(FORMAT)
    const evaluator = new PipelineEvaluator([new MovePowerEvaluator(),
        new BoostMoveEvaluator(), new SwapOnWeakOffenceDefenceEvaluator, new SwapDiscourageEvaluator()], "standard")
    const player = new ConcretePlayer("standard", team, evaluator, new SoftmaxPicker(), (a,b,c)=>null)
    return player
}


async function makeLatestDeepPlayer(training: boolean): Promise<Player> {
    const model = await getLatestModelOrCreateNew()
    const ev = new DeepActionEvaluator(model)
    const picker = training ? new SoftmaxPicker() : new BestPicker()
    const team = Teams.generate(FORMAT)
    const player = new ConcretePlayer("deep", team, ev, picker, (a,b,c)=>null)
    return player
}


async function makeDeepPlayer(modelLoc: string): Promise<Player> {
    const model = await loadModel(modelLoc)
    const ev = new DeepActionEvaluator(model)
    const picker = new BestPicker()
    const team = Teams.generate(FORMAT)
    const player = new ConcretePlayer("deep", team, ev, picker, (a,b,c)=>null)
    return player

}

function makePlayer(randomPlayerChance: number,): Player {
    return null
}

export {makeRandomPlayer, makeStandardPlayer, makeLatestDeepPlayer, getLatestModelOrCreateNew, makeDeepPlayer}
