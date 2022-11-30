const pkm = require("pokemon-showdown");
const fs = require('fs');


pkm.Dex.includeFormats()
pkm.Dex.includeMods()


const format = pkm.Dex.formats.get("gen6randombattle")
pkm.Dex.forFormat(format)


// console.log(team1)
async function doBattle() {
    const team1 = pkm.Teams.generate(format)
    const team2 = pkm.Teams.generate(format)
    const p1 = {name: "Alice", team: pkm.Teams.pack(team1), id: "p1"}
    const p2 = {name: "Bob", team: pkm.Teams.pack(team2), id: "p2"}
    const stream = new pkm.BattleStream();

    const res = (async () => {
        for await (const output of stream) {


            for (let tmp of output.split("\n")) {
                if (tmp.startsWith("|win|")) {
                    const winnerName = tmp.substring("|win|".length + 1)
                    const [winnerTeam, loserTeam] = winnerName === "Alice" ?
                        [pkm.Teams.unpack(p1.team), pkm.Teams.unpack(p2.team)] :
                        [pkm.Teams.unpack(p2.team), pkm.Teams.unpack(p1.team)]
                    const result = [winnerTeam, loserTeam]
                    return result
                }

                if (tmp.startsWith("|request|")) {
                    const request = JSON.parse(tmp.substring("|request".length + 1))
                    const playerId = request.side.id;
                    if (request.wait) {
                        continue
                    }
                    if (request.forceSwitch) {
                        for (let i = 0; i < request.side.pokemon.length; i++) {
                            let p = request.side.pokemon[i]
                            if (!p.active) {
                                const command = `>${playerId} switch ${i + 1}`
                                stream.write(command);
                                // console.log(`@@@@ ${command}`)
                            }
                        }
                        continue
                    }
                    const activeMoves = request.active[0].moves;
                    for (let i = 0; i < activeMoves.length; i++) {
                        let move = activeMoves[i]
                        if (move.pp > 0 && !move.disabled) {

                            const command = `>${playerId} move ${i + 1}`
                            stream.write(command);
                            // console.log(`@@@@ ${command}`)
                            break
                        }
                    }
                }
            }
        }
    })()


    // const result = (async () => {
    //     for await (const output of stream) {
    //         // console.log(output)
    //     }
    // })();


    const formatInput = {formatid: "${format.id}"}
    stream.write(`>start ${JSON.stringify(formatInput)}`);
    stream.write(`>player ${p1.id} ${JSON.stringify(p1)}`);
    stream.write(`>player ${p2.id} ${JSON.stringify(p2)}`);
    await res
    return res
}

function convertToCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr)

    return array.map(it => {
        return Object.values(it).toString()
    }).join('\n')
}


function toTeamData(team, won) {
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
        ds.push(d)
    }
    return ds
}


async function doBattles(n) {
    let ds = []
    for (let i = 0; i < n; i++) {
        const b = await doBattle()
        console.log(`${i + 1}/${n}`)
        if (!b) {
            continue
        }
        const [winnerTeam, loserTeam] = b;
        const d = [...toTeamData(winnerTeam, true), ...toTeamData(loserTeam, false)]
        ds = ds.concat(d)
    }
    return ds
}

// (async () => {
//     try {
//         const p = await doBattles(100);
//         const content = convertToCSV(p);
//     } catch (e) {
//         console.error(e);
//
//     }
// })();

const p = doBattles(100)
p.then(r => {
    const content = convertToCSV(r)
    try {
        fs.writeFileSync('./data.csv', content);
    } catch (err) {
        console.error(err);
    }
    console.log("Done")
    console.log(p)
})


// console.log("@1:    "+ stream.battle.requestState)
// console.log("@2:    "+ new Array(...stream.battle.hints).join(' '))
// stream.write(`>p1 move 1`)
// stream.write(`>p2 move 1`)
// console.log("@2:    "+ new Array(...stream.battle.hints).join(' '))
// stream.write(`>p1 move 2`)
// stream.write(`>p2 move 2`)
// stream.write(`>p1 move 1`)
// stream.write(`>p2 move 1`)
// stream.write(`>p1 move 2`)
// stream.write(`>p2 move 2`)
