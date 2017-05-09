/**
 * Runs combat damage calculations against units "nearby" to the main combatants
 **/

import { BattleCalc } from 'helpers/BC2';
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
        aoeDmg = aoeAtk - BattleCalc.mitAfterBonuses(attacker, unit);
        aoeDmg = utils.roundNum(aoeDmg * aoeMod, false);
        aoeDmg = Math.max(aoeDmg, 0);
        // Set new unit HP
        unit.stats.hp = Math.max(unit.stats.hp - aoeDmg, 1);
    });
}

export function getNearbyHoneBuffs({game, receiver}) {
    // Boosts a unit's bonus stats by all nearby hone buffs
    // Iterate through all friendly units, see if this unit is in range of one of their hone buffs
    let honeAtk = 0,
        honeSpd = 0,
        honeDef = 0,
        honeRes = 0;
    game.units.forEach((unit) => {
        if (unit.isOpposingTeam(receiver.id)) return;
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

    return {
        honeAtk: honeAtk,
        honeSpd: honeSpd,
        honeDef: honeDef,
        honeRes: honeRes
    };
}

export function getNearbySpurBuffs({game, receiver}) {
    // Boosts a unit's bonus stats by all nearby spur buffs
    // Iterate through all friendly units, see if this unit is in range of one of their spur buffs
    let spurAtk = 0,
        spurSpd = 0,
        spurDef = 0,
        spurRes = 0;
    game.units.forEach((unit) => {
        if (unit.isOpposingTeam(receiver.id)) return;
        if (!unit.passiveCData.hasOwnProperty("spur")) return;
        // Break if we don't pass filters
        if ((unit.passiveCData.hasOwnProperty("move_unique") && receiver.movement_type !== unit.passiveCData.move_unique) ||
            (unit.passiveCData.hasOwnProperty("dragon_unique") &&
             !(defender.type === "redDragon" || defender.type === "greenDragon" || defender.type === "blueDragon")
           )) {
            return;
        }
        // Break if the receiver is too far from the buff giver
        if (distance(unit, receiver) > unit.passiveCData.spur.range) return;

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

    return {
        spurAtk: spurAtk,
        spurSpd: spurSpd,
        spurDef: spurDef,
        spurRes: spurRes
    };
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
