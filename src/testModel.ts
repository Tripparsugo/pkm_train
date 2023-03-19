import {doBattles} from "./pokarena/battle";
import {convertToCSV, getSortedModelLocs} from "./pokarena/utils";
import {makeDeepPlayer, makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
import * as fs from "fs";

async function run() {
    const BATTLES = 100
    const modelLocs = getSortedModelLocs()
    const modelN = modelLocs.length
    const opponents = [makeStandardPlayer, makeRandomPlayer]
    const data = []

    for (let i = 0; i < modelN; i += 10) {
        console.log(`ROUND ${i}/${modelN}`)
        const modelLoc = modelLocs[i]
        const deepPlayerGen = () => makeDeepPlayer(modelLoc)
        for (const opponentGen of opponents) {
            const wr = await computeWR(deepPlayerGen, opponentGen, BATTLES)
            const d = {wr, deepLv: i, vs: opponentGen().strategy}
            data.push(d)
        }
    }
    showData(data)
    const csvData = convertToCSV(data)
    fs.writeFileSync('./tmp/deepWR.csv', csvData);

}

//
async function computeWR(deepPlayerGen, opponentGen, battles: number) {
    const rs = await doBattles(deepPlayerGen, opponentGen, battles)
    const endedBattles = rs.length
    const deepWins = rs.filter(r => r.battleResults.winner.strategy === "deep").length
    const wr = deepWins / endedBattles
    return wr
}

//
function showData(data: { wr: number, deepLv: number, vs: string }[]) {
    const toPrint = data.map(d => `LV:${d.deepLv} WR:${d.wr} vs:${d.vs}`).join("\n")
    console.log(toPrint)
}

console.time("battles_time");
run().then(_ => console.timeEnd("battles_time"))
