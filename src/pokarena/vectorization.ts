import {BattleInfo, MoveType, PlayerAction} from "./pt";
import {normalizeName, oneHotEncode} from "./utils";
import {DataMove} from "pokemon-showdown/.sim-dist/dex-moves";
import {Dex} from "pokemon-showdown";


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

const POKEMON_STATUSES = [
    "fnt",
    "tox",
    "slp",
    "par",
    "brn",
    "frz",
    "psn"
]

const POKEMON_ABILITIES = [
    "intimidate",
    "wonderguard",
    "speedboost",
    "protean",
    "multiscale",
    "levitate",
    "magicguard",
    "prankster"
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

const WEATHER_STATUSES = [
    "sandstorm",
    "sunnyday",
    "raindance"
]

const UNIQUE_MOVES = [
    "stealthrock",
    "rapidspin",
    "defog",
    "roost",
    "rest",
    "toxicspikes",
    "toxic",
    "thunderwave"
]

const FIELD_CONDITIONS = [
    "stealthrock"
]

const BOOST_TARGETS = ["atk", "spa", "def", "def", "spd", "spe"]
const STATS = ["hp", ...BOOST_TARGETS]

function vectorizeTurnInfo(battleInfo: BattleInfo, playerAction: PlayerAction, valid: boolean): number[] {
    if (!valid) {
        const size = FIELD_CONDITIONS.length * 2 + WEATHER_STATUSES.length
            + vectorizePlayerPokemon(null, null, false).length
            + vectorizePlayerPokemonShort(null, null, false).length * 5
            + vectorizeOpponentPokemon(null, false).length
            + vectorizeOpponentPokemonShort(null, false).length * 5
        return new Array(size).fill(0)
    }
    const weatherEncoding = oneHotEncode(WEATHER_STATUSES, battleInfo.weather)
    const allyFieldEncoding = oneHotEncode(FIELD_CONDITIONS, battleInfo.playerFieldConditions[0] ?? "")
    const enemyFieldEncoding = oneHotEncode(FIELD_CONDITIONS, battleInfo.enemyFieldConditions[0] ?? "")

    let encoding = [
        ...weatherEncoding,
        ...allyFieldEncoding,
        ...enemyFieldEncoding
    ]

    for (let i = 0; i < 6; i++) {
        const p = battleInfo.playerSide[i]
        const v1 = i == 0 ? vectorizePlayerPokemon(p, playerAction, !!p) : vectorizePlayerPokemonShort(p, playerAction, !!p)
        encoding = encoding.concat(v1)
    }


    for (let i = 0; i < 6; i++) {
        const p = battleInfo.opponentSide[i]
        const v2 = i == 0 ? vectorizeOpponentPokemon(p, !!p) : vectorizeOpponentPokemonShort(p, !!p)
        encoding = encoding.concat(v2)
    }

    // console.log("@@@@@@@@" + v.length)

    return encoding
}


//skips vectorization of moves
function vectorizeOpponentPokemonShort(pokemon: any, valid) {
    if (!valid) {
        const size = 2 + POKEMON_TYPES.length + STATS.length + POKEMON_STATUSES.length
        // console.log(size)
        return new Array(size).fill(0)
    }

    const statEncoding = []
    for (const s of STATS) {
        statEncoding.push(pokemon.species.baseStats[s] / 255)
    }
    const typesEncoding = oneHotEncode(POKEMON_TYPES, pokemon.species.types)
    const hpPercentage = pokemon.hpPercentage
    const statusEncoding = oneHotEncode(POKEMON_STATUSES, pokemon.status)
    const encoding = [
        ...statusEncoding,
        ...statEncoding,
        ...typesEncoding,
        pokemon.isActive ? 1 : 0,
        hpPercentage
    ]
    return encoding
}

function vectorizeOpponentPokemon(pokemon: any, valid) {
    if (!valid) {
        const size = vectorizeOpponentPokemonShort(pokemon, valid).length + vectorizeDexMove(undefined, false).length * 6
        return new Array(size).fill(0)
    }
    const shortEnconding = vectorizeOpponentPokemonShort(pokemon, valid)
    let moves = []
    for (let i = 0; i < 6; i++) {
        const move = pokemon?.potentialMoves[i]
        const vMove = vectorizeDexMove(move, !!move)
        moves = moves.concat(vMove)
        // console.log("@@@@@@@@" + vMove.length)
    }


    const encoding = [
        ...shortEnconding,
        ...moves,
    ]
    return encoding


}


function vectorizePlayerPokemonShort(pokemon: any, playerAction: PlayerAction, valid) {
    if (!valid) {
        const size = 5 + POKEMON_STATUSES.length + POKEMON_ABILITIES.length + ITEMS.length + POKEMON_TYPES.length
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
    const statusEncoding = oneHotEncode(POKEMON_STATUSES, pokemon.status)
    const hp = pokemon.hp / 714
    const maxhp = pokemon.maxhp / 714

    //TODO add status
    const ret = [
        valid ? 1 : 0,
        isSelectedSwap ? 1 : 0,
        pokemon.isActive ? 1 : 0,
        hp,
        maxhp,
        ...statusEncoding,
        ...abilityEncoding,
        ...itemEncoding,
        ...typesEncoding
    ]
    return ret

}

function vectorizePlayerPokemon(pokemon: any, playerAction: PlayerAction, valid) {
    if (!valid) {
        const size = vectorizePlayerPokemonShort(undefined, undefined, false).length
            + vectorizePlayerMove(undefined, playerAction, false).length * 4
        const v = new Array(size).fill(0)
        return v
    }
    const shortEncoding = vectorizePlayerPokemonShort(pokemon, playerAction, valid)
    let movesEncoding = []
    // const pokemon.moves
    for (let i = 0; i < 4; i++) {
        const slot = pokemon.moveSlots[i]
        movesEncoding = movesEncoding.concat(vectorizePlayerMove(slot, playerAction, !!slot))
    }

    const ret = [
        ...shortEncoding,
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
        const size = 6 + vectorizeDexMove(undefined, false).length
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
        isSelectedMove ? 1 : 0,
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
        const size = 8 + 5 + BOOST_TARGETS.length + POKEMON_TYPES.length + MOVE_CATEGORIES.length + UNIQUE_MOVES.length
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
    const uniqueEncoding = oneHotEncode(UNIQUE_MOVES, [dexMove.id])

    for (const t of BOOST_TARGETS) {
        boostEncoding.push(boosts[t] ? boosts[t] / 3 : 0)
    }
    const target = dexMove.target === "self" ? 1 : 0 // self|normal
    //TODO add valid
    const encoding = [
        valid ? 1 : 0,
        accuracy,
        basePower,
        ...uniqueEncoding,
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