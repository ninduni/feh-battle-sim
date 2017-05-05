import { TurnOrderCalc } from 'helpers/TurnOrder';

class BC2 {
    prepare() {

    }

    run(attacker, defender) {
        var result = this.dryRun(attacker, defender);
        console.log(result);
        // Set new HPs
        attacker.stats.hp = result.attackerHPAfterNonlethal;
        defender.stats.hp = result.defenderHPAfterNonlethal;
        attacker.updateSpecCD(result.attackerSpecCD);
        defender.updateSpecCD(result.defenderSpecCD);
    }

    dryRun(attacker, defender) {
        // This method handles all mutable things in a battle, like changing HP and cooldown timers
        // It builds a list of attacks, then runs through them in sequence, handling post-attack actions as needed
        // In this method, unlike the other methods of this class, ATTACKER refers to the initiator of the BATTLE,
        //   not the single round.

        var damage = 0,
            healAmt = 0,
            aoeAtk = 0,
            aoeDmg = 0,
            aoeMod = 0;

        var moveList = TurnOrderCalc.determineTurnOrder(attacker, defender);
        console.log(moveList);
        // var moveList = this.determineTurnOrder(attacker, defender);

        // Mutable things: store special cooldowns and health
        var attackerSpecCD = attacker.specCurrCooldown,
            defenderSpecCD = defender.specCurrCooldown,
            attackerHP = attacker.stats.hp,
            defenderHP = defender.stats.hp,
            // References to previous hp values for use in hp changes
            attackerCurrHP, defenderCurrHP;

        // Store flags for whether special went off, check between attacks
        this.atkSpec = false;
        this.defSpec = false;

        // AOE damage before combat
        if (attacker.specialData.hasOwnProperty("before_combat_aoe") && attackerSpecCD <= 0) {
            // reset cooldown
            attacker.specCurrCooldown = this.getSpecialCooldown(attacker.specialData, attacker.weaponData, attacker.assistData);
            // calculate damage
            aoeAtk = this.attackAfterBonuses(attacker);
            aoeDmg = aoeAtk - this.mitAfterBonuses(attacker, defender);
            // check for damage multiplier
            aoeMod = attacker.specialData.hasOwnProperty("aoe_dmg_mod") || 1;
            aoeDmg = roundNum(aoeDmg * attacker.specialData.aoe_dmg_mod, false);
            // cap dmg at 0
            aoeDmg = Math.max(aoeDmg, 0);
            // Can't be lethal damage
            defenderHP = Math.max(defenderHP - aoeDmg, 1);
        }

        for (var i = 0; i < moveList.length; i++) {
            // Quit early if either character is dead
            if (attackerHP === 0 || defenderHP === 0) {
                break;
            }

            // Attacker strikes
            if (moveList[i] > 0) {
                damage = this.calculateAttack(attacker, defender, attackerSpecCD, defenderSpecCD);
                defenderCurrHP = defenderHP; // Save previous hp value
                defenderHP = _.clamp(defenderHP - damage, 0, defender.stats.totalhp);
                // console.log('Attacker doing ' + damage + ' damage. Defender HP is now ' + defenderHP);

                // A miracle occurs (defender survives)
                if (defenderHP <= 0 && defender.specialData.hasOwnProperty("survive") && defenderCurrHP > 1 && defender.specCurrCooldown <= 0) {
                    defenderHP = 1;
                    this.defSpec = true;
                }
                // Attacker heals with its weapon or special
                if (attacker.weaponData.hasOwnProperty("heal_dmg")) {
                    healAmt = (defenderCurrHP - defenderHP) * attacker.weaponData.heal_dmg;
                    attackerHP = Math.min(attacker.stats.totalhp, attackerHP + healAmt);
                }
                if (attacker.specialData.hasOwnProperty("heal_dmg") && attackerSpecCD <= 0) {
                    healAmt = (defenderCurrHP - defenderHP) * attacker.specialData.heal_dmg;
                    attackerHP = Math.min(attacker.stats.totalhp, attackerHP + healAmt);
                    this.atkSpec = true;
                }
            }
            // Defender strikes
            else {
                damage = this.calculateAttack(defender, attacker, defenderSpecCD, attackerSpecCD);
                attackerCurrHP = attackerHP;
                attackerHP = _.clamp(attackerHP - damage, 0, attacker.stats.totalhp);
                // console.log('Defender doing ' + damage + ' damage. Attacker HP is now ' + attackerHP);

                // A miracle occurs (attacker survives)
                if (attackerHP <= 0 && attacker.specialData.hasOwnProperty("survive") && attackerCurrHP > 1 && attacker.specCurrCooldown <= 0) {
                    attackerHP = 1;
                    this.atkSpec = true;
                }
                // Defender heals with its weapon or special
                if (defender.weaponData.hasOwnProperty("heal_dmg")) {
                    healAmt = (attackerCurrHP - attackerHP) * defender.weaponData.heal_dmg;
                    defenderHP = Math.min(defender.stats.totalhp, defenderHP + healAmt);
                }
                if (defender.specialData.hasOwnProperty("heal_dmg") && defenderSpecCD <= 0) {
                    healAmt = (attackerCurrHP - attackerHP) * defender.specialData.heal_dmg;
                    defenderHP = Math.min(defender.stats.totalhp, defenderHP + healAmt);
                    this.defSpec = true;
                }
            }

            // Update both units' special timers
            if (this.atkSpec) {
                attackerSpecCD = this.getSpecialCooldown(attacker.specialData, attacker.weaponData, attacker.assistData);
                this.atkSpec = false;
            } else if (attackerSpecCD > 0) {
                attackerSpecCD -= 1;
            }
            if (this.defSpec) {
                defenderSpecCD = this.getSpecialCooldown(defender.specialData, defender.weaponData, defender.assistData);
                this.defSpec = false;
            } else if (defenderSpecCD > 0) {
                defenderSpecCD -= 1;
            }
        }

        // after combat effects
        var atkAfterHeal = 0,
            atkPoison = 0,
            defPoison = 0,
            atkRecoil = 0,
            defRecoil = 0;

        // check for after combat healing
        if (attacker.weaponData.hasOwnProperty("initiate_heal") && attackerHP > 0) {
            afterAtkHeal = attacker.weaponData.initiate_heal;
            attackerHP = Math.max(attacker.stats.totalhp, attackerhP + afterAtkHeal);
        }
        // check for poison damage
        if (attacker.passiveBData.hasOwnProperty("poison") && attackerHP > 0 && defenderHP > 0) {
            atkPoison = attacker.passiveBData.poison;
        }
        if (attacker.weaponData.hasOwnProperty("poison") && defenderHP > 0) {
            atkPoison = attacker.weaponData.poison;
        }
        if (attacker.weaponData.hasOwnProperty("initiate_poison") && defenderHP > 0) {
            atkPoison = attacker.weaponData.initiate_poison;
        }
        if (defender.weaponData.hasOwnProperty("poison") && attackerHP > 0 && defAttacks) {
            defPoison = defender.weaponData.poison;
        }
        // check for recoil damage
        if (attackerHP > 0 && attacker.passiveAData.hasOwnProperty("recoil_dmg")) {
            atkRecoil = attacker.passiveAData.recoil_dmg;
        }
        if (defenderHP > 0 && defender.passiveAData.hasOwnProperty("recoil_dmg")) {
            defRecoil = defender.passiveAData.recoil_dmg;
        }
        // Nonlethal damage
        var attackerHPAfterNonlethal = Math.max(1, attackerHP - defPoison - atkRecoil);
        var defenderHPAfterNonlethal = Math.max(1, defenderHP - atkPoison - defRecoil);

        return {
            attackerHP: attackerHP,
            defenderHP: defenderHP,
            attackerHPAfterNonlethal: attackerHPAfterNonlethal,
            defenderHPAfterNonlethal: defenderHPAfterNonlethal,
            // The damge shown is the damage without taking specials into account
            attackerDmg: this.calculateAttackNoSpecial(attacker, defender),
            defenderDmg: this.calculateAttackNoSpecial(defender, attacker),
            attackerMult: _.sumBy(moveList, (x) => (x > 0) ? 1: 0),
            defenderMult: _.sumBy(moveList, (x) => (x < 0) ? 1: 0),
            attackerSpecCD: attackerSpecCD,
            defenderSpecCD: defenderSpecCD,
            // AoE damage to be applied to nearby units based on special
            aoeAtk: aoeAtk,
            aoeMod: aoeMod
        };

    }

