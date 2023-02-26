import {ActionEvaluation, ActionPicker, PlayerAction} from "./pt";
import {softmax} from "./utils";

class SoftmaxPicker implements ActionPicker {
    readonly pickStrategy: string = "softmax";
    pickMove(moveEvaluations: ActionEvaluation[]): PlayerAction {
        const evaluations = moveEvaluations.map(e=> e.evaluation)
        const sm = softmax(evaluations)
        let tmp = 0
        const r = Math.random()
        let i = 0
        while (tmp <= r && i < evaluations.length){
            tmp  += sm[i]
            i++
        }
        return moveEvaluations[i-1].playerAction;
    }


}


class RandomPicker implements ActionPicker {
    readonly pickStrategy: string = "random";
    pickMove(moveEvaluations: ActionEvaluation[]): PlayerAction {
        const i = Math.floor(Math.random() * moveEvaluations.length)
        return moveEvaluations[i].playerAction
    }


}


export {
    RandomPicker, SoftmaxPicker, ActionPicker
}