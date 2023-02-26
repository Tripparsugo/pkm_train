import {ActionEvaluator, OpponentPokemonInfo, Player, PokemonInfo, StreamPlayer} from "./pt";
import {Teams, Dex} from "pokemon-showdown";

function buildAIAveraging(ai1: ActionEvaluator, ai2: ActionEvaluator, ai_w1: number): ActionEvaluator {
    return null
}

function buildAIPipeline(ais: ActionEvaluator[]): ActionEvaluator {
    return null
}


function playerToStreamPlayer(player: Player): StreamPlayer {
    return {
        "name": player.id,
        "id": player.id,
        "team": Teams.pack(player.team)
    }
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function computeMoveAveragePower(activeMoveDex, activePokemonTypes: string[], opponentActivePokemonTypes: string[]): number {


    const effToMultiplier = new Map();
    effToMultiplier.set(-2, 0.25)
    effToMultiplier.set(-1, 0.5)
    effToMultiplier.set(0, 1)
    effToMultiplier.set(1, 2)
    effToMultiplier.set(2, 4)
    const moveType = activeMoveDex.type
    if (!Dex.getImmunity(moveType, opponentActivePokemonTypes)) {
        return 0
    }
    const movePower = activeMoveDex.basePower
    const isStab = activePokemonTypes.includes(moveType)
    const eff = Dex.getEffectiveness(moveType, opponentActivePokemonTypes)
    const moveAccuracy = activeMoveDex.accuracy
    let multiplier = effToMultiplier.get(eff)
    if (isStab) {
        multiplier = multiplier * 1.5
    }
    const actualMovePower = multiplier * movePower
    const actualAverageMovePower = actualMovePower * moveAccuracy / 100

    return actualAverageMovePower
}

// from https://gist.github.com/cyphunk/6c255fa05dd30e69f438a930faeb53fe
function softmax(logits) {
    const maxLogit = logits.reduce((a, b) => Math.max(a, b), -Infinity);
    const scores = logits.map((l) => Math.exp(l - maxLogit));
    const denom = scores.reduce((a, b) => a + b);
    return scores.map((s) => s / denom);
}

export {playerToStreamPlayer, timeout, computeMoveAveragePower, softmax}