    calculateAttackNoSpecial(attacker, defender) {
        // From http://feheroes.gamepedia.com/Damage_Calculation#Complete_formula
        var atk = this.attackAfterBonuses(attacker),
            effective = this.effectiveBonus(attacker, defender),
            advantage = this.advantageBonus(attacker, defender),
            mit = this.mitAfterBonuses(attacker, defender),
            classMod = (attacker.type === "Staff") ? 0.5 : 1;

        var afterEff = Math.trunc(atk * effective);

        return Math.max(0, Math.trunc((afterEff + Math.trunc(afterEff * advantage) - mit) * classMod));
    }

    calculateAttack(attacker, defender, attackerSpecCD, defenderSpecCD) {
        var atk = this.attackAfterBonuses(attacker),
            effective = this.effectiveBonus(attacker, defender),
            advantage = this.advantageBonus(attacker, defender),
            mit = this.mitAfterBonuses(attacker, defender),
            // Mitigation-modifying specials, e.g. luna
            mitMod = this.mitigationModifier(attacker, defender, attackerSpecCD),
            spcBoost = this.specialDmgBoost(attacker, attackerSpecCD),
            classMod = (attacker.type === "Staff") ? 0.5 : 1;

        var offMult = this.offensiveMultipler(attacker, defender, attackerSpecCD),
            defMult = this.defensiveMultipler(attacker, defender, defenderSpecCD);

        // console.log(atk, effective, advantage, mit, mitMod, spcBoost, classMod, offMult, defMult);

        // Damage from flat sources, like blade weapons or wo dao
        // MAKE SURE this is called last, so that we check if a special activated
        var flatDmg = this.damageBonus(attacker, defender);

        var afterEff = Math.trunc(atk * effective);
        var moddedMit = mit + Math.trunc(mit * mitMod);
        var dmg = afterEff + Math.trunc(afterEff * advantage) + Math.trunc(spcBoost) + flatDmg - moddedMit;
        var totalDmg = Math.trunc(dmg * classMod) * (1 + offMult);
        // console.log(flatDmg, afterEff, moddedMit, dmg, totalDmg);
        return Math.max(0, Math.trunc(totalDmg) + Math.trunc(defMult * totalDmg));
    }


