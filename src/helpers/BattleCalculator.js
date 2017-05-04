import { weaponInfo } from 'skills/weapon';

class BattleCalculator {
	constructor() {

	}

	prepare(attacker, defender) {
		// Set up copies of attacker and defenders stats to manipulate without affecting the actual unit
		this.atkStats = {
			hp: attacker.stats.hp,
			totalhp: attacker.stats.totalhp,
            atk: attacker.stats.atk,
            spd: attacker.stats.spd,
            def: attacker.stats.def,
            res: attacker.stats.res,
            bonusHP: attacker.stats.bonusHP,
            bonusAtk: attacker.stats.bonusAtk,
            bonusSpd: attacker.stats.bonusSpd,
            bonusDef: attacker.stats.bonusDef,
            bonusRes: attacker.stats.bonusRes,
			specCurrCooldown: attacker.specCurrCooldown,
		};
		this.defStats = {
			hp: defender.stats.hp,
			totalhp: defender.stats.totalhp,
            atk: defender.stats.atk,
            spd: defender.stats.spd,
            def: defender.stats.def,
            res: defender.stats.res,
            bonusHP: defender.stats.bonusHP,
            bonusAtk: defender.stats.bonusAtk,
            bonusSpd: defender.stats.bonusSpd,
            bonusDef: defender.stats.bonusDef,
            bonusRes: defender.stats.bonusRes,
			specCurrCooldown: defender.specCurrCooldown,
		};
	}

