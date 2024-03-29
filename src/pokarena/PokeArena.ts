import {BattleInfo, BattleRecord, MoveType, OpponentMove, Player, PlayerAction, PokemonInfo} from "./pt";
// TODO
// @ts-ignore
import {BattleStream, Dex, Pokemon} from 'pokemon-showdown'
import {normalizeName, oneHotEncode, playerToStreamPlayer, timeout} from "./utils";
import {re} from "mathjs";

Dex.includeFormats()
Dex.includeMods()


class Arena {
    private readonly player1: Player;
    private readonly player2: Player;
    private readonly stream: BattleStream;
    private hasFinished: boolean;
    private readonly log: boolean;
    private battleRecord: BattleRecord;
    readonly battleLog: string[];
    private requestCount


    constructor(player1: Player, player2: Player, log: boolean) {
        this.battleLog = []
        this.player1 = player1;
        this.player1.id = "p1"
        this.player2 = player2;
        this.player2.id = "p2"
        this.stream = new BattleStream();
        this.hasFinished = false;
        this.log = log
        this.requestCount = 0
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
        const playerSide = this.stream.battle.sides[0].id === activePlayerId ? this.stream.battle.sides[0] : this.stream.battle.sides[1]
        const otherSide = this.stream.battle.sides[1].id === activePlayerId ? this.stream.battle.sides[0] : this.stream.battle.sides[1]
        const playerTeam = playerSide.pokemon
        const otherTeam = otherSide.pokemon

        const playerFieldConditions  = Object.keys(playerSide.sideConditions)
        const enemyFieldConditions  = Object.keys(otherSide.sideConditions)
        const battleHistory = null
        const opponentSide = []
        const weather = this.stream.battle.field.weather

        for (const p of otherTeam) {
            //never seen pkm
            if (p.activeTurns === 0 && !p.isActive && !p.previouslySwitchedIn && (p.hp === p.maxhp)) {
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
            playerSide: playerTeam,
            battleHistory,
            opponentSide,
            playerFieldConditions,
            enemyFieldConditions,
            weather

        }
    }

    private playerActionToStreamCommand(playerAction: PlayerAction, request: any): string {
        const playerId = request.side.id;
        let i;
        let command;
        switch (playerAction.type) {
            case MoveType.ATTACK:
                i = 0
                const activeMoves = request.active[0].moves
                while (true) {
                    if (activeMoves[i].id === playerAction.moveTarget) {
                        break
                    }
                    i++
                }
                //command idx starts at 1
                command = `>${playerId} move ${i + 1}`
                break
            case MoveType.SWAP:
                i = 0
                const playerSide = request.side.pokemon
                while (true) {
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
        this.requestCount += 1
        if (this.requestCount > 400) {
            throw new Error("Could not finish battle")
        }
        const request = JSON.parse(s.substring("|request".length + 1))
        if (request.wait) {
            return
        }
        const playerId = request.side.id;
        const activePlayer = this.player1.id === playerId ? this.player1 : this.player2
        const battleInfo = this.getBattleInfo(request)
        const playerAction = activePlayer.pickMove(battleInfo, request)

        if(!request.side){
            const h = 1
        }
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

        const winnerteamStatus = this.stream.battle.sides[0].id === winnerPlayer.id ? this.stream.battle.sides[0].pokemon : this.stream.battle.sides[1].pokemon
        const loserteamStatus = this.stream.battle.sides[0].id === winnerPlayer.id ? this.stream.battle.sides[1].pokemon : this.stream.battle.sides[0].pokemon
        const battleRecord: BattleRecord = {
            winner: winnerPlayer,
            player1: this.player1,
            player2: this.player2,
            winnerLeftNum: winnerteamStatus.filter(p => p.hp > 0).length,
            loserLeftNum: loserteamStatus.filter(p => p.hp > 0).length,
            turns: undefined
        }
        this.battleRecord = battleRecord

    }

    private async doTurn(streamOut: string): Promise<void> {
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
