class TurnOrderCalculator {
    determineTurnOrder(attacker, defender) {
        // Returns a list of attacks
        // +1 represents attacker, -1 represents defender
        // Therefore, a list like [1, 1, -1] means the attacker strikes twice, then the defender counters
        var moveList = [];
        var atkToken = 1,
            defToken = -1;
        var defCC = this.defenderCanCounter(attacker, defender);

        // Look up a bunch of skill info
        var atkBrash = this.attackerBrash(attacker, defCC),
            atkBreak = this.hasBreaker(attacker, defender),
            defBreak = this.hasBreaker(defender, attacker),
            atkDesperation = this.attackerDesperation(attacker),
            atkSweep = this.attackerSweep(attacker, defender),
            defRiposte = this.defenderRiposte(defender, defCC),
            defVantage = this.defenderVantage(defender, defCC),
            atkWary = this.hasWary(attacker),
            defWary = this.hasWary(defender);

        // Speed info
        var atkOutspeed = attacker.stats.spd >= defender.stats.spd + 5;
        var defOutspeed = defender.stats.spd >= attacker.stats.spd + 5;

        // Attacker can follow-up
        var atkCF = !attacker.passiveBData.hasOwnProperty("no_follow");

        // Some flags to keep track of things
        var vantage, // The defender used vantage, so moved first
            desperation; // The attacker used desperation so used its follow-up early

        ////////////////
        // HERE WE GO //
        ////////////////

        // Vantage moves first
        if (defVantage) {
            moveList = this.unitAttacks(defender, defToken, false, moveList);
            vantage = true;
        }

        // Attacker moves next
        moveList = this.unitAttacks(attacker, atkToken, true, moveList);

        // Immediate (desperation) attacker follow-up
        if (atkDesperation && atkCF) {
            // Foe cannot stop it
            if (!defBreak && !atkWary && !defWary) {
                // Follow-up with breaker, speed, or brash assault
                if (atkBreak || atkOutspeed || atkBrash) {
                    moveList = this.unitAttacks(attacker, atkToken, true, moveList);
                    desperation = true;
                    atkCF = false; // Attacker has used its follow-up already
                }
            }
            // Follow-ups prevented, but attacker outspeeds
            else if ((defWary || defBreak) && !atkWary && atkOutspeed) {
                // Can still trump with breaker or brash assault
                if (atkBreak || atkBrash) {
                    moveList = this.unitAttacks(attacker, atkToken, true, moveList);
                    desperation = true;
                    atkCF = false; // Attacker has used its follow-up already
                }
            }
        }

        // Foe counterattacks, if they haven't already with vantage
        if (!vantage && defCC) {
            moveList = this.unitAttacks(defender, defToken, false, moveList);
        }

        // FOLLOW-UPS
        // Attacker has wary figher, but defender can still follow-up with combination of two methods
        if (atkWary && defCC && defOutspeed && (defRiposte || defBreak)) {
            moveList = this.unitAttacks(defender, defToken, false, moveList);
        }
        // Defender has wary figher, but attacker can still follow-up with combination of two methods
        else if (defWary && atkCF && atkOutspeed && (atkBrash || atkBreak)) {
            moveList = this.unitAttacks(attacker, atkToken, true, moveList);
        }
        // Double breaker, cancels each other out and makes a follow-up if outspeeds
        else if (atkBreak && defBreak) {
            if (atkOutspeed && atkCF) {
                moveList = this.unitAttacks(attacker, atkToken, true, moveList);
            } else if (defOutspeed && defCC) {
                moveList = this.unitAttacks(defender, defToken, false, moveList);
            }
        }
        // Attacker has breaker
        else if (atkBreak) {
            // Defender can counter with riposte AND outspeed, but attacker moves first (if it can)
            if (atkCF) {
                moveList = this.unitAttacks(attacker, atkToken, true, moveList);
            }
            if (defRiposte && defOutspeed) {
                moveList = this.unitAttacks(defender, defToken, false, moveList);
            }
        }
        // Defender has breaker
        else if (defBreak) {
            // Check if attacker can follow-up anyway with brash assault
            if (atkBrash && atkOutspeed && atkCF) {
                moveList = this.unitAttacks(attacker, atkToken, true, moveList);
            }
            // Defender makes its breaker follow-up
            if (defCC) {
                moveList = this.unitAttacks(defender, defToken, false, moveList);
            }
        }
        // Regular follow-ups
        else {
            // Defender activated vantage, so follows-up first
            if (vantage && defOutspeed) {
                moveList = this.unitAttacks(defender, defToken, false, moveList);
            }

            // Attacker regular follow-up via speed or brash assault
            if (atkCF && (atkOutspeed || atkBrash)) {
                moveList = this.unitAttacks(attacker, atkToken, true, moveList);
                atkCF = false;
            }
            // Defender regular follow-up via speed or quick riposte
            else if (!vantage && defCC && (defOutspeed || defRiposte)) {
                moveList = this.unitAttacks(defender, defToken, false, moveList);
            }
        }

        return moveList;
    }

