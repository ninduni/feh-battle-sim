import * as utils from 'helpers/utils';

export function applySealEffects(unit, target) {
    var statMods = {};
    if (unit.weaponData.hasOwnProperty("seal")) statMods = unit.weaponData.seal;
    if (unit.passiveBData.hasOwnProperty("seal")) statMods = unit.passiveBData.seal;
    if (statMods === {}) return;
    for (var stat in statMods) {
        target.stats[_.camelCase('threaten-' + stat)] = Math.max(
            // Note the negative sign, should probably update weapon/skills info to remove
            target.stats[_.camelCase('threaten-' + stat)], -statMods[stat]
        );
    }
}

export function applyAfterCombatBonus(unit) {
    if (unit.weaponData.hasOwnProperty("after_mod")) {
        var statMods = unit.weaponData.after_mod;
        for (var stat in statMods) {
            unit.stats[_.camelCase('hone-' + stat)] = Math.max(
                unit.stats[_.camelCase('hone-' + stat)], statMods[stat]
            );
        }
    }
}

export function afterCombatMovement({game, attacker, attackPos, target}) {
    // Handle after-combat movement effects
    // newX and newY represent the location the attacker is in after the attack
    // Returns whether or not we changed the unit's position
    if (attacker.passiveB === "Hit and Run") {
        // Attacker want's to back away from target by one space, if it is valid terrain
        let vec = utils.movementVector(attackPos, target, true);
        let attackerDestPos = {x: attackPos.x + vec.x, y: attackPos.y + vec.y};
        // Check whether the destination is movable by this unit and is free
        let attackerDest = game.grid[attackerDestPos.y][attackerDestPos.x];
        if (utils.isMovable(attacker, attackerDest)) {
            attacker.setUnitPos(attackerDest);
            return true;
        }
    } else if (attacker.passiveB === "Drag Back") {
        // Attacker want's to back away from target by one space, if it is valid terrain
        let vec = utils.movementVector(attackPos, target, true);
        let attackerDestPos = {x: attackPos.x + vec.x, y: attackPos.y + vec.y};
        // Check whether the destination is movable by this unit and is free
        let attackerDest = game.grid[attackerDestPos.y][attackerDestPos.x];
        let unitMoved = false;
        if (utils.isMovable(attacker, attackerDest)) {
            attacker.setUnitPos(attackerDest);
            unitMoved = true;
        }

        // Target will move into attacker's space, if it is valid, if alive
        let targetDestPos = {x: attackPos.x, y: attackPos.y};
        let targetDest = game.grid[targetDestPos.y][targetDestPos.x];
        if (utils.isMovable(target, targetDest) && target.stats.hp > 0) {
            target.setUnitPos(targetDest);
        }
        return unitMoved;
    } else if (attacker.passiveB === "Lunge") {
        // Attacker and target switch spots, but only if both have a valid move,
        // or if attacker has a valid move and target is dead
        let attackerDest = game.grid[target.y][target.x];
        let targetDest = game.grid[attackPos.y][attackPos.x];
        if ( ( utils.isMovable(attacker, attackerDest, true) &&
               utils.isMovable(target, targetDest, true) &&
               target.stats.hp > 0 ) ||
             ( utils.isMovable(attacker, attackerDest, true) && target.stats.hp <= 0) ) {
            attacker.setUnitPos(attackerDest);

            if (target.stats.hp > 0) {
                target.setUnitPos(targetDest);
            }

            return true;
        }
    } else if (attacker.passiveB === "Knock Back" && target.stats.hp > 0) {
        let vec = utils.movementVector(attackPos, target, false);
        // Target will move one space back, if it is valid, if alive
        let targetDestPos = {x: target.x + vec.x, y: target.y + vec.y};
        let targetDest = game.grid[targetDestPos.y][targetDestPos.x];
        if (utils.isMovable(target, targetDest)) {
            target.setUnitPos(targetDest);
        }
    }
    return false;
}
