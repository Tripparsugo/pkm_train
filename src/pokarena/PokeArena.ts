import {BattleInfo, BattleRecord, MoveType, OpponentMove, Player, PlayerAction, PokemonInfo} from "./pt";
// import * as fs from "fs";
// TODO
// @ts-ignore
import {BattleStream, Dex, Pokemon} from 'pokemon-showdown'
import {normalizeName, oneHotEncode, playerToStreamPlayer, timeout} from "./utils";
import Move = Dex.Move;
import {DataMove} from "pokemon-showdown/.sim-dist/dex-moves";

Dex.includeFormats()
Dex.includeMods()

function vectorizeTurnInfo(player: Player, battleInfo: BattleInfo, playerAction: PlayerAction, request: any): void {
    const a = Dex

    return null


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

const BOOST_TARGETS = ["atk", "spa", "def", "def", "spd", "spe"]

function vectorizePlayerPokemon(pokemon: Pokemon) {

}

function vectorizePlayerMove(move, valid) {
    if (!valid) {
        const size = 6
        return new Array(size).fill(0).concat(vectorizeDexMove(undefined, false))
    }
    const pp = move.pp / 40
    const maxpp = move.maxpp / 40
    const disabled = move.disabled ? 1 : 0
    const used = move.used ? 1 : 0
    const dexMove: DataMove = Dex.getActiveMove(move.id)
    const vDexMove = vectorizeDexMove(dexMove, valid)
    return [
        valid ? 1 : 0,
        pp,
        maxpp,
        disabled,
        used,
        dexMove,
        ...vDexMove
    ]
}


function vectorizeDexMove(dexMove: any, valid: boolean): number[] {
    if (!valid) {
        const size = 7 + 4 + BOOST_TARGETS.length + POKEMON_TYPES.length + MOVE_CATEGORIES.length
        return new Array(size).fill(0)
    }
    const accuracy = (dexMove.accuracy === true ? 100 : dexMove.accuracy) / 100 //can be true for 100%
    const basePower = dexMove.basePower / 250
    const priority = dexMove.priority
    const priorityEncoding = [0, 0, 0, 0]
    priorityEncoding[priority] = 1
    const type = dexMove.type.toLowerCase()
    const typeEncoding = oneHotEncode(POKEMON_TYPES, [type])
    const category = dexMove.category.toLowerCase()
    const categoryEncoding = oneHotEncode(MOVE_CATEGORIES, [category])
    const useTargetOffensive = dexMove.useTargetOffensive ? 1 : 0
    const ignoreImmunity = dexMove.ignoreImmunity ? 1 : 0
    const ignoreDefensive = dexMove.ignoreDefensive ? 1 : 0
    const volatileStatus = dexMove.volatileStatus ? 1 : 0 //protect
    const boosts = dexMove.boosts // {atk:,spa:,def:,spd:,spe:}
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
    return encoding
}


class Arena {
    private readonly player1: Player;
    private readonly player2: Player;
    private readonly stream: BattleStream;
    private hasFinished: boolean;
    private readonly log: boolean;
    private battleRecord: BattleRecord;
    readonly battleLog: string[];


    constructor(player1: Player, player2: Player, log: boolean) {
        this.battleLog = []
        this.player1 = player1;
        this.player1.id = "p1"
        this.player2 = player2;
        this.player2.id = "p2"
        this.stream = new BattleStream();
        this.hasFinished = false;
        this.log = log
    }

    async doBattle(): Promise<BattleRecord> {
        this._initBattle()
        for await (const output of this.stream) {
            await this.doTurn(output)
        }


        return this.battleRecord
    }


    private handleError(s) {
        throw new Error("Did not finish battle")
    }


    private getBattleInfo(request: any): BattleInfo {
        const activePlayerId = request.side.id;
        // const activePkm = request.active[0]
        // const otherActivePkm = this.stream.battle.sides[1].id === activePlayerId ? this.stream.battle.sides[0].active : this.stream.battle.sides[1].active
        const playerSide = this.stream.battle.sides[0].id === activePlayerId ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon
        const otherTeam = this.stream.battle.sides[1].id === activePlayerId ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon

        const battleHistory = null
        const opponentSide = []

        for (const p of otherTeam) {
            //never seen pkm
            if (p.activeTurns === 0 && !p.isActive) {
                continue
            }
            const species = p.species
            if (!species.randomBattleMoves) {
                // console.log("")
            }
            const potentialMoves = species?.randomBattleMoves?.map(m => Dex.getActiveMove(m)) ?? []
            const knownMoveSlots = p.moveSlots.filter(ms => ms.used)
            for (const pm of potentialMoves) {
                const tmp = knownMoveSlots.filter(ms => ms.id === pm.id)
                let moveSlot = null
                if (tmp.length > 0) {
                    moveSlot = tmp[0]
                }
                pm.moveSlot = moveSlot

            }
            const hpPercentage = p.hp / p.maxhp
            const status = p.status
            const boosts = p.boosts
            const isActive = p.isActive
            opponentSide.push({
                    species,
                    potentialMoves,
                    hpPercentage,
                    status,
                    boosts,
                    isActive
                }
            )
        }
        return {
            playerSide,
            battleHistory,
            opponentSide
        }
    }

    //TODO fix
    private playerActionToStreamCommand(playerAction: PlayerAction, request: any): string {
        const playerId = request.side.id;
        let i;
        let command;
        switch (playerAction.type) {
            case MoveType.ATTACK:
                i = 0
                const activeMoves = request.active[0].moves
                while (true) {
                    // if(!activeMoves[i]){
                    //     console.log("@" + activeMoves)
                    // }
                    //TODO
                    if (activeMoves[i].id === playerAction.moveTarget) {
                        break
                    }
                    i++
                }
                //command idx starts at 1
                //TODO
                command = `>${playerId} move ${i + 1}`
                break
            case MoveType.SWAP:
                i = 0
                const playerSide = request.side.pokemon
                while (true) {

                    // if(i === playerSide.length){
                    //     console.log("hh")
                    // }
                    // const a = Dex.getName(playerSide[i].ident.split(" ")[1])
                    const pName = normalizeName(playerSide[i].details.split(",")[0])

                    if (pName === playerAction.swapTarget) {
                        break
                    }

                    i++
                }
                command = `>${playerId} switch ${i + 1}`
                break

            default:
                throw new Error("Unknown action")
        }

        if (this.log) {
            // const availableMoves = request.active[0].moves.filter(m => m.pp > 0 && m.disabled === false).map(m => m.move)
            // const otherActivePkm =
            // console.log("active pkm: " + request.side.)
            // console.log("available moves: " + availableMoves)
            // console.log("opposing pkmn: " + otherActivePkm)
            // console.log("picked move: " + availableMoves[move.value - 1])
            // console.log(command)
        }
        this.battleLog.push(command)
        return command

    }

    private handleRequest(s) {
        const request = JSON.parse(s.substring("|request".length + 1))
        if (request.wait) {
            return
        }
        const playerId = request.side.id;
        const activePlayer = this.player1.id === playerId ? this.player1 : this.player2
        const battleInfo = this.getBattleInfo(request)
        const playerAction = activePlayer.pickMove(battleInfo, request)
        vectorizeTurnInfo(activePlayer, battleInfo, playerAction, request)
        //TODO vectorize
        const command = this.playerActionToStreamCommand(playerAction, request)
        this.stream.write(command);

    }

    private handleWin(s) {
        const winnerName = s.substring("|win|".length)
        const [winnerPlayer, loserPlayer]: Player[] = this.player1.id === winnerName ?
            [this.player1, this.player2] : [this.player2, this.player1]
        if (this.log) {
            console.log(winnerName + " won")
        }
        const winnerTeam = winnerPlayer.team
        const loserTeam = loserPlayer.team
        const player1teamStatus = this.stream.battle.sides[0].id === this.player1.id ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon
        const player2teamStatus = this.stream.battle.sides[0].id === this.player2.id ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon
        const battleRecord: BattleRecord = {
            winner: winnerPlayer,
            player1: this.player1,
            player2: this.player2,
            player1LeftNum: player1teamStatus.filter(p => p.hp > 0).length,
            player2LeftNum: player2teamStatus.filter(p => p.hp > 0).length,
            turns: undefined
        }
        this.battleRecord = battleRecord

    }

    private async doTurn(streamOut: string): Promise<void> {
        // if (this.stream.buf.length === 0) {
        //     await timeout(30)
        //     if (this.stream.buf.length === 0) {
        //         throw new Error("Could not finish match due to buffer timeout :/")
        //     }
        // }

        // if (this.log) {
        //     console.log(streamOut)
        // }
        this.battleLog.push(streamOut)
        for (let tmp of streamOut.split("\n")) {
            if (tmp.startsWith("|error|")) {
                this.handleError(tmp)
            }
            if (tmp.startsWith("|win|")) {
                this.handleWin(tmp)
            }

            if (tmp.startsWith("|request|")) {
                this.handleRequest(tmp)
            }
        }
    }


    _initBattle(): void {
        const formatInput = {formatid: "${format.id}"}
        this.stream.write(`>start ${JSON.stringify(formatInput)}`);
        this.stream.write(`>player ${this.player1.id} ${JSON.stringify(playerToStreamPlayer(this.player1))}`);
        this.stream.write(`>player ${this.player2.id} ${JSON.stringify(playerToStreamPlayer(this.player2))}`);
    }


}

export {Arena}