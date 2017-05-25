import { game } from 'index';
import * as utils from 'helpers/utils';
import { BattleCalc } from 'helpers/BC2';
import * as NearbyUnitHelper from 'helpers/NearbyUnitHelper';
import * as AfterCombatHelper from 'helpers/AfterCombatHelper';
import { runAssist } from 'helpers/AssistHelper';
// import { BattleCalc } from 'helpers/BattleCalculator';
import { typeInfo } from 'skills/types';
import { assistInfo } from 'skills/assist';
import { weaponInfo } from 'skills/weapon';
import { specInfo } from 'skills/special';
import SpriteUI from 'objects/SpriteUI';
import MoveComponent from 'components/MoveComponent';

export default class Unit {
    // This class still extends sprite so that we can inject it into the game's
    // update loop, but doesn't actually render a sprite.
    // This class' x/y are the x/y of the character on the grid, not absolute
    //   pixels in the canvas

    constructor({gridX, gridY, movementType, weapon, asset, type, id}) {
        this.name = asset; // Not unique!
        this.id = id;
        this.x = this.lastX = gridX;
        this.y = this.lastY = gridY;


        // Set up stats
        this.stats = {
            // Base stats
            hp: 10, atk: 0, spd: 0, def: 0, res: 0,
            // Tracks "hone" or visible bonuses, only one of which can be active at a time
            honeAtk: 0, honeSpd: 0, honeDef: 0, honeRes: 0,
            // Tracks penalties from threaten
            threatenAtk: 0, threatenSpd: 0, threatenDef: 0, threatenRes: 0,
            // Tracks in-combat bonuses (spur, initiate/defend bonuses)
            spurAtk: 0, spurSpd: 0, spurDef: 0, spurRes: 0
        };
        this.stats.totalhp = this.stats.hp;

        // Movement component is also the visual component
        this.sprite = new MoveComponent(this, asset, gridX, gridY);
        game.world.addChild(this.sprite);

        // Creates the healthbar object, which will individually add all components as children of this unit
        this.spriteUI = new SpriteUI(this, this.isFriendly());
        this.sprite.addChild(this.spriteUI);

        // Set up type and movement type
        this.movementType = movementType;
        this.type = type; // This will set the color

        // Set up skills
        this.passiveA = null;
        this.passiveB = null;
        this.passiveC = null;
        this.passiveAData = {};
        this.passiveBData = {};
        this.passiveCData = {};

        // Weapon
        this.weapon = weapon;
        // Assist
        this.assist = '';
        // Special
        this.special = '';

        // Bookkeeping
        this.dead = false;
        this.turnEnded = false;

        // Flip unit horizontally if on enemy team
        if (!this.isFriendly()) {
            this.sprite.flip();
            this.spriteUI.flip();
        }
    }

    get type() {
        return this.typeName;
    }
    set type(typeName) {
        this.typeName = typeName;
        this.typeData = typeInfo[typeName];
        this.color = this.typeData.color;
        this.isDragon = this.typeData.hasOwnProperty('dragon');
        this.spriteUI.typeIcon.frameName = typeName;
        this.weapon = null; // Clear weapon when type changes
    }

    get movementType() {
        return this.movementTypeName;
    }
    set movementType(moveType) {
        this.movementTypeName = moveType;
        this.sprite.setMovementType(moveType);
    }

    get weapon() {
        return this.weaponName;
    }
    set weapon(weapName) {
        this.weaponName = weapName;
        if (weaponInfo.hasOwnProperty(weapName)) {
            this.weaponData = weaponInfo[weapName];
            this.attackRange = this.weaponData.range || 1;
            this.sprite.attackRange = this.attackRange;
        } else {
            this.weaponData = {};
            this.attackRange = 0;
            this.sprite.attackRange = 0;
        }

        // Re-set special to factor in cooldown modifiers
        this.special = this.special;
    }

