const pkm = require("pokemon-showdown");
const fs = require('fs');
pkm.Dex.includeFormats()

pkm.Dex.includeMods()

const format = pkm.Dex.formats.get("gen6randombattle")
pkm.Dex.forFormat(format)

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSeed() {
    return [
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
        Math.floor(Math.random() * 0x10000),
    ]
}

function shuffle(originalArray) {
    let array = [].concat(originalArray);
    let currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function pickIfOnlyOption(activeP, ownTeam, otherActiveP, request) {
    const activeMoves = activeP.moves;
    if (activeMoves.length === 1) {
        return {"type": "attack", "value": (0)}
    }
    return null
}


function powerUpIfAtHighHp(activeP, ownTeam, otherActiveP, request){
    //TODO replace activeP
    activeP = ownTeam.filter(p=>p.isActive)[0]
    const boosts = activeP.boosts
    for(let stat in boosts){
        if(boosts[stat]>0){
            return null
        }
    }
    const boostingMovesIds = ["sworddance", "shellsmash", "dragondance", "geomancy", "nastyplot", "calmmind", "quiverdance", "cosmicpower"]
    const leftHp= parseInt(activeP.getHealth().shared.split("/")[0])
    if(leftHp<80){
        return null
    }
    const activeMovesDex = activeP.baseMoveSlots.map(m=> pkm.Dex.getActiveMove(m.id))
    for(let i=0 ;i< activeMovesDex.length; i++){
        const ac = activeMovesDex[i]
        if(ac.pp === 0 || activeP.baseMoveSlots[i].disabled){
            continue
        }

        if(boostingMovesIds.includes(ac.id)){
            return {"type": "attack", "value": (i+1)}

        }
    }
    return null
}

function swapIfNoEffectiveMoves(activeP, ownTeam, otherActiveP, request){
    activeP = ownTeam.filter(p=>p.isActive)[0]
    otherActiveP = otherActiveP[0]

    if(activeP.trapped){
        return null
    }
    const MIN_POW = 40
    const powers = activeP.moveSlots.map(m=>computeMoveAveragePower(pkm.Dex.getActiveMove(m.id), activeP, otherActiveP))
    if(powers.filter(p=>p>MIN_POW).length>0){
        return null
    }

    let best_pow = 0
    let best_idx = -1
    for(let i=0; i < ownTeam.length; i++){
        const p = ownTeam[i]
        if(p.isActive){
            continue
        }

        const leftHp= parseInt(p.getHealth().shared.split("/")[0])
        if(leftHp<70){
            continue
        }
        const powers = p.moveSlots.map(m=>computeMoveAveragePower(pkm.Dex.getActiveMove(m.id), activeP, otherActiveP))
        const hp = powers.sort((a,b)=>b-a)[0]
        if(hp > best_pow && hp > MIN_POW){
            best_pow = hp
            best_idx = i
        }

    }
    if(best_idx === -1){
        return null
    }

    if(best_pow <= MIN_POW*2){
        return null
    }

    return {"type": "swap", "value": (best_idx+1)}
}

function pickRandomMove(activeP, ownTeam, otherActiveP, request) {
    const activeMoves = activeP.moves;
    if (activeMoves.length === 1) {
        return {"type": "attack", "value": (0)}
    }
    const activeMovesIdx = shuffle([...Array(activeMoves.length).keys()])
    for (let i of activeMovesIdx) {
        let move = activeMoves[i]
        if (move.pp > 0 && !move.disabled) {
            return {"type": "attack", "value": (i + 1)}
        }
    }

    throw new Error("nm")
}

function computeMoveAveragePower(activeMoveDex, activePokemon, otherActivePokemon){
    const effToMultiplier = new Map();
    effToMultiplier.set(-2, 0.25)
    effToMultiplier.set(-1, 0.5)
    effToMultiplier.set(0, 1)
    effToMultiplier.set(1, 2)
    effToMultiplier.set(2, 4)
    const activeTypes = activePokemon.baseSpecies.types
    const moveType = activeMoveDex.type
    const movePower = activeMoveDex.basePower
    const isStab = activeTypes.includes(moveType)
    const eff = pkm.Dex.getEffectiveness(moveType, otherActivePokemon.baseSpecies.types)
    const moveAccuracy = activeMoveDex.accuracy
    let multiplier = effToMultiplier.get(eff)
    if(isStab){
        multiplier = multiplier * 1.5
    }
    const actualMovePower = multiplier * movePower
    const actualAverageMovePower = actualMovePower * moveAccuracy/100
    return actualAverageMovePower
}

function pickEffectiveMove(activeP, ownTeam, otherActiveP, request) {
    const activeMoves = activeP.moves;
    let bestPower = 0
    let bestIdx = -1

    for (let i = 0; i < activeMoves.length; i++) {
        const activeMove = activeMoves[i]
        const activeMoveDex = pkm.Dex.getActiveMove(activeMove.id)
        if (activeMove.pp === 0 || activeMove.disabled) {
            continue
        }
        if (activeMoveDex.category === "status") {
            continue
        }

        if (activeMoveDex.basePower === 0){
            continue
        }

        if (!pkm.Dex.getImmunity(activeMoveDex.type, otherActiveP[0].baseSpecies.types)) {
            continue
        }


        const actualAverageMovePower = computeMoveAveragePower(activeMoveDex, ownTeam.filter(p=>p.isActive)[0], otherActiveP[0])
        if (actualAverageMovePower > bestPower) {
            bestIdx = i
            bestPower = actualAverageMovePower
        }
    }
    if (bestIdx > -1) {
        return {"type": "attack", "value": (bestIdx + 1)}
    }

    return null
}

function makeStrategyHandler(strategies, fallbackStrategy, strategyName) {
    function inF(activeP, ownTeam, otherActiveP, request) {
        for (let strategy of strategies) {
            const move = strategy(activeP, ownTeam, otherActiveP, request)
            if (move) {
                return move
            }
        }
        return fallbackStrategy(activeP, ownTeam, otherActiveP, request)
    }

    return {strategyHandler: inF, strategyName}

}


async function doBattle(log=false) {
    const team1 = pkm.Teams.generate(format)
    const team2 = pkm.Teams.generate(format)
    const p1 = {
        name: "Alice",
        team: pkm.Teams.pack(team1),
        id: "p1",
        strategy: makeStrategyHandler([powerUpIfAtHighHp, pickEffectiveMove], pickRandomMove, "best")
    }
    const p2 = {
        name: "Bob",
        team: pkm.Teams.pack(team2),
        id: "p2",
        strategy: makeStrategyHandler([], pickRandomMove, "random")
    }
    const players = [p1,p2]
    const stream = new pkm.BattleStream();
    const formatInput = {formatid: "${format.id}"}
    stream.write(`>start ${JSON.stringify(formatInput)}`);
    stream.write(`>player ${p1.id} ${JSON.stringify(p1)}`);
    stream.write(`>player ${p2.id} ${JSON.stringify(p2)}`);
    // console.log("@@1")
    for await (const output of stream) {
        if (stream.buf.length === 0) {
            // console.log("@@4")
            await timeout(10)
            // console.log("@@5")
            if (stream.buf.length === 0) {
                return null
                // console.log("@@6")
            }
        }
        // console.log("@@2")
        if(log) {
            // console.log(output)
        }
        for (let tmp of output.split("\n")) {
            if (tmp.startsWith("|error|")) {
                throw new Error("Did not finish battle")
            }

            if (tmp.startsWith("|win|")) {
                const winnerName = tmp.substring("|win|".length)
                const winnerPlayer = players.filter(p => p.name === winnerName)[0]
                if(log){
                    console.log(winnerName + " won")
                }
                const loserPlayer = players.filter(p => p.name !== winnerName)[0]
                const winnerTeam = pkm.Teams.unpack(winnerPlayer.team)
                const loserTeam = pkm.Teams.unpack(loserPlayer.team)
                const winnerStrategy = winnerPlayer.strategy.strategyName
                const loserStrategy = loserPlayer.strategy.strategyName
                const result = [winnerTeam, loserTeam, winnerStrategy, loserStrategy]
                return result
            }
            if (tmp.startsWith("|request|")) {
                const request = JSON.parse(tmp.substring("|request".length + 1))
                const playerId = request.side.id;
                const player = players.filter( p=>p.id===playerId)[0]

                if (request.wait) {
                    continue
                }
                if (request.forceSwitch) {
                    for (let i = 0; i < request.side.pokemon.length; i++) {
                        let p = request.side.pokemon[i]
                        if (!p.active && p.condition !== "0 fnt") {
                            const command = `>${playerId} switch ${i + 1}`
                            if(log) {
                                console.log(command)
                            }
                            stream.write(command);
                            break
                        }
                    }
                    continue
                }
                const activeP = request.active[0]
                const otherActiveP = stream.battle.sides[0].id === playerId ? stream.battle.sides[1].active : stream.battle.sides[0].active
                const ownTeam = stream.battle.sides[0].id === playerId ? stream.battle.sides[0].pokemon : stream.battle.sides[1].pokemon
                const {strategyHandler, strategyName} = player.strategy

                const move = strategyHandler(activeP, ownTeam, otherActiveP, request)

                if (move.type === "switch"){
                    const command = `>${playerId} switch ${move.value}`
                }

                if (move.type === "attack") {
                    const command = `>${playerId} move ${move.value}`
                    stream.write(command);
                    if(log) {
                        const availableMoves = activeP.moves.filter(m=>m.pp>0 && m.disabled === false).map(m=>m.move)
                        console.log("active pkm: " + request.side.pokemon.filter(p=>p.active)[0].details)
                        console.log("available moves: " + availableMoves)
                        console.log("opposing pkmn: " + otherActiveP)
                        console.log("picked move: " + availableMoves[move.value -1])

                        console.log(command)
                    }
                } else if (move.type === "swap"){
                    const command = `>${playerId} switch ${move.value}`
                    if(log) {
                        console.log(command)
                    }
                    stream.write(command);
                } else {
                    throw new Error("Unknown action")
                }
            }
        }
        // console.log("@@3")
    }

    throw new Error("Did not finish battle")
}


function convertToCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr)

    return array.map(it => {
        return Object.values(it).toString()
    }).join('\n')
}


function toTeamData(team, won, strategy) {
    const ds = []
    for (const p of team) {
        const d = {}
        d["species"] = p.species
        d["item"] = p.item
        d["ability"] = p.ability
        const types = pkm.Dex.species.get(d.species).types
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

const LOG = false
async function doBattles(n) {
    let ds = []
    for (let i = 0; i < n; i++) {
        console.log(`BATTLE: #${i + 1}/${n}`)
        const b = await doBattle(LOG)
        if (!b) {
            continue
        }
        const [winnerTeam, loserTeam, winnerStrategyName, loserStrategyName] = b;
        const d = [...toTeamData(winnerTeam, true, winnerStrategyName), ...toTeamData(loserTeam, false, loserStrategyName)]
        ds = ds.concat(d)
    }
    return ds
}


doBattles(500).then(r => {
    const content = convertToCSV(r)
    try {
        fs.writeFileSync('./data.csv', content);
    } catch (err) {
        console.error("here" + err);
    }
    console.log("Done")
})


