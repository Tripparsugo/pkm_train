import {Arena} from "./pokarena/PokeArena";
import {makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
// @ts-ignore
import {Dex, Pokemon} from "pokemon-showdown";
import {BattleRecord, PokemonSet} from "./pokarena/pt";
import {convertToCSV} from "./pokarena/utils";
import * as fs from "fs";


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

async function doBattle() {
    const p1 = makeRandomPlayer()
    const p2 = makeStandardPlayer()
    const result = new Arena(p1, p2, false).doBattle()
    return result
}

async function doBattles(n): Promise<BattleRecord[]> {
    let rs = []
    for (let i = 0; i < n; i++) {
        try {
            rs.push(await doBattle())
        } catch (e) {
            // console.log("")
        }
    }
    return rs
}

function handleBattlesEnd(rs: BattleRecord[]) {
    let ds = []
    for (let r of rs) {
        const winnerPlayer = r.winner
        const loserPlayer = r.winner === r.player1 ? r.player2 : r.player1
        const d = [...toTeamData(winnerPlayer.team, true, winnerPlayer.strategy),
            ...toTeamData(loserPlayer.team, false, loserPlayer.strategy)]
        ds = ds.concat(d)
    }

    const csvData = convertToCSV(ds)
    fs.writeFileSync('./tmp.csv', csvData);

}

console.time("battles_time");
doBattles(100).then(rs => {
        handleBattlesEnd(rs)
        console.timeEnd("battles_time")
    }
)

