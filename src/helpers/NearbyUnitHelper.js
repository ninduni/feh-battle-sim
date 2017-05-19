/**
 * Runs combat damage calculations against units "nearby" to the main combatants
 **/

import * as utils from 'helpers/utils';

export function damageNearbyUnits({game, attacker, defender, aoeAtk, aoeMod, magical, pattern}) {
    // Get a list of units to damage based off the pattern provided
    let unitList = [];
    pattern.forEach(([x, y]) => {
        let [gridX, gridY] = [toGrid(defender.x) + x, toGrid(defender.y) + y];
        if (isOutsideGrid(game, gridX, gridY)) return;

        let unitID = game.grid[gridY][gridX].unit;
        if (unitID !== 0) {
            let unit = game.units[unitID];
            if (unit.isOpposingTeam(attacker.id)) {
                unitList.push(unit);
            }
        }
    });

    let aoeDmg = 0;
    // Deal nonlethal damage to each unit
    unitList.forEach((unit) => {
        aoeDmg = aoeAtk - outOfCombatMit(attacker, unit);
        aoeDmg = utils.roundNum(aoeDmg * aoeMod, false);
        aoeDmg = Math.max(aoeDmg, 0);
        // Set new unit HP
        unit.stats.hp = Math.max(unit.stats.hp - aoeDmg, 1);
    });
}

function outOfCombatMit(attacker, defender) {
    // Returns the value of the defender's out of combat mitigation against the attacker's damage type
    if (attacker.weaponData.magical) {
        return defender.stats.res + defender.stats.honeRes - defender.stats.threatenRes;
    } else {
        return defender.stats.def + defender.stats.honeDef - defender.stats.threatenDef;
    }
}

export function flatDamageNearbyUnits({game, attacker, target, range, dmg}) {
    // Get a list of units to damage based off the pattern provided
    let unitList = [];
    let pairs = utils.pairsWithinNSpaces(toGrid(target.x), toGrid(target.y), game.maxGridX, game.maxGridY, range);
    pairs.forEach(({x: x, y: y}) => {
        let unitID = game.grid[y][x].unit;
        if (unitID !== 0) {
            let unit = game.units[unitID];
            if (unit.isOpposingTeam(attacker.id)) {
                unitList.push(unit);
            }
        }
    });

    // Deal nonlethal damage to each unit
    unitList.forEach((unit) => {
        unit.stats.hp = Math.max(unit.stats.hp - dmg, 1);
    });
}

export function healNearbyUnits({game, healer, healerPos, range, healAmt}) {
    // Get a list of units to damage based off the pattern provided
    let unitList = [];
    let pairs = utils.pairsWithinNSpaces(toGrid(healerPos.x), toGrid(healerPos.y), game.maxGridX,
                                         game.maxGridY, range);
    pairs.forEach(({x: x, y: y}) => {
        let unitID = game.grid[y][x].unit;
        if (unitID === 0 || unitID === healer.id) return;

        let unit = game.units[unitID];
        if (unit.isOpposingTeam(healer.id)) return;

        unitList.push(unit);
    });

    // Deal nonlethal damage to each unit
    unitList.forEach((unit) => {
        unit.stats.hp = Math.min(unit.stats.hp + healAmt, unit.stats.totalhp);
    });
}

export function getNearbyHoneBuffs(game, receiver) {
    // Boosts a unit's bonus stats by all nearby hone buffs
    // Iterate through all friendly units, see if this unit is in range of one of their hone buffs
    let honeAtk = 0,
        honeSpd = 0,
        honeDef = 0,
        honeRes = 0;
    _.values(game.units).forEach((unit) => {
        if (unit.isOpposingTeam(receiver.id)) return;
        if (unit.id === receiver.id) return;
        if (!unit.passiveCData.hasOwnProperty("hone")) return;
        // Break if we don't pass filters
        if ((unit.passiveCData.hasOwnProperty("move_unique") && receiver.movement_type !== unit.passiveCData.move_unique) ||
            (unit.passiveCData.hasOwnProperty("dragon_unique") &&
             !(defender.type === "redDragon" || defender.type === "greenDragon" || defender.type === "blueDragon")
           )) {
            return;
        }
        // Break if the receiver is too far from the buff giver
        if (distance(unit, receiver) > 1) return;

        // For each stat, only keep the largest hone ability
        if (unit.passiveCData.hone.hasOwnProperty("atk")) {
            honeAtk = Math.max(honeAtk, unit.passiveCData.hone.atk);
        }
        if (unit.passiveCData.hone.hasOwnProperty("spd")) {
            honeSpd = Math.max(honeSpd, unit.passiveCData.hone.spd);
        }
        if (unit.passiveCData.hone.hasOwnProperty("def")) {
            honeDef = Math.max(honeDef, unit.passiveCData.hone.def);
        }
        if (unit.passiveCData.hone.hasOwnProperty("res")) {
            honeRes = Math.max(honeRes, unit.passiveCData.hone.res);
        }
    });

    receiver.stats.honeAtk = honeAtk;
    receiver.stats.honeSpd = honeSpd;
    receiver.stats.honeDef = honeDef;
    receiver.stats.honeRes = honeRes;
}