	canCounter(attacker, defender) {
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

	determineTurnOrder(attacker, defender) {
		// Returns a list of attacks
		// +1 represents attacker, -1 represents defender
		// Therefore, a list like [1, 1, -1] means the attacker strikes twice, then the defender counters
		var moveList = [];

		moveList.push(1);
		if (this.canCounter(attacker, defender)) moveList.push(-1);

		// Doubling based on higher speed
		if (this.atkStats.spd >= this.defStats.spd + 5) {
			moveList.push(1);
		} else if (this.defStats.spd >= this.atkStats.spd + 5) {
			if (this.canCounter(attacker, defender)) moveList.push(-1);
		}

		return moveList;
	}

	dryRun(attacker, defender) {
		var damage;

		var moveList = this.determineTurnOrder(attacker, defender);

		for (var i = 0; i < moveList.length; i++) {
			// Quit early if either character is dead
			if (this.atkStats.hp === 0 || this.defStats.hp === 0) {
				break;
			}

			// Attacker strikes
			if (moveList[i] > 0) {
				damage = this.calculateAttack(attacker, defender, this.atkStats, this.defStats, true);
				this.defStats.hp = _.clamp(this.defStats.hp - damage, 0, this.defStats.totalhp);
				// console.log('Attacker doing ' + damage + ' damage. Defender HP is now ' + this.defStats.hp);
			}
			// Defender strikes
			else {
				damage = this.calculateAttack(defender, attacker, this.defStats, this.atkStats, false);
				this.atkStats.hp = _.clamp(this.atkStats.hp - damage, 0, this.atkStats.totalhp);
				// console.log('Defender doing ' + damage + ' damage. Attacker HP is now ' + attackerHP);
			}
		}

		return {
			attackerHP: this.atkStats.hp,
			defenderHP: this.defStats.hp,
			// The damge shown is the damage without taking specials into account
			attackerDmg: 'wip', //this.calculateAttack(attacker, defender, this.atkStats, this.defStats, true),
			defenderDmg: 'wip', //this.calculateAttack(defender, attacker, this.defStats, this.atkStats, false),
			attackerMult: _.sumBy(moveList, (x) => (x > 0) ? 1: 0),
			defenderMult: _.sumBy(moveList, (x) => (x < 0) ? 1: 0),
			attackerSpecCD: this.atkStats.specCurrCooldown,
			defenderSpecCD: this.defStats.specCurrCooldown
		};

	}

	run(attacker, defender) {
		var result = this.dryRun(attacker, defender);

		// Set new HPs
		attacker.stats.hp = result.attackerHP;
		defender.stats.hp = result.defenderHP;
		attacker.updateSpecCD(result.attackerSpecCD);
		defender.updateSpecCD(result.defenderSpecCD);
	}


	calculateAttack(attacker, defender, atkStats, defStats, initiator) {
		// Calculates the damage done for a single attack from the attacker to the defender
		// Initiator marks whether the attacker is the one that initiated combat

		var atkWeap = attacker.weaponData,
			dfnWeapon = defender.weaponData;

		// Attacker's power is initially atk + bonus attack, which will then be modified
		var atkPower = atkStats.atk + atkStats.bonusAtk;

		var atkSpec = false;	// set to true if special triggers
		var defSpec = false;	// set to true if special triggers

		// super effectiveness against movement types
		if (atkWeap.hasOwnProperty("move_effective") && atkWeap.move_effective === defender.movementType) {
			if (defender.passiveAData.hasOwnProperty("cancel_effective")) {
				console.log("Effectiveness against " + defender.movementType + " neutralized by opponent [" + defender.passiveA + "]. ");
			} else {
				atkPower = roundNum(atkPower * 1.5, false);
				console.log("Effectiveness against " + defender.movementType + " boosts attack by 50% [" + attacker.weaponName + "]. ");
			}
		}

		// super effectiveness against dragons
		if (attacker.weaponData.hasOwnProperty("dragon_effective") && (defender.type === "redDragon" || defender.type === "greenDragon" || defender.type === "blueDragon")) {

			if (defender.passiveAData.hasOwnProperty("cancel_effective")) {
				// battleInfo.logMsg += "Effectiveness against dragons neutralized by opponent [" + defender.passiveA + "]. ";
				console.log("Effectiveness against dragons neutralized by opponent [" + defender.passiveA + "]. ");
			} else {
				atkPower = roundNum(atkPower * 1.5, false);
				// battleInfo.logMsg += "Effectiveness against dragons increases attack by 50% [" + attacker.weaponName + "]. ";
				console.log("Effectiveness against dragons increases attack by 50% [" + attacker.weaponName + "]. ");
			}
		}

		// triangle advantage attack modifier
		var weaponColorAdv = this.weaponColorAdvantage(attacker.color, defender.color, attacker.weaponData, defender.weaponData);
		var triAdv = this.triAdvantage(attacker.color, defender.color);
		var atkMod = 1;

		// get base triangle advantage
		if (weaponColorAdv > 0) {
			atkMod = 1.2;
			// battleInfo.logMsg += "Weapon advantage against " + defender.color + " boosts attack by 20% [" + attacker.weaponName + "]. ";
			console.log("Weapon advantage against " + defender.color + " boosts attack by 20% [" + attacker.weaponName + "]. ");
		} else if (weaponColorAdv < 0) {
			atkMod = 0.8;
			// battleInfo.logMsg += "Opponent's weapon advantage reduces attack by 20% [" + defender.weaponName + "]. ";
			console.log("Opponent's weapon advantage reduces attack by 20% [" + defender.weaponName + "]. ");
		} else if (triAdv > 0) {
			atkMod = 1.2;
			// battleInfo.logMsg += "Triangle advantage boosts attack by 20%. ";
			console.log("Triangle advantage boosts attack by 20%. ");
		} else if (triAdv < 0) {
			atkMod = 0.8;
			// battleInfo.logMsg += "Triangle disadvantage reduces attack by 20%. ";
			console.log("Triangle disadvantage reduces attack by 20%. ");
		}

		// check for any additional triangle advantage boost, then calculate if needed
		if (atkMod > 1) {
			if (atkWeap.hasOwnProperty("tri_advantage")) {
				atkMod += 0.2;
				// battleInfo.logMsg += "Attack is boosted by another 20% [" + attacker.weaponName + "]. ";
				console.log("Attack is boosted by another 20% [" + attacker.weaponName + "]. ");
			} else if (dfnWeapon.hasOwnProperty("tri_advantage")) {
				atkMod += 0.2;
				// battleInfo.logMsg += "Opponent disadvantage boosts attack by another 20% [" + defender.weaponName + "]. ";
				console.log("Opponent disadvantage boosts attack by another 20% [" + defender.weaponName + "]. ");
			} else if (attacker.passiveAData.hasOwnProperty("tri_advantage")) {
				atkMod += attacker.passiveAData.tri_advantage;
				// battleInfo.logMsg += "Attack is boosted by another " + (attacker.passiveAData.tri_advantage * 100).toString() + "% [" + attacker.passiveA + "]. ";
				console.log("Attack is boosted by another " + (attacker.passiveAData.tri_advantage * 100).toString() + "% [" + attacker.passiveA + "]. ");
			} else if (defender.passiveAData.hasOwnProperty("tri_advantage")) {
				atkMod += defender.passiveAData.tri_advantage;
				// battleInfo.logMsg += "Opponent disadvantage boosts attack by another " + (defender.passiveAData.tri_advantage * 100).toString() + "% [" + defender.passiveA + "]. ";
				console.log("Opponent disadvantage boosts attack by another " + (defender.passiveAData.tri_advantage * 100).toString() + "% [" + defender.passiveA + "]. ");
			}
			atkPower = roundNum(atkPower * atkMod, false);
		} else if (atkMod < 1) {
			if (atkWeap.hasOwnProperty("tri_advantage")) {
				atkMod -= 0.2;
				// battleInfo.logMsg += "Attack is reduced by another 20% [" + attacker.weaponName + "]. ";
				console.log("Attack is reduced by another 20% [" + attacker.weaponName + "]. ");
			} else if (dfnWeapon.hasOwnProperty("tri_advantage")) {
				atkMod -= 0.2;
				// battleInfo.logMsg += "Opponent reduces attack by another 20% [" + defender.weaponName + "]. ";
				console.log("Opponent reduces attack by another 20% [" + defender.weaponName + "]. ");
			} else if (attacker.passiveAData.hasOwnProperty("tri_advantage")) {
				atkMod -= attacker.passiveAData.tri_advantage;
				// battleInfo.logMsg += "Attack is reduced by another " + (attacker.passiveAData.tri_advantage * 100).toString() + "% [" + attacker.passiveA + "]. ";
				console.log("Attack is reduced by another " + (attacker.passiveAData.tri_advantage * 100).toString() + "% [" + attacker.passiveA + "]. ");
			} else if (defender.passiveAData.hasOwnProperty("tri_advantage")) {
				atkMod -= defender.passiveAData.tri_advantage;
				// battleInfo.logMsg += "Opponent reduces attack by another " + (defender.passiveAData.tri_advantage * 100).toString() + "% [" + defender.passiveA + "]. ";
				console.log("Opponent reduces attack by another " + (defender.passiveAData.tri_advantage * 100).toString() + "% [" + defender.passiveA + "]. ");
			}
			atkPower = roundNum(atkPower * atkMod, true);
		}

		// Get the correct mitigation stat
		var mit = (atkWeap.magical) ? defStats.res : defStats.def;

		// defense and resistance lowering special
		if (attacker.specialData.hasOwnProperty("enemy_def_res_mod") && atkStats.specCurrCooldown <= 0) {
			mit -= roundNum(mit * attacker.specialData.enemy_def_res_mod, false);
			console.log("Opponent's defense and resistance lowered by " + (attacker.specialData.enemy_def_res_mod * 100).toString() + "% [" + attacker.special + "]. ");
			atkSpec = true;
		}

		var dmg = atkPower - mit;

		// damage buffs by stat
		if (attacker.specialData.hasOwnProperty("dmg_buff_by_stat") && atkStats.specCurrCooldown <= 0) {
			dmg += roundNum(attacker.specialData.dmg_buff_by_stat.buff * attacker[attacker.specialData.dmg_buff_by_stat.stat], false);
			// battleInfo.logMsg += "Damage boosted by " + (attacker.specialData.dmg_buff_by_stat.buff * 100).toString() + "% of " + statWord(attacker.specialData.dmg_buff_by_stat.stat) + " [" + attacker.special + "]. ";
			atkSpec = true;
		}

		// damage suffered buff
		if (attacker.specialData.hasOwnProperty("dmg_suffer_buff") && atkStats.specCurrCooldown <= 0) {
			dmg += roundNum((attacker.hp - attacker.currHP) * attacker.specialData.dmg_suffer_buff, false);
			// battleInfo.logMsg += "Damage boosted by " + (attacker.specialData.dmg_suffer_buff * 100).toString() + "% of damage suffered [" + attacker.special + "]. ";
			atkSpec = true;
		}

		// check for bonus damage on special proc
		if (attacker.weaponData.hasOwnProperty("spec_damage_bonus") && (atkSpec || ((attacker.specialData.hasOwnProperty("dmg_mod") || attacker.specialData.hasOwnProperty("heal_dmg")) && atkStats.specCurrCooldown <= 0))) {
			dmg += attacker.weaponData.spec_damage_bonus;
			battleInfo.logMsg += "Damage boosted by " + attacker.weaponData.spec_damage_bonus.toString() + " on Special trigger [" + attacker.weaponName + "]. ";
		}

		// cap damage at 0 if negative
		dmg = Math.max(dmg, 0);

		// halve staff damage
		if (attacker.type === "Staff") {
			dmg = roundNum(dmg / 2, false);
		}

		// check for damage multiplier
		if (attacker.specialData.hasOwnProperty("dmg_mod") && atkStats.specCurrCooldown <= 0) {
			dmg += roundNum(dmg * attacker.specialData.dmg_mod, false);
			// battleInfo.logMsg += "Damage boosted by " + (attacker.specialData.dmg_mod * 100).toString() + "% [" + attacker.special + "]. ";
			atkSpec = true;
		}

		// damage reduction from defender
		if (defender.specialData.hasOwnProperty("reduce_dmg") && defStats.specCurrCooldown <= 0 && defender.specialData.reduce_dmg.range === attacker.weapon.range) {
			dmg -= roundNum(dmg * defender.specialData.reduce_dmg.dmg_mod, false);
			// battleInfo.logMsg += "Opponent reduces damage inflicted from ";
			// if (battleInfo.atkRange === 1) {
			// 	battleInfo.logMsg += "adjacent attacks ";
			// } else {
			// 	battleInfo.logMsg += battleInfo.atkRange.toString() + " spaces away ";
			// }
			// battleInfo.logMsg += "by " + (defender.specialData.reduce_dmg.dmg_mod * 100).toString() + "% [" + defender.special + "]. ";
			defSpec = true;
		}

		dmg = Math.max(dmg, 0);

		// update cooldowns
		if (atkSpec) {
			atkStats.specCurrCooldown = this.getSpecialCooldown(attacker.specialData, attacker.weaponData, attacker.assistData);
			console.log(attacker.name, 'ran special, cooldown is now', atkStats.specCurrCooldown);
		} else if (atkStats.specCurrCooldown > 0) {
			atkStats.specCurrCooldown -= 1;
			console.log(attacker.name, 'cooldown is now', atkStats.specCurrCooldown);
		}

		if (defSpec) {
			defStats.specCurrCooldown = this.getSpecialCooldown(defender.specialData, defender.weaponData, defender.assistData);
			console.log(defender.name, 'ran special, cooldown is now', defStats.specCurrCooldown);
		} else if (defStats.specCurrCooldown > 0) {
			defStats.specCurrCooldown -= 1;
			console.log(defender.name, 'cooldown is now', defStats.specCurrCooldown);
		}

		return Math.max(dmg, 0);
	}

	// determines if the attacker has triangle advantage
	// attackColor is the color of the attacker, defendColor is the color of the defender
	// returns 1 if advantage, -1 if disadvantage, 0 if neither
	triAdvantage(attackColor, defendColor) {
		if (attackColor === defendColor || attackColor === "Colorless" || defendColor === "Colorless") {
			return 0;
		} else if ((attackColor === "Red" && defendColor === "Green") || (attackColor === "Green" && defendColor === "Blue") || (attackColor === "Blue" && defendColor === "Red")) {
			return 1;
		}

		return -1;
	}

	// determines if the attacker has a weapon advantage/disadvantage against the other foe's color
	// attackColor is the color of the attacker, defendColor is the color of the defender
	// attackWeapon is the weapon of the attack, defendWeapon is the weapon of the defender
	// returns 1 if advantage, -1 if disadvantage, 0 if neither
	weaponColorAdvantage(attackColor, defendColor, attackWeapon, defendWeapon) {
		if (attackWeapon.hasOwnProperty("color_effective") && attackWeapon.color_effective === defendColor) {
			return 1;
		} else if (defendWeapon.hasOwnProperty("color_effective") && defendWeapon.color_effective === attackColor) {
			return -1;
		}

		return 0;
	}


	// handles bonuses from initiating combat
	initiateBonus(statMods, modSource) {
		for (var stat in statMods) {
			battleInfo.attacker[stat] += statMods[stat];
		}

		return battleInfo;
	}

	// handles bonuses from getting attacked
	defendBonus(statMods, modSource) {
		for (var stat in statMods) {
			battleInfo.defender[stat] += statMods[stat];
		}

		return battleInfo;
	}

	// handles bonuses by being under a certain hp threshold
	belowThresholdBonus(belowThresholdMod, modSource, charToUse) {
		for (var stat in belowThresholdMod.stat_mod) {
			battleInfo[charToUse][stat] += belowThresholdMod.stat_mod[stat];
		}

		return battleInfo;
	}

	// handles atk bonus from -blade tomes
	bladeTomeBonus(bonusAtk, charToUse) {
		battleInfo[charToUse].atk += bonusAtk;
		return battleInfo;
	}

	// checks if the attack can activate windsweep
	canActivateSweep(container, atkSpd, defSpd, defWeapon) {
		return container.hasOwnProperty("sweep") && (atkSpd - defSpd >= container.sweep.spd_adv) && container.sweep.weapon_type.hasOwnProperty(defWeapon);
	}

	// checks if the defender can counter
	defCanCounter(battleInfo) {
		return battleInfo.defender.weaponName !== "None" && (battleInfo.defender.weaponData.range === battleInfo.attacker.weaponData.range || battleInfo.defender.weaponData.hasOwnProperty("counter") || battleInfo.defender.passiveAData.hasOwnProperty("counter")) && !battleInfo.attacker.weaponData.hasOwnProperty("prevent_counter") && !battleInfo.defender.weaponData.hasOwnProperty("prevent_counter") && !canActivateSweep(battleInfo.attacker.passiveBData, battleInfo.attacker.spd, battleInfo.defender.spd, battleInfo.defender.weaponData.type);
	}

	// heals by damage dealt
	healDmg(dmg, healAmount, healSource, multiple) {
		var heal = roundNum(dmg * healAmount, false);
		battleInfo.healAmt += heal;
		return battleInfo;
	}

	// gets the cooldown given special info and weapon info
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

export let BattleCalc = new BattleCalculator();
