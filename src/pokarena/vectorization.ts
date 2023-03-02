import {BattleInfo, MoveType, PlayerAction} from "./pt";
import {normalizeName, oneHotEncode} from "./utils";
import {DataMove} from "pokemon-showdown/.sim-dist/dex-moves";
import {Dex} from "pokemon-showdown";

function vectorizeTurnInfo(battleInfo: BattleInfo, playerAction: PlayerAction): number[] {
    let v = []
    for (let i = 0; i < 6; i++) {
        const p = battleInfo.playerSide[i]
        const v1 = vectorizePlayerPokemon(p, playerAction, !!p)
        v = v.concat(v1)
    }


    for (let i = 0; i < 6; i++) {
        const p = battleInfo.opponentSide[i]
        const v2 = vectorizeOpponentPokemon(p, !!p)
        v = v.concat(v2)
    }

    // console.log("@@@@@@@@" + v.length)


    return v
}

const POKEMON_TYPES = [
    "normal",
    "fire",
    "water",
    "grass",
    "electric",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dark",
    "dragon",
    "steel",
    "fairy"
]

const POKEMON_ABILITIES = [
    "intimidate",
    "wonderguard",
    "speedboost",
    "protean",
    "multiscale",
    "levitate",
    "magicguard"
]

const MOVE_CATEGORIES = [
    "physical",
    "special",
    "status"
]

const ITEMS = [
    "choicescarf",
    "choiceband",
    "leftovers",
    "lifeorb",
    "baloon",
    "heavydutyboots",
    "focussash"
]

const BOOST_TARGETS = ["atk", "spa", "def", "def", "spd", "spe"]
const STATS = ["hp", ...BOOST_TARGETS]


function vectorizeOpponentPokemon(pokemon: any, valid) {
    if (!valid) {
        const size = 2 + POKEMON_TYPES.length + STATS.length + vectorizeDexMove(undefined, false).length*6
        // console.log(size)
        return new Array(size).fill(0)
    }
    const statEncoding = []
    for (const s of STATS) {
        statEncoding.push(pokemon.species.baseStats[s] / 255)
    }
    const typesEncoding = oneHotEncode(POKEMON_TYPES, pokemon.species.types)
    const hpPercentage = pokemon.hpPercentage
    let moves = []
    for (let i = 0; i < 6; i++) {
        const move = pokemon?.potentialMoves[i]
        const vMove = vectorizeDexMove(move, !!move)
        moves = moves.concat(vMove)
        // console.log("@@@@@@@@" + vMove.length)
    }


    const encoding = [
        ...statEncoding,
        ...typesEncoding,
        ...moves,
        pokemon.isActive ? 1 : 0,
        hpPercentage
    ]
    return encoding


}

function vectorizePlayerPokemon(pokemon: any, playerAction: PlayerAction, valid) {
    if (!valid) {
        const size = 5 + POKEMON_TYPES.length + ITEMS.length + POKEMON_TYPES.length + vectorizePlayerMove(undefined, playerAction, false).length * 4
        const v = new Array(size).fill(0)
        return v
    }
    // TODO make sure this is correct
    const isSelectedSwap = playerAction.type === MoveType.SWAP && playerAction.swapTarget === pokemon.species.id
    const ability = normalizeName(pokemon.ability)
    const abilityEncoding = oneHotEncode(POKEMON_ABILITIES, [ability])
    const item = normalizeName(pokemon.item)
    const itemEncoding = oneHotEncode(ITEMS, [item])
    const types = pokemon.types.map(normalizeName)
    const typesEncoding = oneHotEncode(POKEMON_TYPES, types)
    const boostsEncoding = []
    for (const t of BOOST_TARGETS) {
        boostsEncoding.push(pokemon.boosts[t] / 6)
    }
    const statEncoding = []
    for (const s of STATS) {
        statEncoding.push(pokemon.baseStoredStats[s] / 255)
    }
    const hp = pokemon.hp / 714
    const maxhp = pokemon.maxhp / 714
    let movesEncoding = []
    // const pokemon.moves
    for (let i = 0; i < 4; i++) {
        const slot = pokemon.moveSlots[i]
        movesEncoding = movesEncoding.concat(vectorizePlayerMove(slot, playerAction, !!slot))
    }


    const ret = [
        valid ? 1 : 0,
        isSelectedSwap? 1: 0,
        pokemon.isActive ? 1 : 0,
        hp,
        maxhp,
        ...abilityEncoding,
        ...itemEncoding,
        ...typesEncoding,
        ...movesEncoding
    ]

    // console.log("@@@@ " + abilityEncoding.length)
    // console.log("@@@ " + itemEncoding.length)
    // console.log("@@ " + typesEncoding.length)
    // console.log("@ " + movesEncoding.length)
    // console.log("@ " + ret.length)
    return ret
}

function vectorizePlayerMove(move, playerAction: PlayerAction, valid) {
    if (!valid) {
        const size = 7 + vectorizeDexMove(undefined, false).length
        return new Array(size).fill(0)
    }
    const isSelectedMove = playerAction.type === MoveType.ATTACK && playerAction.moveTarget === move.id
    const pp = move.pp / 40
    const maxpp = move.maxpp / 40
    const disabled = move.disabled ? 1 : 0
    const used = move.used ? 1 : 0
    const dexMove: DataMove = Dex.getActiveMove(move.id)
    const vDexMove = vectorizeDexMove(dexMove, valid)
    // console.log(vDexMove.length)
    return [
        isSelectedMove? 1:0,
        valid ? 1 : 0,
        pp,
        maxpp,
        disabled,
        used,
        ...vDexMove
    ]
}


function vectorizeDexMove(dexMove: any, valid: boolean): number[] {
    if (!valid) {
        const size = 7 + 5 + BOOST_TARGETS.length + POKEMON_TYPES.length + MOVE_CATEGORIES.length
        return new Array(size).fill(0)
    }
    const accuracy = (dexMove.accuracy === true ? 100 : dexMove.accuracy) / 100 //can be true for 100%
    const basePower = dexMove.basePower / 250
    const priority = dexMove.priority
    const priorityEncoding = [0, 0, 0, 0, 0]
    priorityEncoding[priority] = 1
    const type = dexMove.type.toLowerCase()
    const typeEncoding = oneHotEncode(POKEMON_TYPES, [type])
    const category = dexMove.category.toLowerCase()
    const categoryEncoding = oneHotEncode(MOVE_CATEGORIES, [category])
    const useTargetOffensive = dexMove.useTargetOffensive ? 1 : 0
    const ignoreImmunity = dexMove.ignoreImmunity ? 1 : 0
    const ignoreDefensive = dexMove.ignoreDefensive ? 1 : 0
    const volatileStatus = dexMove.volatileStatus ? 1 : 0 //protect
    const boosts = dexMove.boosts ?? {} // {atk:,spa:,def:,spd:,spe:}
    const boostEncoding = []

    for (const t of BOOST_TARGETS) {
        boostEncoding.push(boosts[t] ? boosts[t] / 3 : 0)
    }
    const target = dexMove.target === "self" ? 1 : 0 // self|normal

    const encoding = [
        accuracy,
        basePower,
        ...boostEncoding,
        ...priorityEncoding,
        ...typeEncoding,
        ...categoryEncoding,
        useTargetOffensive,
        ignoreDefensive,
        ignoreImmunity,
        volatileStatus,
        target
    ]
    // console.log("@" + priorityEncoding.length)
    return encoding
}


export {vectorizeTurnInfo}