    // Returns a list of tokens for the given attacker
    // Basically this is just handling brave weapon doubling
    unitAttacks(unit, token, initiator, moveList) {
        if (initiator && unit.weaponData.hasOwnProperty("brave")) {
            return _.concat(moveList, [token, token]);
        } else {
            return _.concat(moveList, [token]);
        }
    }

    // Brash Assault
    attackerBrash(attacker, defCC) {
        var brashPassive = attacker.weaponData.hasOwnProperty("brash") &&
                           checkHPThreshold(attacker, attacker.weaponData.brash.threshold, _.lte) &&
                           defCC;
        return brashPassive;
    }

    // Breakers
    hasBreaker(unit, target) {
        var breakerPassive = unit.passiveBData.hasOwnProperty("breaker") &&
                             unit.passiveBData.breaker.weapon_type === target.type &&
                             checkHPThreshold(unit, unit.passiveBData.breaker.threshold, _.gte);
        var breakerWeapon = unit.weaponData.hasOwnProperty("breaker") &&
                            unit.weaponData.breaker.weapon_type === target.type;
        return breakerPassive || breakerWeapon;
    }

    // Desperation
    attackerDesperation(attacker) {
        var canActivateWithWeapon = attacker.weaponData.hasOwnProperty("desperation") &&
                                    checkHPThreshold(attacker, attacker.weaponData.desperation.threshold, _.lte);
        var canActivateWithPassive = attacker.passiveBData.hasOwnProperty("desperation") &&
                                     checkHPThreshold(attacker, attacker.passiveBData.desperation.threshold, _.lte);
        return canActivateWithWeapon || canActivateWithPassive;
    }

    // Sweep
    attackerSweep(attacker, defender) {
        var canActivateWithPassive = attacker.passiveBData.hasOwnProperty("sweep") &&
                                     (attacker.stats.spd - defender.stats.spd >= container.sweep.spd_adv) &&
                                     attacker.passiveBData.sweep.weapon_type.hasOwnProperty(defender.type);
        return canActivateWithPassive;
    }

    // Quick Riposte
    defenderRiposte(defender, defCC) {
        var riposteWeapon = defender.weaponData.hasOwnProperty("riposte") &&
                            checkHPThreshold(defender, defender.weaponData.riposte.threshold, _.gte) &&
                            defCC;
        var ripostePassive = defender.passiveBData.hasOwnProperty("riposte") &&
                             checkHPThreshold(defender, defender.passiveBData.riposte.threshold, _.gte) &&
                             defCC;
        return riposteWeapon || ripostePassive;
    }

    // Vantage
    defenderVantage(defender, defCC) {
        var canActivateWithWeapon = defender.weaponData.hasOwnProperty("vantage") &&
                                    checkHPThreshold(defender, defender.weaponData.vantage.threshold, _.lte);
        var canActivateWithPassive = defender.passiveBData.hasOwnProperty("vantage") &&
                                     checkHPThreshold(defender, defender.passiveBData.vantage.threshold, _.lte) &&
                                     defender.hasWeapon();
        var defenderCanActivate = canActivateWithWeapon || canActivateWithPassive;
        return defenderCanActivate && defCC;
    }

    // Wary Fighter
    hasWary(unit) {
        var waryPassive = unit.passiveBData.hasOwnProperty("wary") &&
                          checkHPThreshold(unit, unit.passiveBData.wary.threshold, _.gte);
        return waryPassive;
    }

    // Checks whether the DEFENDER can counter the ATTACKER
    defenderCanCounter(attacker, defender) {
        return defender.weaponName !== "None" && (
                    defender.weaponData.range === attacker.weaponData.range ||
                    defender.weaponData.hasOwnProperty("counter") ||
                    defender.passiveAData.hasOwnProperty("counter")
               ) &&
               !attacker.weaponData.hasOwnProperty("prevent_counter") &&
               !defender.weaponData.hasOwnProperty("prevent_counter") &&
               !this.canActivateSweep(
                    attacker.passiveBData,
                    attacker.spd,
                    defender.spd,
                    defender.weaponData.type
                );
    }
}

// Checks whether a unit's current HP satisfies a percentage HP threshold
// based on the passed in operator (_.gte, _.gt, _.lte, _.lt, _.eq)
function checkHPThreshold(unit, threshold, op) {
    return op(unit.stats.hp, checkRoundError(threshold * unit.stats.totalhp));
}

function checkRoundError(num) {
    "use strict";
    if (Math.ceil(num) - num < 0.01) {
        return Math.ceil(num);
    } else if (num - Math.floor(num) < 0.01) {
        return Math.floor(num);
    }

    return num;
}