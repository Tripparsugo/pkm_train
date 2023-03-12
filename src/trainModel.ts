import {Arena} from "./pokarena/PokeArena";
import {getLatestModelOrCreateNew, makeLatestDeepPlayer, makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
// @ts-ignore
import {Dex, Pokemon} from "pokemon-showdown";
import {BattleInfo, BattleRecord, PokemonSet} from "./pokarena/pt";
import {convertToCSV, saveLatestModel} from "./pokarena/utils";
import * as fs from "fs";
import {vectorizeTurnInfo} from "./pokarena/vectorization";
import * as tf from "@tensorflow/tfjs-node"
import * as _ from "lodash"
import {op} from "@tensorflow/tfjs";


Dex.includeFormats()
Dex.includeMods()
const format = Dex.formats.get("gen8randombattle")
Dex.forFormat(format)

function toTeamData(team: any, won: boolean, strategy: string) {
    const ds = []
    for (const p of team) {
        const d = {}
        d["species"] = p.species
        d["item"] = p.item
        d["ability"] = p.ability
        const types = Dex.species.get(p.species).types
        d["type1"] = types[0]
        d["type2"] = types[1]
        const moves = p.moves
        for (let i = 0; i < moves.length; i++) {
            d[`move${i + 1}`] = moves[i]
        }
        d["won"] = won
        d["strategy"] = strategy
        ds.push(d)
    }
    return ds
}

// function computeReward(pokemonLeft, otherPokemonLeft, won) {
//     if (won) {
//         return 0.5 + 0.5 * pokemonLeft / 6
//     }
//     return 0.5 * Math.exp(-otherPokemonLeft + 1)
// }

function computeRewards2(playerTurns: any[], won): number[] {
    const EVALUATION_WINDOW_SIZE = 7
    const ALPHA = 0.7
    const rewards = []

    let maxReward = 0
    for (let i = 0; i < EVALUATION_WINDOW_SIZE - 1; i++) {
        maxReward += Math.pow(ALPHA, i)
    }

    for (let i = 0; i < playerTurns.length; i++) {
        const evaluationWindow = playerTurns.slice(i, i + EVALUATION_WINDOW_SIZE)
        let reward = 0
        for (let j = 0; j < EVALUATION_WINDOW_SIZE - 1; j++) {
            const tmp = computeAdjacentStateDiff(evaluationWindow[j], evaluationWindow[j + 1], won) * Math.pow(ALPHA, j)
            reward += tmp
        }
        reward /= maxReward
        reward = (reward * 0.95) + (won ? 0.05 : -0.05)
        rewards.push(reward)
    }

    return rewards
}


function computeStateValue(s) {
    let ownTotalPercentage = 0
    for (const p of s.ownPokemonStates) {
        ownTotalPercentage += p.hpPercentage
    }
    let otherTotalPercentage = 0
    for (const p of s.otherPokemonStates) {
        otherTotalPercentage += p.hpPercentage
    }

    const stateValue = (ownTotalPercentage - otherTotalPercentage) / 6
    return stateValue

}

function computeAdjacentStateDiff(s1, s2, won: boolean) {
    if (!s2) {
        if (!s1) {
            return 0
        }
        return won ? 1 : -1
    }
    const [s1v, s2v] = [computeStateValue(s1), computeStateValue(s2)]
    const v = (s2v - s1v) * 6
    return v

}


function battleInfoToTurnState(battleInfo: BattleInfo) {
    const ownPokemonStates = battleInfo.playerSide.map(p => {
        return {hpPercentage: p.hp / p.maxhp}
    })
    const otherPokemonStates = battleInfo.opponentSide.map(p => {
        return {
            hpPercentage: p.hpPercentage
        }
    })
    for (let i = otherPokemonStates.length; i < 6; i++) {
        otherPokemonStates.push(
            {hpPercentage: 1}
        )
    }

    return {ownPokemonStates, otherPokemonStates}

}

async function doBattle(p1, p2, battleId) {
    const turnResults = []
    const players = [p1, p2]

    function record(activePlayer, battleInfo, request, playerAction) {
        const player = activePlayer
        const v = vectorizeTurnInfo(battleInfo, playerAction, true).map(x => x.toFixed(2))
        const s = battleInfoToTurnState(battleInfo)
        // const tmp = _.cloneDeep(battleInfo)
        turnResults.push({player, v, s})
    }

    const battleResults = await new Arena(p1, p2, record, false).doBattle()

    for (const tr of turnResults) {
        // const won = battleResults.winner === tr.player
        // const [ownLeft, otherLeft] = won ? [battleResults.winnerLeftNum, battleResults.loserLeftNum]
        //     : [battleResults.loserLeftNum, battleResults.winnerLeftNum]
        tr.battleId = battleId
        // tr.reward = computeReward(ownLeft, otherLeft, won)
    }

    for (const p of players) {
        const pWon = battleResults.winner === p
        const pTurnResults = turnResults.filter(tr => tr.player === p)
        const pStates = pTurnResults.map(r => r.s)
        const pRewards = computeRewards2(pStates, pWon)
        for (let i = 0; i < pTurnResults.length; i++) {
            pTurnResults[i].r = pRewards[i]
        }
    }
    return {battleResults, turnResults}
}

async function doBattles(p1gen, p2gen, n) {
    let rs = []
    for (let i = 0; i < n; i++) {
        try {
            rs.push(await doBattle(await p1gen(), await p2gen(), i))
            if (i % 10 === 0) {
                console.log(`${i}/${n}`)
            }
        } catch (e) {
            //TODO fix potentiall stopping conditions
            console.log(e)
        }
    }
    return rs
}

async function handleBattlesEnd(rs: any, model) {
    let ds = []
    let ts = []

    for (let r of rs) {
        const {battleResults, turnResults} = r
        const winnerPlayer = battleResults.winner
        const loserPlayer = battleResults.winner === battleResults.player1 ? battleResults.player2 : battleResults.player1
        const d = [...toTeamData(winnerPlayer.team, true, winnerPlayer.strategy),
            ...toTeamData(loserPlayer.team, false, loserPlayer.strategy)]
        // const t = turnResults.map(x => {
        //     return {reward: x.reward, v: x.v.join(" ")}
        // })
        // ts = ts.concat(t)
        ds = ds.concat(d)
    }

    const csvData = convertToCSV(ds)
    fs.writeFileSync('./tmp/tmp.csv', csvData);
    // const csvData2 = convertToCSV(ts)
    // fs.writeFileSync('./tmp/ts.csv', csvData2);

    return {ts, ds}

}

const TRAIN = false
const p1Gen = "deepTrain"
const p2Gen = "deepTrain"
const RUNS = 10
const BATTLES = 300

const PLAYER_GEN_MAP = {
    "deepTrain": async () => await makeLatestDeepPlayer(true),
    "deepPlay": async () => await makeLatestDeepPlayer(false),
    "random": async () => await makeRandomPlayer(),
    "standard": async () => await makeStandardPlayer(),
}

async function train(model: tf.LayersModel, turnResults) {
    const trainValidationIdSplit = Math.floor(BATTLES * 0.9)
    const trainData = turnResults.filter(t => t.battleId <= trainValidationIdSplit)
    const validationData = turnResults.filter(t => t.battleId > trainValidationIdSplit)
    const xsTrain = trainData.flatMap(t => t.v).map(t => Number.parseFloat(t))
    const ysTrain = trainData.map(t => Number.parseFloat(t.reward))
    const xsValidate = validationData.flatMap(t => t.v).map(t => Number.parseFloat(t))
    const ysValidate = validationData.map(t => Number.parseFloat(t.reward))
    model.compile({optimizer: "sgd", loss: 'meanSquaredError'})
    const inputL = vectorizeTurnInfo(null, null, false).length
    await model.fit(tf.tensor(xsTrain, [trainData.length, inputL]), tf.tensor(ysTrain, [trainData.length, 1]),
        {
            callbacks: tf.callbacks.earlyStopping({
                patience: 5,
                monitor: "val_loss"
            }),
            validationData: [
                tf.tensor(xsValidate, [validationData.length, inputL]),
                tf.tensor(ysValidate, [validationData.length, 1])
            ],
            epochs: 200,
            batchSize: 32
        }
    )
}


async function run() {
    const model = await getLatestModelOrCreateNew()
    const p1gen = await PLAYER_GEN_MAP[p1Gen]
    const p2gen = await PLAYER_GEN_MAP[p2Gen]
    const results = await doBattles(p1gen, p2gen, BATTLES)
    await handleBattlesEnd(results, model)
    const ts = results.flatMap(r => r.turnResults)
    if (TRAIN) {
        console.log("training...")
        await train(model, ts)
        await saveLatestModel(model)
    }
}


// const  t = vectorizeTurnInfo(null,null, false)
// const i = 0
async function doRuns() {
    for (let i = 0; i < RUNS; i++) {
        console.log(`RUN: ${i + 1}/${RUNS}`)
        await run()
    }
}


console.time("battles_time");
doRuns().then(
    _ => {
        console.timeEnd("battles_time")
    }
)