    get assist() {
        return this.assistName;
    }
    set assist(assistName) {
        this.assistName = assistName;
        if (assistInfo.hasOwnProperty(assistName)) {
            this.assistData = assistInfo[assistName];
            this.assistRange = this.assistData.range || 1;
            this.sprite.assistRange = this.assistRange;
        } else {
            this.assistData = {};
            this.assistRange = 0;
            this.sprite.assistRange = 0;
        }

        // Re-set special to factor in cooldown modifiers
        this.special = this.special;
    }

    get special() {
        return this.specialName;
    }
    set special(specName) {
        this.specialName = specName;
        this.specialData = specInfo[specName] || {};
        this.specCurrCooldown = this.specialData.cooldown;
        // When setting a new special, modify special CD based on existing weapon
        if (this.weaponData.hasOwnProperty('spec_cooldown_mod')) {
            this.specCurrCooldown += this.weaponData.spec_cooldown_mod;
        }
        this.updateSpecCD(this.specCurrCooldown);
    }
    updateSpecCD(cd) {
        this.specCurrCooldown = cd;
        if (cd === undefined) {
            this.spriteUI.specialText.text = '';
        } else {
            this.spriteUI.specialText.text = cd;
        }

    }

    setUnitPos(pos) {
        this.sprite.setUnitPos(pos.x, pos.y);
    }

    updateUnitPosition() {
        // Check to make sure that the last position equals this unit's ID, and zero it out
        // This will NOT be true if another unit moves into this unit's previous space, which is OK
        if (game.grid[this.lastY][this.lastX].unit === this.id) {
            game.grid[this.lastY][this.lastX].unit = 0;
        }
        game.grid[this.y][this.x].unit = this.id;
        game.gridObj.debugGridShowProp('unit');
        this.lastX = this.x;
        this.lastY = this.y;
    }

    startTurn() {
        this.setTurnStart();

        // Calculate hone buffs
        NearbyUnitHelper.getNearbyHoneBuffs(game, this);

        // Calculate "defiant" buffs
        var stat, statName;
        if (this.weaponData.hasOwnProperty("defiant") && this.stats.hp <= utils.roundNum(this.stats.totalhp / 2)) {
            for (stat in this.weaponData.defiant) {
                statName = _.camelCase('hone-' + stat);
                this.stats[statName] = Math.max(this.stats[statName], this.weaponData.defiant[stat]);
            }
        }
        if (this.passiveAData.hasOwnProperty("defiant") && this.stats.hp <= utils.roundNum(this.stats.totalhp / 2)) {
            for (stat in this.passiveAData.defiant) {
                statName = _.camelCase('hone-' + stat);
                this.stats[statName] = Math.max(this.stats[statName], this.passiveAData.defiant[stat]);
            }
        }

        // Threaten nearby units
        if (this.passiveCData.hasOwnProperty("threaten")) {
            NearbyUnitHelper.applyNearbyThreatenPenalties(game, this, this.passiveCData.threaten);
        }
    }

    setTurnStart() {
        // Resets the turn for this unit, skips running start of turn things
        this.turnEnded = false;
        // Undo grey
        this.sprite.tint = 0xffffff;
        this.sprite.input.enableDrag();
    }

    endTurn() {
        this.setTurnEnd();

        // Penalties wear off
        this.stats.threatenAtk = 0;
        this.stats.threatenSpd = 0;
        this.stats.threatenDef = 0;
        this.stats.threatenRes = 0;

        game.state.states[game.state.current].saveTurnState(
            this.name + ' moves'
        );
    }

    setTurnEnd() {
        // Ends the turn for this unit, skips running end of turn things
        this.turnEnded = true;
        // Grey out the sprite
        this.sprite.tint = 0x888888;
        this.sprite.input.disableDrag();
    }

    clearBattleText() {
        game.clearBattleText();
    }

