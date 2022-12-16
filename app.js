const pkm = require("pokemon-showdown");
const fs = require('fs');
pkm.Dex.includeFormats()

pkm.Dex.includeMods()

const format = pkm.Dex.formats.get("gen6randombattle")
pkm.Dex.forFormat(format)

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function shuffle(originalArray) {
    let array = [].concat(originalArray);
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

async function doBattle() {
    const team1 = pkm.Teams.generate(format)
    const team2 = pkm.Teams.generate(format)
    const p1 = {name: "Alice", team: pkm.Teams.pack(team1), id: "p1"}
    const p2 = {name: "Bob", team: pkm.Teams.pack(team2), id: "p2"}
    const stream = new pkm.BattleStream();
    const formatInput = {formatid: "${format.id}"}
    stream.write(`>start ${JSON.stringify(formatInput)}`);
    stream.write(`>player ${p1.id} ${JSON.stringify(p1)}`);
    stream.write(`>player ${p2.id} ${JSON.stringify(p2)}`);
    // console.log("@@1")
    for await (const output of stream) {
        if(stream.buf.length === 0){
            // console.log("@@4")
            await timeout(10)
            // console.log("@@5")
            if(stream.buf.length === 0){
                return null
                // console.log("@@6")
            }
        }
        // console.log("@@2")
        // console.log(output)
        for (let tmp of output.split("\n")) {
            if (tmp.startsWith("|error|")) {
                throw new Error("Did not finish battle")
            }

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
                        if (!p.active && p.condition !== "0 fnt") {
                            const command = `>${playerId} switch ${i + 1}`
                            // console.log(command)
                            stream.write(command);
                            break
                        }
                    }
                    continue
                }
                const activeMoves = request.active[0].moves;
                for (let i = 0; i < activeMoves.length; i++) {
                    let move = activeMoves[i]
                    if (move.pp > 0 && !move.disabled) {

                        const command = `>${playerId} move ${i + 1}`
                        // console.log(command)
                        stream.write(command);
                        break
                    }
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
        console.log(`@#${i + 1}/${n}`)
        const b = await doBattle()
        console.log(`@##${i + 1}/${n}`)
        if (!b) {
            continue
        }
        const [winnerTeam, loserTeam] = b;
        const d = [...toTeamData(winnerTeam, true), ...toTeamData(loserTeam, false)]
        ds = ds.concat(d)
    }
    return ds
}





doBattles(2000).then(r => {
    const content = convertToCSV(r)
    try {
        fs.writeFileSync('./data.csv', content);
    } catch (err) {
        console.error("here" + err);
    }
    console.log("Done")
})


