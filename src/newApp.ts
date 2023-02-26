import {Arena} from "./pokarena/PokeArena";
import {makeRandomPlayer, makeStandardPlayer} from "./pokarena/Player";
// @ts-ignore
import { Dex } from "pokemon-showdown";


Dex.includeFormats()
Dex.includeMods()
const format = Dex.formats.get("gen8randombattle")
Dex.forFormat(format)

async function doBattle(){
    const p1 = makeRandomPlayer()
    const p2 = makeStandardPlayer()
    const result = new Arena(p1, p2, true).doBattle()
}


doBattle().then(result => {
    console.log(result)
})