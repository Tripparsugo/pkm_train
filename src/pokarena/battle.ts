import {vectorizeTurnInfo} from "./vectorization";
import {Arena} from "./PokeArena";
import {BattleInfo} from "./pt";

function computeRewards2(playerTurns: any[], won): number[] {
    const EVALUATION_WINDOW_SIZE = 7
    const ALPHA = 0.7
    const rewards = []

    let maxReward = 0
    for (let i = 0; i < EVALUATION_WINDOW_SIZE - 1; i++) {
        maxReward += Math.pow(ALPHA, i)
    }

    for (let i = 0; i < playerTurns.length; i++) {
        const evaluationWindow = playerTurns.slice(i, i + EVALUATION_WINDOW_SIZE)
        let reward = 0
        for (let j = 0; j < EVALUATION_WINDOW_SIZE - 1; j++) {
            const tmp = computeAdjacentStateDiff(evaluationWindow[j], evaluationWindow[j + 1], won) * Math.pow(ALPHA, j)
            reward += tmp
        }
        //TODO using maxReward; now it's in [-1,1]
        reward /= maxReward
        // reward = (reward * 0.95) + (won ? 0.05 : -0.05)
        //in [0,1]
        // reward = (reward) / 2
        //
        reward *= 2
        rewards.push(reward)
    }

    return rewards
}


function computeStateValue(s) {
    let ownTotalPercentage = 0
    for (const p of s.ownPokemonStates) {
        ownTotalPercentage += p.hpPercentage
    }
    let otherTotalPercentage = 0
    for (const p of s.otherPokemonStates) {
        otherTotalPercentage += p.hpPercentage
    }

    const stateValue = (ownTotalPercentage - otherTotalPercentage) / 6
    return stateValue

}

function computeAdjacentStateDiff(s1, s2, won: boolean) {
    if (!s2) {
        if (!s1) {
            return 0
        }
        return won ? 1 : -1
    }
    const [s1v, s2v] = [computeStateValue(s1), computeStateValue(s2)]
    const v = (s2v - s1v) * 6
    return v

}


function battleInfoToTurnState(battleInfo: BattleInfo) {
    const ownPokemonStates = battleInfo.playerSide.map(p => {
        return {hpPercentage: p.hp / p.maxhp}
    })
    const otherPokemonStates = battleInfo.opponentSide.map(p => {
        return {
            hpPercentage: p.hpPercentage
        }
    })
    for (let i = otherPokemonStates.length; i < 6; i++) {
        otherPokemonStates.push(
            {hpPercentage: 1}
        )
    }

    return {ownPokemonStates, otherPokemonStates}

}

async function doBattle(p1, p2, battleId) {
    const turnResults = []
    const players = [p1, p2]

    function record(activePlayer, battleInfo, request, playerAction) {
        const player = activePlayer
        const v = vectorizeTurnInfo(battleInfo, playerAction, true).map(x => x.toFixed(2))
        const s = battleInfoToTurnState(battleInfo)
        // const tmp = _.cloneDeep(battleInfo)
        turnResults.push({player, v, s})
    }

    const battleResults = await new Arena(p1, p2, record, false).doBattle()

    for (const tr of turnResults) {
        // const won = battleResults.winner === tr.player
        // const [ownLeft, otherLeft] = won ? [battleResults.winnerLeftNum, battleResults.loserLeftNum]
        //     : [battleResults.loserLeftNum, battleResults.winnerLeftNum]
        tr.battleId = battleId
        // tr.reward = computeReward(ownLeft, otherLeft, won)
    }

    for (const p of players) {
        const pWon = battleResults.winner === p
        const pTurnResults = turnResults.filter(tr => tr.player === p)
        const pStates = pTurnResults.map(r => r.s)
        const pRewards = computeRewards2(pStates, pWon)
        for (let i = 0; i < pTurnResults.length; i++) {
            pTurnResults[i].reward = pRewards[i]
        }
    }
    return {battleResults, turnResults}
}

async function doBattles(p1gen, p2gen, n) {
    let rs = []
    for (let i = 0; i < n; i++) {
        try {
            rs.push(await doBattle(await p1gen(), await p2gen(), i))
            if (i % 10 === 0) {
                console.log(`${i}/${n}`)
            }
        } catch (e) {
            //TODO fix potentiall stopping conditions
            console.log(e)
        }
    }
    return rs
}

export {doBattles}