export function applyNearbyThreatenPenalties(game, threatener) {
    // Debuffs all enemy units based on the threatener's skills
    // Note that this has to work opposite for hone buffs,
    //  in that we iterate through all opposing enemies and modify THEIR threaten stat,
    //  because it applies TO enemies at the start of a unit's turn

    // Threaten notes:
    // Wears off at start of turn (guaranteed) or when attacking/performing and action
    _.values(game.units).forEach((unit) => {
        if (!unit.isOpposingTeam(threatener.id)) return;
        if (unit.id === threatener.id) return;
        if (!threatener.passiveCData.hasOwnProperty("threaten")) return;

        // Break if the receiver is too far from the buff giver
        if (distance(unit, threatener) > 2) return;

        let threatenAtk = unit.stats.threatenAtk,
            threatenSpd = unit.stats.threatenSpd,
            threatenDef = unit.stats.threatenDef,
            threatenRes = unit.stats.threatenRes;

        // For each stat, only keep the largest threaten ability
        if (threatener.passiveCData.threaten.hasOwnProperty("atk")) {
            threatenAtk = Math.max(threatenAtk, threatener.passiveCData.threaten.atk);
        }
        if (threatener.passiveCData.threaten.hasOwnProperty("spd")) {
            threatenSpd = Math.max(threatenSpd, threatener.passiveCData.threaten.spd);
        }
        if (threatener.passiveCData.threaten.hasOwnProperty("def")) {
            threatenDef = Math.max(threatenDef, threatener.passiveCData.threaten.def);
        }
        if (threatener.passiveCData.threaten.hasOwnProperty("res")) {
            threatenRes = Math.max(threatenRes, threatener.passiveCData.threaten.res);
        }

        unit.stats.threatenAtk = threatenAtk;
        unit.stats.threatenSpd = threatenSpd;
        unit.stats.threatenDef = threatenDef;
        unit.stats.threatenRes = threatenRes;
    });
}

export function getNearbySpurBuffs(game, receiver, receiverPos=null) {
    // Boosts a unit's bonus stats by all nearby spur buffs
    // Iterate through all friendly units, see if this unit is in range of one of their spur buffs

    // If no unit X/Y is provided just use the unit's current position
    if (receiverPos === null) {
        receiverPos = {x: receiver.x, y: receiver.y};
    }

    let spurAtk = 0,
        spurSpd = 0,
        spurDef = 0,
        spurRes = 0;
    _.values(game.units).forEach((unit) => {
        if (unit.isOpposingTeam(receiver.id)) return;
        if (unit.id === receiver.id) return;
        if (!unit.passiveCData.hasOwnProperty("spur")) return;
        // Break if we don't pass filters
        if ((unit.passiveCData.hasOwnProperty("move_unique") && receiver.movement_type !== unit.passiveCData.move_unique) ||
            (unit.passiveCData.hasOwnProperty("dragon_unique") &&
             !(defender.type === "redDragon" || defender.type === "greenDragon" || defender.type === "blueDragon")
           )) {
            return;
        }
        // Break if the receiver is too far from the buff giver
        if (distance(unit, receiverPos) > unit.passiveCData.spur.range) return;

        // For each stat, sum all spur buffs
        if (unit.passiveCData.spur.hasOwnProperty("atk")) {
            spurAtk += unit.passiveCData.spur.atk;
        }
        if (unit.passiveCData.spur.hasOwnProperty("spd")) {
            spurSpd += unit.passiveCData.spur.spd;
        }
        if (unit.passiveCData.spur.hasOwnProperty("def")) {
            spurDef += unit.passiveCData.spur.def;
        }
        if (unit.passiveCData.spur.hasOwnProperty("res")) {
            spurRes += unit.passiveCData.spur.res;
        }
    });

    receiver.stats.spurAtk = spurAtk;
    receiver.stats.spurSpd = spurSpd;
    receiver.stats.spurDef = spurDef;
    receiver.stats.spurRes = spurRes;
}

function isOutsideGrid(game, gridX, gridY) {
    return (gridX < 0 || gridX >= game.maxGridX || gridY < 0 || gridY >= game.maxGridY);
}

function toGrid(i) {
    return Math.floor(i / 90);
}

function fromGrid(i) {
    return (i * 90) + 45;
}

function distance(unitA, unitB) {
    return Math.abs(toGrid(unitA.x) - toGrid(unitB.x)) + Math.abs(toGrid(unitA.y) - toGrid(unitB.y));
}
