import {Dex, Pokemon} from "pokemon-showdown";
import { Move } from "pokemon-showdown/.sim-dist/dex-moves";
import {PokemonSet} from "pokemon-showdown/.sim-dist/teams";
import Species = Dex.Species;

interface Arena {

}

type ActionEvaluation = {playerAction: PlayerAction, evaluation: number, readonly available: boolean}

type PlayerAction = { readonly type: MoveType, moveTarget?: string , swapTarget?: string}

type StreamPlayer = { name: string, id: string, team: string }

type BattleInfo = {
    playerSide: PokemonInfo[],
    opponentSide: OpponentPokemonInfo[],
    battleHistory: any,
    playerFieldConditions: string[],
    enemyFieldConditions: string[],
    weather:string
}

interface ActionEvaluator {
    evaluateMoves(battleInfo: BattleInfo, initialEvaluations: ActionEvaluation[]): ActionEvaluation[]

    readonly evaluationStrategy: string
}

interface ActionPicker {
    pickMove(moveEvaluations: ActionEvaluation[]): PlayerAction
    readonly pickStrategy: string
}

interface Player {
    id: string
    readonly team: PokemonSet[]
    pickMove(battleInfo: BattleInfo, forceSwitch: boolean): PlayerAction
    readonly strategy: string,
}

interface BattleRecord {
    //no winner when draw
    readonly winner?: Player
    readonly winnerLeftNum: number
    readonly loserLeftNum: number
    readonly player1: Player
    readonly player2: Player
    readonly turns: any
}


// type MoveType = "attack" | "swap"

enum MoveType {
    ATTACK,
    SWAP
}


interface PokemonInfo extends Pokemon {
}


interface OpponentPokemonInfo {
    species: Species,
    hpPercentage: number,
    potentialMoves: OpponentMove[],
    status,
    boosts,
    isActive: boolean
}

interface OpponentMove extends Move{
    moveSlot?: any
}


export {
    Arena, ActionEvaluator, Player, BattleRecord, StreamPlayer,
    PokemonInfo, ActionEvaluation, PlayerAction, ActionPicker, MoveType, PokemonSet, BattleInfo, OpponentMove, OpponentPokemonInfo
}
