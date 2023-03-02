import { BoostMoveEvaluator, IdentityEvaluator, makeInitialActionEvaluation, MovePowerEvaluator, PipelineEvaluator, SwapDiscourageEvaluator, SwapOnWeakOffenceDefenceEvaluator } from "./Evaluators";
import { Teams } from "pokemon-showdown";
import { RandomPicker, SoftmaxPicker } from "./Pickers";
var FORMAT = "";
var ConcretePlayer = /** @class */ (function () {
    function ConcretePlayer(strategy, team, actionEvaluator, actionPicker) {
        this.id = null;
        if (strategy) {
            this.strategy = strategy;
        }
        else {
            this.strategy = "evaluator:".concat(actionEvaluator.evaluationStrategy, "+picker:").concat(actionPicker.pickStrategy);
        }
        this.team = team;
        this.actionEvaluator = actionEvaluator;
        this.actionPicker = actionPicker;
    }
    ConcretePlayer.prototype.pickMove = function (battleInfo, request) {
        var initialEvaluation = makeInitialActionEvaluation(battleInfo, request);
        var evaluations = this.actionEvaluator.evaluateMoves(battleInfo, initialEvaluation);
        if (evaluations.length === 0) {
            // console.log("ff")
        }
        var action = this.actionPicker.pickMove(evaluations);
        return action;
    };
    return ConcretePlayer;
}());
function makeRandomPlayer() {
    var team = Teams.generate(FORMAT);
    var player = new ConcretePlayer("random", team, new IdentityEvaluator(), new RandomPicker());
    return player;
}
function makeStandardPlayer() {
    var team = Teams.generate(FORMAT);
    var evaluator = new PipelineEvaluator([new MovePowerEvaluator(),
        new BoostMoveEvaluator(), new SwapOnWeakOffenceDefenceEvaluator, new SwapDiscourageEvaluator()], "standard");
    var player = new ConcretePlayer("standard", team, evaluator, new SoftmaxPicker());
    return player;
}
// function makeLatestDeepPlayer(): Player{
//     let network = new brain.NeuralNetwork();
//
//     const networkState = JSON.parse(fs.readFileSync("network_state.json", "utf-8"));
//     network.fromJSON(networkState);
//     return null
// }
function makePlayer(randomPlayerChance) {
    return null;
}
export { makeRandomPlayer, makeStandardPlayer, makePlayer };
