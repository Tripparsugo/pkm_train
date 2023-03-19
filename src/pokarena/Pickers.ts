import {ActionEvaluation, ActionPicker, PlayerAction} from "./pt";
import {softmax} from "./utils";




class SoftmaxPicker implements ActionPicker {
    readonly pickStrategy: string = "softmax";

    pickMove(moveEvaluations: ActionEvaluation[]): PlayerAction {
        const availableEvaluations = moveEvaluations.filter(e=> e.available)
        const evaluations = availableEvaluations.map(e => e.evaluation)
        const sm = softmax(evaluations)
        let tmp = 0
        const r = Math.random()
        let i = 0
        while (tmp <= r && i < evaluations.length) {
            tmp += sm[i]
            i++
        }
        return availableEvaluations[i - 1].playerAction;
    }


}


class RandomPicker implements ActionPicker {
    readonly pickStrategy: string = "random";

    pickMove(moveEvaluations: ActionEvaluation[]): PlayerAction {
        const availableEvaluations = moveEvaluations.filter(e=> e.available)
        const i = Math.floor(Math.random() * availableEvaluations.length)
        //TypeError: Cannot read properties of undefined (reading 'playerAction') TODO
        return availableEvaluations[i].playerAction
    }


}

class BestPicker implements ActionPicker {
    readonly pickStrategy: string = "best";

    pickMove(moveEvaluations: ActionEvaluation[]): PlayerAction {
        const availableEvaluations = moveEvaluations.filter(e=> e.available)
        let max = Number.NEGATIVE_INFINITY
        let bestAction = null
        for (const me of availableEvaluations) {
            if (me.evaluation > max) {
                max = me.evaluation
                bestAction = me.playerAction
            }
        }
        return bestAction
    }

}


export {
    RandomPicker, SoftmaxPicker, ActionPicker, BestPicker
}
