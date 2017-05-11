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
        let vec = movementVector(attackPos, target, true);
        let attackerDestPos = {x: toGrid(attackPos.x) + vec.x, y: toGrid(attackPos.y) + vec.y};
        // Check whether the destination is movable by this unit and is free
        let attackerDest = game.grid[attackerDestPos.y][attackerDestPos.x];
        if (isMovable(attacker, attackerDest)) {
            attacker.x = fromGrid(attackerDest.x);
            attacker.y = fromGrid(attackerDest.y);
            return true;
        }
    } else if (attacker.passiveB === "Drag Back") {
        // Attacker want's to back away from target by one space, if it is valid terrain
        let vec = movementVector(attackPos, target, true);
        let attackerDestPos = {x: toGrid(attackPos.x) + vec.x, y: toGrid(attackPos.y) + vec.y};
        // Check whether the destination is movable by this unit and is free
        let attackerDest = game.grid[attackerDestPos.y][attackerDestPos.x];
        let unitMoved = false;
        if (isMovable(attacker, attackerDest)) {
            attacker.x = fromGrid(attackerDest.x);
            attacker.y = fromGrid(attackerDest.y);
            unitMoved = true;
        }

        // Target will move into attacker's space, if it is valid, if alive
        let targetDestPos = {x: toGrid(attackPos.x), y: toGrid(attackPos.y)};
        let targetDest = game.grid[targetDestPos.y][targetDestPos.x];
        if (isMovable(target, targetDest) && target.stats.hp > 0) {
            target.x = fromGrid(targetDest.x);
            target.y = fromGrid(targetDest.y);
            target.updateUnitPosition();
        }
        return unitMoved;
    } else if (attacker.passiveB === "Lunge") {
        // Attacker and target switch spots, but only if both have a valid move,
        // or if attacker has a valid move and target is dead
        let attackerDestPos = {x: toGrid(target.x), y: toGrid(target.y)};
        let targetDestPos = {x: toGrid(attackPos.x), y: toGrid(attackPos.y)};

        let attackerDest = game.grid[attackerDestPos.y][attackerDestPos.x];
        let targetDest = game.grid[targetDestPos.y][targetDestPos.x];
        if ( ( isMovable(attacker, attackerDest, true) &&
               isMovable(target, targetDest, true) &&
               target.stats.hp > 0 ) ||
             ( isMovable(attacker, attackerDest, true) && target.stats.hp <= 0) ) {
            attacker.x = fromGrid(attackerDest.x);
            attacker.y = fromGrid(attackerDest.y);

            if (target.stats.hp > 0) {
                target.x = fromGrid(targetDest.x);
                target.y = fromGrid(targetDest.y);
                target.updateUnitPosition();
            }

            return true;
        }
    } else if (attacker.passiveB === "Knock Back" && target.stats.hp > 0) {
        let vec = movementVector(attackPos, target, false);
        // Target will move one space back, if it is valid, if alive
        let targetDestPos = {x: toGrid(target.x) + vec.x, y: toGrid(target.y) + vec.y};
        let targetDest = game.grid[targetDestPos.y][targetDestPos.x];
        if (isMovable(target, targetDest)) {
            target.x = fromGrid(targetDest.x);
            target.y = fromGrid(targetDest.y);
            target.updateUnitPosition();
        }
    }
    return false;
}

function isMovable(unit, unitDest, ignoreUnit=false) {
    // Checks whether a unit can move onto a square
    switch(unit.movementType) {
        case 'Infantry':
        case 'Armor':
            if (![1, 2].includes(unitDest.terrain)) return false;
            break;
        case 'Cavalry':
            if (![1].includes(unitDest.terrain)) return false;
            break;
        case 'Flying':
            if (![1, 2, 3].includes(unitDest.terrain)) return false;
            break;
    }
    if (unitDest.unit !== 0 && !ignoreUnit) return false;
    return true;
}

function movementVector(attacker, target, away) {
    // Returns a vector representing which direction moves towards (or away from) enemy
    var xDiff = target.x - attacker.x,
        yDiff = target.y - attacker.y,
        vec;
    if (xDiff && yDiff) {
        // Something's wrong, not adjacent, movement skills not allowed on range
        console.log('MOVEMENT SKILL NOT ALLOWED ON RANGE UNIT');
    } else if (xDiff > 0) {
        vec = {x: 1, y: 0};
    } else if (xDiff < 0) {
        vec = {x: -1, y: 0};
    } else if (yDiff > 0) {
        vec = {x: 0, y: 1};
    } else if (yDiff < 0) {
        vec = {x: 0, y: -1};
    }
    return {x: vec.x * Math.pow(-1, away), y: vec.y * Math.pow(-1, away)};
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