    dryRunAttack(target, attackPos) {
        // Calculate spur buffs on this unit and the target
        NearbyUnitHelper.getNearbySpurBuffs(game, this, attackPos);
        NearbyUnitHelper.getNearbySpurBuffs(game, target);

        var battleResult = BattleCalc.dryRun(this, target);
        game.displayBattleText(this, target, battleResult);
        // return battleResult;
    }

    attack(target, attackPos) {
        // Calculate spur buffs on this unit and the target
        NearbyUnitHelper.getNearbySpurBuffs(game, this, attackPos);
        NearbyUnitHelper.getNearbySpurBuffs(game, target);

        let battleResult = BattleCalc.run(this, target);
        // Deal nonlethal pre-combat damage to nearby units
        if (this.specialData.hasOwnProperty("before_combat_aoe") && battleResult.aoeAtk > 0) {
            NearbyUnitHelper.damageNearbyUnits({
                game: game,
                attacker: this,
                defender: target,
                aoeAtk: battleResult.aoeAtk,
                aoeMod: battleResult.aoeMod,
                magical: this.weaponData.magical,
                pattern: this.specialData.before_combat_aoe.pattern
            });
        }

        // If this unit died during combat, don't run post-combat effects
        if (this.stats.hp > 0) {
            // Deal nonlethal post-combat damage to nearby units
            if (this.passiveCData.hasOwnProperty("after_combat_aoe")) {
                NearbyUnitHelper.flatDamageNearbyUnits({
                    game: game,
                    attacker: this,
                    target: target,
                    range: 2,
                    dmg: this.passiveCData.after_combat_aoe
                });
            }
            // Heal nearby units after combat
            if (this.passiveCData.hasOwnProperty("after_combat_aoe_heal")) {
                NearbyUnitHelper.healNearbyUnits({
                    game: game,
                    healer: this,
                    healerPos: attackPos,
                    range: 1,
                    healAmt: this.passiveCData.after_combat_aoe_heal
                });
            }
            // Apply seal effects from target to this unit and this unit to target
            AfterCombatHelper.applySealEffects(this, target);
            // Apply after-combat boosts from e.g. rogue dagger
            AfterCombatHelper.applyAfterCombatBonus(this);
        }

        // Also helpfully run the same methods for the target
        if (target.stats.hp > 0) {
            AfterCombatHelper.applySealEffects(target, this);
            AfterCombatHelper.applyAfterCombatBonus(target);
        }

        // Do post-combat movement shenanigans
        if (this.stats.hp > 0) {
            return AfterCombatHelper.afterCombatMovement({
                game: game,
                attacker: this,
                attackPos: attackPos,
                target: target
            });
        } else {
            return false;
        }

        // Mark either this unit or the target as dead
        if (this.stats.hp <= 0) {
            this.die();
        }
        if (target.stats.hp <= 0) {
            target.die();
        }
    }

    die() {
        console.log(this.unit.name + ' is dead!');
        this.sprite.visible = false;
        game.grid[this.y][this.x].unit = 0;
    }

    doAssist(target, assistPos) {
        // Return true if all the movement/repositioning effects for THIS UNIT happened during this method
        return runAssist(game, this, target, assistPos);
    }

    isOpposingTeam(unitID) {
        // Checks another unit's id, and returns whether that unit is on the same team as this unit
        // Returns false if
        if (unitID === 0) {
            return null; // No unit in this square
        } else {
            return ((unitID - 5) ^ (this.id - 5)) < 0;
        }
    }

    isSameTeam(unitID) {
        // Returns true if unitID is on the same team as this unit (but not if we're comparing this unit to itself)
        if (unitID === 0) {
            return null;
        } else {
            return ((unitID - 5) ^ (this.id - 5)) > 0;
        }
    }

    isFriendly() {
        // Returns whether THIS unit is on the enemy or "red" team
        return this.id <= 4;
    }

    canPassUnit(unitID) {
        return !this.isOpposingTeam(unitID);
    }

    hasWeapon() {
        return this.weaponName !== 'None';
    }
}