    // HELPER FUNCTIONS

    attackAfterBonuses(attacker) {
        return attacker.stats.atk + attacker.stats.bonusAtk;
    }

    mitAfterBonuses(attacker, defender) {
        // Gets the defender's relevant mitigation amount, taking into account the attacker's damage type
        if (attacker.weaponData.magical) {
            return defender.stats.res + defender.stats.bonusRes;
        } else {
            return defender.stats.def + defender.stats.bonusDef;
        }
    }

    effectiveBonus(attacker, defender) {
        var mult = 1;
        // super effectiveness against movement types
        if (attacker.weaponData.hasOwnProperty("move_effective") && attacker.weaponData.move_effective === defender.movementType) {
            if (!defender.passiveAData.hasOwnProperty("cancel_effective")) {
                mult = mult * 1.5;
            }
        }
        // super effectiveness against dragons
        if (attacker.weaponData.hasOwnProperty("dragon_effective") &&
                (defender.type === "redDragon" || defender.type === "greenDragon" || defender.type === "blueDragon")) {
            if (!defender.passiveAData.hasOwnProperty("cancel_effective")) {
                mult = mult * 1.5;
            }
        }
        return mult;
    }

    advantageBonus(attacker, defender) {
        var weaponColorAdv = this.weaponColorAdvantage(attacker.color, defender.color, attacker.weaponData, defender.weaponData);
        var triAdv = this.triAdvantage(attacker.color, defender.color);
        var atkMod = 1;

        // get base triangle advantage (or color advantage, i.e. effective against colorless)
        if (weaponColorAdv > 0) {
            atkMod = 0.2;
        } else if (weaponColorAdv < 0) {
            atkMod = -0.2;
        } else if (triAdv > 0) {
            atkMod = 0.2;
        } else if (triAdv < 0) {
            atkMod = -0.2;
        }

        // check for any additional triangle advantage boost, then calculate if needed
        if (atkMod > 1) {
            if (attacker.weaponData.hasOwnProperty("tri_advantage")) {
                atkMod += 0.2;
            } else if (defender.weaponData.hasOwnProperty("tri_advantage")) {
                atkMod += 0.2;
            } else if (attacker.passiveAData.hasOwnProperty("tri_advantage")) {
                atkMod += attacker.passiveAData.tri_advantage;
            } else if (defender.passiveAData.hasOwnProperty("tri_advantage")) {
                atkMod += defender.passiveAData.tri_advantage;
            }
        } else if (atkMod < 1) {
            if (attacker.weaponData.hasOwnProperty("tri_advantage")) {
                atkMod -= 0.2;
            } else if (defender.weaponData.hasOwnProperty("tri_advantage")) {
                atkMod -= 0.2;
            } else if (attacker.passiveAData.hasOwnProperty("tri_advantage")) {
                atkMod -= attacker.passiveAData.tri_advantage;
            } else if (defender.passiveAData.hasOwnProperty("tri_advantage")) {
                atkMod -= defender.passiveAData.tri_advantage;
            }
        }
        return atkMod;
    }

