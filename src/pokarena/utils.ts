import {ActionEvaluator, BattleInfo, MoveType, OpponentPokemonInfo, Player, PokemonInfo, StreamPlayer} from "./pt";
import {Teams, Dex, Pokemon} from "pokemon-showdown";
import * as tf from "@tensorflow/tfjs-node"
import {readdirSync} from 'fs'
import * as path from "path"
import {vectorizeBattleInfo} from "./vectorization";

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


function oneHotEncode(categories, values,): number[] {
    categories.sort()
    return categories.map(c => values.includes(c) ? 1 : 0)
}


function convertToCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr)

    return array.map(it => {
        return Object.values(it).toString()
    }).join('\n')
}


function normalizeName(name) {
    return name.toLowerCase().replaceAll(/[’:.\-% ]/ig, "")
}


function getNewModel(): tf.LayersModel {
    const model = tf.sequential();
    const optimizer = tf.train.sgd(0.0005)
    const inputL = vectorizeBattleInfo(undefined,  false).length
    model.add(tf.layers.dense({activation: "relu", units: 200, inputShape: [inputL]}));
    model.add(tf.layers.dense({activation: "softsign", units: 9}));
// Prepare the model for training: Specify the loss and the optimizer.
    model.compile({loss: 'meanSquaredError', optimizer: optimizer});
    return model
}


let model_cache = null

async function getLatestModelOrCreateNew(): Promise<tf.LayersModel> {
    if (model_cache) {
        return model_cache
    }
    const modelsDir = path.resolve("./mod")
    const dirNames = readdirSync(modelsDir, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => `${modelsDir}/${dirent.name}`)

    if (dirNames.length === 0) {
        const newModel = getNewModel()
        const modelDir = `file://${modelsDir}/0`
        await newModel.save(modelDir)
        model_cache = newModel
        return newModel
    }

    const sortedDirNames = dirNames.sort((a, b) =>
        Number.parseInt(a.split("/").slice(-1)[0]) - Number.parseInt(b.split("/").slice(-1)[0]))
    const latestDirName = sortedDirNames[sortedDirNames.length - 1]

    const latestModel = await tf.loadLayersModel(`file://${latestDirName}/model.json`)
    model_cache = latestModel
    return latestModel
}


function getSortedModelLocs(): string[] {
    const modelsDir = path.resolve("./mod")
    const dirNames = readdirSync(modelsDir, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => `${modelsDir}/${dirent.name}`)

    const sortedDirNames = dirNames.sort((a, b) =>
        Number.parseInt(a.split("/").slice(-1)[0]) - Number.parseInt(b.split("/").slice(-1)[0]))

    return sortedDirNames
}


async function loadModel(modelLoc: string): Promise<tf.LayersModel> {
    const latestModel = await tf.loadLayersModel(`file://${modelLoc}/model.json`)
    return latestModel
}

async function saveLatestModel(model: tf.LayersModel) {
    const modelsDir = path.resolve("./mod")
    const dirNames = readdirSync(modelsDir, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => `${modelsDir}/${dirent.name}`)
    const nextDirNum = dirNames.length
    const nextDirName = `file://${modelsDir}/${nextDirNum}`
    await model.save(nextDirName)
    model_cache = null

}


function modelEvalToActionEval(battleInfo: BattleInfo, ps: any[]) {
    let i = 0
    const activePokemonMoves = battleInfo.playerSide[0].moves
    const evaluations = []

    while (i < 4) {
        const m = activePokemonMoves[i]
        const e = ps[i]
        if (m) {
            evaluations.push(
                {
                    playerAction: {type: MoveType.ATTACK, moveTarget: m},
                    evaluation: e,
                    // modelIdx: i
                }
            )
        }
        i++
    }

    const benchedPokemons: Pokemon[] = battleInfo.playerSide.slice(1, 6)

    while (i < 9) {
        const poke = benchedPokemons[i - 4]
        const e = ps[i]
        evaluations.push(
            {
                playerAction: {type: MoveType.SWAP, swapTarget: poke.species.id},
                evaluation: e,
                // modelIdx: i
            }
        )
        i++
    }

    return evaluations
}

export {
    playerToStreamPlayer,
    timeout,
    computeMoveAveragePower,
    softmax,
    convertToCSV,
    oneHotEncode,
    normalizeName,
    getLatestModelOrCreateNew,
    saveLatestModel,
    getSortedModelLocs,
    loadModel,
    modelEvalToActionEval
}

