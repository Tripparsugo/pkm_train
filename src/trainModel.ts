import {Arena} from "./pokarena/PokeArena";
import {getLatestModelOrCreateNew, makeLatestDeepPlayer, makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
// @ts-ignore
import {Dex, Pokemon} from "pokemon-showdown";
import {BattleInfo, BattleRecord, PokemonSet} from "./pokarena/pt";
import {convertToCSV, saveLatestModel} from "./pokarena/utils";
import * as fs from "fs";
import {vectorizeBattleInfo} from "./pokarena/vectorization";
import * as tf from "@tensorflow/tfjs-node"
import * as _ from "lodash"
import {op} from "@tensorflow/tfjs";
import * as math from 'mathjs'


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
        //TODO using maxReward; now it's in [-1,1]
        reward /= maxReward
        // reward = (reward * 0.95) + (won ? 0.05 : -0.05)
        //in [0,1]
        // reward = (reward) / 2
        //
        reward *= 2
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
    for (let p of players) {
        p.setTurnCallback(record)
    }


    function record(activePlayer, battleInfo, evaluations, playerAction) {
        const player = activePlayer
        const v = vectorizeBattleInfo(battleInfo, true).map(x => x.toFixed(2))
        const s = battleInfoToTurnState(battleInfo)
        // const tmp = _.cloneDeep(battleInfo)
        turnResults.push({player, v, s, evaluations, playerAction, battleId})
    }


    const battleResults = await new Arena(p1, p2, false).doBattle()

    for (const p of players) {
        const pWon = battleResults.winner === p
        const pTurnResults = turnResults.filter(tr => tr.player === p)
        const pStates = pTurnResults.map(r => r.s)
        const pRewards = computeRewards2(pStates, pWon)
        for (let i = 0; i < pTurnResults.length; i++) {
            pTurnResults[i].reward = pRewards[i]
        }
    }
    return {battleResults, turnResults}
}

async function doBattles(p1, p2, n) {
    let rs = []
    for (let i = 0; i < n; i++) {
        try {
            rs.push(await doBattle(p1, p2, i))
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
const RUNS = 1
const BATTLES = 10

const PLAYER_GEN_MAP = {
    "deepTrain": async () => await makeLatestDeepPlayer(true),
    "deepPlay": async () => await makeLatestDeepPlayer(false),
    "random": async () => await makeRandomPlayer((a, b, c) => null),
    "standard": async () => await makeStandardPlayer(),
}

async function train(model: tf.LayersModel, turnResults) {
    const data = []
    for(let tr of turnResults){
        const x = tr.v
        const y = tr.evaluations.slice(0,10).map(e=> e.evaluatio)
        const battleId = tr.battleId
        data.push({x, y, battleId})
    }
    const trainValidationIdSplit = Math.floor(BATTLES * 0.9)
    const trainData = data.filter(d => d.battleId <= trainValidationIdSplit)
    const validationData = data.filter(d => d.battleId > trainValidationIdSplit)
    const xsTrain = trainData.flatMap(d => d.x)
    const ysTrain = trainData.flatMap(d => d.y)
    const xsValidate = validationData.flatMap(d => d.x)
    const ysValidate = validationData.flatMap(d => d.y)
    const yMean = math.mean(ysTrain)
    const yStd = math.std(ysTrain)
    model.compile({optimizer: "sgd", loss: tf.losses.absoluteDifference})
    const inputL = vectorizeBattleInfo(null, false).length
    await model.fit(tf.tensor(xsTrain, [trainData.length, inputL]), tf.tensor(ysTrain, [trainData.length, 9]),
        {
            callbacks: tf.callbacks.earlyStopping({
                patience: 10,
                monitor: "val_loss"
            }),
            validationData: [
                tf.tensor(xsValidate, [validationData.length, inputL]),
                tf.tensor(ysValidate, [validationData.length, 1])
            ],
            epochs: 500,
            batchSize: 32
        }
    )
    // @ts-ignore
    const a = model.predict(tf.tensor(xsValidate, [validationData.length, inputL])).dataSync()
    const b = 0
}


async function run() {
    const model = await getLatestModelOrCreateNew()
    const p1 = await PLAYER_GEN_MAP[p1Gen]()
    const p2 = await PLAYER_GEN_MAP[p2Gen]()
    const results = await doBattles(p1, p2, BATTLES)
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


export {
    doBattles
}
