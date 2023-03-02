import { softmax } from "./utils";
var SoftmaxPicker = /** @class */ (function () {
    function SoftmaxPicker() {
        this.pickStrategy = "softmax";
    }
    SoftmaxPicker.prototype.pickMove = function (moveEvaluations) {
        var evaluations = moveEvaluations.map(function (e) { return e.evaluation; });
        var sm = softmax(evaluations);
        var tmp = 0;
        var r = Math.random();
        var i = 0;
        while (tmp <= r && i < evaluations.length) {
            tmp += sm[i];
            i++;
        }
        return moveEvaluations[i - 1].playerAction;
    };
    return SoftmaxPicker;
}());
var RandomPicker = /** @class */ (function () {
    function RandomPicker() {
        this.pickStrategy = "random";
    }
    RandomPicker.prototype.pickMove = function (moveEvaluations) {
        var i = Math.floor(Math.random() * moveEvaluations.length);
        //TypeError: Cannot read properties of undefined (reading 'playerAction') TODO
        if (!moveEvaluations[i]) {
            // console.log("")
        }
        return moveEvaluations[i].playerAction;
    };
    return RandomPicker;
}());
export { RandomPicker, SoftmaxPicker };