    // determines if the attacker has triangle advantage
    // returns 1 if advantage, -1 if disadvantage, 0 if neither
    triAdvantage(attackColor, defendColor) {
        if (attackColor === defendColor || attackColor === "Colorless" || defendColor === "Colorless") {
            return 0;
        } else if ((attackColor === "Red" && defendColor === "Green") ||
                   (attackColor === "Green" && defendColor === "Blue") ||
                   (attackColor === "Blue" && defendColor === "Red")) {
            return 1;
        }
        return -1;
    }

    // determines if the attacker has a weapon advantage/disadvantage against the other foe's color
    // returns 1 if advantage, -1 if disadvantage, 0 if neither
    // Primarily used for effective vs. colorless weapons
    weaponColorAdvantage(attackColor, defendColor, attackWeapon, defendWeapon) {
        if (attackWeapon.hasOwnProperty("color_effective") && attackWeapon.color_effective === defendColor) {
            return 1;
        } else if (defendWeapon.hasOwnProperty("color_effective") && defendWeapon.color_effective === attackColor) {
            return -1;
        }
        return 0;
    }

    mitigationModifier(attacker, defender, attackerSpecCD) {
        if (attacker.specialData.hasOwnProperty("enemy_def_res_mod") && attackerSpecCD <= 0) {
            this.atkSpec = true;
            return -attacker.specialData.enemy_def_res_mod;
        } else {
            return 0;
        }
    }

    specialDmgBoost(attacker, attackerSpecCD) {
        if (attacker.specialData.hasOwnProperty("dmg_buff_by_stat") && attackerSpecCD <= 0) {
            this.atkSpec = true;
            return attacker.specialData.dmg_buff_by_stat.buff * attacker.stats[attacker.specialData.dmg_buff_by_stat.stat];
        } else if (attacker.specialData.hasOwnProperty("dmg_suffer_buff") && attackerSpecCD <= 0) {
            this.atkSpec = true;
            return (attacker.hp - attacker.currHP) * attacker.specialData.dmg_suffer_buff;
        } else {
            return 0;
        }
    }

    damageBonus(attacker, defender) {
        var bonusDmg = 0;
        if (attacker.weaponData.hasOwnProperty("spec_damage_bonus") && this.atkSpec) {
            bonusDmg += attacker.weaponData.spec_damage_bonus;
        }
        return bonusDmg;
    }

    offensiveMultipler(attacker, defender, attackerSpecCD) {
        if (attacker.specialData.hasOwnProperty("dmg_mod") && attackerSpecCD <= 0) {
            this.atkSpec = true;
            return attacker.specialData.dmg_mod;
        } else {
            return 0;
        }
    }

    defensiveMultipler(attacker, defender, defenderSpecCD) {
        if (defender.specialData.hasOwnProperty("reduce_dmg") && defenderSpecCD <= 0 &&
                defender.specialData.reduce_dmg.range === attacker.weaponData.range) {
            // Mark that the defender has used its special
            this.defSpec = true;
            return defender.specialData.reduce_dmg.dmg_mod;
        }
        return 0;
    }

    getSpecialCooldown(specialData, weaponData, assistData) {
        var cool = 0;
        if (specialData.hasOwnProperty("cooldown")) {
            cool = specialData.cooldown;
            if (weaponData.hasOwnProperty("spec_cooldown_mod")) {
                cool += weaponData.spec_cooldown_mod;
            }
            if (assistData.hasOwnProperty("spec_cooldown_mod")) {
                cool += assistData.spec_cooldown_mod;
            }
        }
        return Math.max(cool, 0);
    }
}

// rounds numbers up or down, rounds to closest int if the difference is less than 0.01
// unrounded is the number to round, roundUp is true if we need to round up
function roundNum(unrounded, roundUp) {
    "use strict";
    if (roundUp) {
        if (unrounded - Math.floor(unrounded) < 0.01) {
            return Math.floor(unrounded);
        } else {
            return Math.ceil(unrounded);
        }
    } else if (Math.ceil(unrounded) - unrounded < 0.01) {
        return Math.ceil(unrounded);
    }

    return Math.floor(unrounded);
}

export let BattleCalc = new BC2();
