import {Arena} from "./pokarena/PokeArena";
import {makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
// @ts-ignore
import {Dex, Pokemon} from "pokemon-showdown";
import {BattleRecord, PokemonSet} from "./pokarena/pt";
import {convertToCSV} from "./pokarena/utils";
import * as fs from "fs";
import {vectorizeTurnInfo} from "./pokarena/vectorization";


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
        return 0.5 + 0.5 * pokemonLeft/6
    }
    return  0.5 * Math.exp(-otherPokemonLeft + 1)
}

async function doBattle() {
    const p1 = makeRandomPlayer()
    const p2 = makeStandardPlayer()

    const turnResults = []

    function recordVectorization(activePlayer, battleInfo, request,  playerAction) {
        const player = activePlayer
        const v = vectorizeTurnInfo(battleInfo, playerAction).map(x=>x.toFixed(2))
        turnResults.push({player, v})
    }

    const battleResults = await new Arena(p1, p2, recordVectorization, false).doBattle()

    for (const tr of turnResults) {
        const won = battleResults.winner === tr.player
        const [ownLeft, otherLeft] = won? [battleResults.winnerLeftNum, battleResults.loserLeftNum]
            :[battleResults.loserLeftNum, battleResults.winnerLeftNum]
        tr.reward = computeReward(ownLeft, otherLeft, won)
    }

    return {battleResults, turnResults}
}

async function doBattles(n): Promise<BattleRecord[]> {
    let rs = []
    for (let i = 0; i < n; i++) {
        try {
            rs.push(await doBattle())
            if(i%50===0){
                console.log(`${i}/${n}`)
            }
        } catch (e) {
            //TODO
            // console.log(e)
        }
    }
    return rs
}

function handleBattlesEnd(rs: any) {
    let ds = []
    let ts = []

    for (let r of rs) {
        const {battleResults, turnResults} = r
        const winnerPlayer = battleResults.winner
        const loserPlayer = battleResults.winner === battleResults.player1 ? battleResults.player2 : battleResults.player1
        const d = [...toTeamData(winnerPlayer.team, true, winnerPlayer.strategy),
            ...toTeamData(loserPlayer.team, false, loserPlayer.strategy)]
        const t = turnResults.map(x => {
            return {reward: x.reward, v:x.v.join(" ")}
        })
        ts = ts.concat(t)
        ds = ds.concat(d)
    }

    const csvData = convertToCSV(ds)
    fs.writeFileSync('./tmp/tmp.csv', csvData);
    const csvData2 = convertToCSV(ts)
    fs.writeFileSync('./tmp/ts.csv', csvData2);

}

const BATTLES = 1000
console.time("battles_time");
doBattles(BATTLES).then(rs => {

        handleBattlesEnd(rs)
        console.timeEnd("battles_time")
    }
)

