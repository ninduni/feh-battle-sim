import { weaponInfo } from 'skills/weapon';

class BattleCalculator {
	constructor() {

	}

	prepare(attacker, defender) {

	}

	determineTurnOrder(attacker, defender) {
		// Returns a list of attacks
		// +1 represents attacker, -1 represents defender
		// Therefore, a list like [1, 1, -1] means the attacker strikes twice, then the defender counters
		var moveList = [];

		moveList.push(1);
		moveList.push(-1);

		// Doubling based on higher speed
		if (attacker.stats.spd >= defender.stats.spd + 5) {
			moveList.push(1);
		} else if (defender.stats.spd >= attacker.stats.spd + 5) {
			moveList.push(-1);
		}

		return moveList;
	}

	dryRun(attacker, defender) {
		var attackerHP = attacker.stats.hp,
			defenderHP = defender.stats.hp,
			damage;

		var moveList = this.determineTurnOrder(attacker, defender);

		for (var i = 0; i < moveList.length; i++) {
			// Quit early if either character is dead
			if (attackerHP === 0 || defenderHP === 0) {
				break;
			}

			// Attacker strikes
			if (moveList[i] > 0) {
				damage = this.calculateAttack(attacker, defender);
				defenderHP = _.clamp(defenderHP - damage, 0, defender.stats.totalhp);
				// console.log('Attacker doing ' + damage + ' damage. Defender HP is now ' + defenderHP);
			}
			// Defender strikes
			else {
				damage = this.calculateAttack(defender, attacker);
				attackerHP = _.clamp(attackerHP - damage, 0, attacker.stats.totalhp);
				// console.log('Defender doing ' + damage + ' damage. Attacker HP is now ' + attackerHP);
			}
		}

		return {
			attackerHP: attackerHP,
			defenderHP: defenderHP,
			attackerDmg: this.calculateAttack(attacker, defender),
			defenderDmg: this.calculateAttack(defender, attacker),
			attackerMult: _.sumBy(moveList, (x) => (x > 0) ? 1: 0),
			defenderMult: _.sumBy(moveList, (x) => (x < 0) ? 1: 0)
		}

	}

	run(attacker, defender) {
		var result = this.dryRun(attacker, defender);

		// Set new HPs
		attacker.stats.hp = result.attackerHP;
		defender.stats.hp = result.defenderHP;
	}


	calculateAttack(attacker, defender) {
		var atkWeap = weaponInfo[attacker.skills.weapon],
			dfnWeapon = weaponInfo[defender.skills.weapon];

		// Get the correct mitigation stat
		var mit = (this.getAttackType(attacker) === 'phys') ? defender.stats.def : defender.stats.res;

		// Get effective against bonus

		if (atkWeap.hasOwnProperty("move_effective") && atkWeap.move_effective === defender.movementType) {
			if (defender.passiveAData.hasOwnProperty("cancel_effective")) {
				battleInfo.logMsg += "Effectiveness against " + defender.moveType + " neutralized by opponent [" + defender.passiveA + "]. ";
			} else {
				atkPower = roundNum(atkPower * 1.5, false);
				battleInfo.logMsg += "Effectiveness against " + defender.moveType + " boosts attack by 50% [" + attacker.weaponName + "]. ";
			}
		}

		return attacker.stats.atk - mit;
	}

	getAttackType(unit) {
		switch(unit.type) {
			case 'sword':
			case 'axe':
			case 'lance':
			case 'bow':
			case 'dagger':
				return 'phys';
			case 'redTome':
			case 'blueTome':
			case 'greenTome':
			case 'redDragon':
			case 'blueDragon':
			case 'greenDragon':
			case 'staff':
			default:
				return 'mag';
		}
	}
}

export let BattleCalc = new BattleCalculator();
