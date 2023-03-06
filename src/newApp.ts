import {Arena} from "./pokarena/PokeArena";
import {getLatestModelOrCreateNew, makeLatestDeepPlayer, makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
// @ts-ignore
import {Dex, Pokemon} from "pokemon-showdown";
import {BattleRecord, PokemonSet} from "./pokarena/pt";
import {convertToCSV, saveLatestModel} from "./pokarena/utils";
import * as fs from "fs";
import {vectorizeTurnInfo} from "./pokarena/vectorization";
import * as tf from "@tensorflow/tfjs-node"
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

function computeReward(pokemonLeft, otherPokemonLeft, won) {
    if (won) {
        return 0.5 + 0.5 * pokemonLeft / 6
    }
    return 0.5 * Math.exp(-otherPokemonLeft + 1)
}

async function doBattle(p1, p2) {
    const turnResults = []

    function recordVectorization(activePlayer, battleInfo, request, playerAction) {
        const player = activePlayer
        const v = vectorizeTurnInfo(battleInfo, playerAction, true).map(x => x.toFixed(2))
        turnResults.push({player, v})
    }

    const battleResults = await new Arena(p1, p2, recordVectorization, false).doBattle()

    for (const tr of turnResults) {
        const won = battleResults.winner === tr.player
        const [ownLeft, otherLeft] = won ? [battleResults.winnerLeftNum, battleResults.loserLeftNum]
            : [battleResults.loserLeftNum, battleResults.winnerLeftNum]
        tr.reward = computeReward(ownLeft, otherLeft, won)
    }
    return {battleResults, turnResults}
}

async function doBattles(p1, p2, n) {
    let rs = []
    for (let i = 0; i < n; i++) {
        try {
            rs.push(await doBattle(p1, p2))
            if (i % 50 === 0) {
                console.log(`${i}/${n}`)
            }
        } catch (e) {
            //TODO
            // console.log(e)
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
        const t = turnResults.map(x => {
            return {reward: x.reward, v: x.v.join(" ")}
        })
        ts = ts.concat(t)
        ds = ds.concat(d)
    }

    const csvData = convertToCSV(ds)
    fs.writeFileSync('./tmp/tmp.csv', csvData);
    const csvData2 = convertToCSV(ts)
    fs.writeFileSync('./tmp/ts.csv', csvData2);

    return {ts, ds}

}

async function train(model: tf.LayersModel, turnResults) {
    const xs = turnResults.flatMap(t => t.v).map(t => Number.parseFloat(t))
    const ys = turnResults.map(t => Number.parseFloat(t.reward))
    model.compile({optimizer: "sgd", loss: 'meanSquaredError'})
    await model.fit(tf.tensor(xs, [turnResults.length, 2868]), tf.tensor(ys, [turnResults.length, 1]),
        {
            epochs: 100,
            batchSize: 32
        }
    )
}

const TRAIN = true

async function run() {
    const BATTLES = 100
    const model = await getLatestModelOrCreateNew()
    const p1 = await makeLatestDeepPlayer(true)
    const p2 = await makeLatestDeepPlayer(true)
    const results = await doBattles(p1, p2, BATTLES)
    await handleBattlesEnd(results, model)
    const ts = results.flatMap(r => r.turnResults)
    if (TRAIN) {
        console.log("training...")
        await train(model, ts)
    }
    await saveLatestModel(model)
}

const RUNS = 20

async function doRuns() {
    for (let i = 0; i < RUNS; i++) {
        await run()
    }
}

console.time("battles_time");
doRuns().then(
    _ => {
        console.timeEnd("battles_time")
    }
)


