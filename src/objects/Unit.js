import * as utils from 'helpers/utils';
import { BattleCalc } from 'helpers/BC2';
import * as NearbyUnitHelper from 'helpers/NearbyUnitHelper';
import * as AfterCombatHelper from 'helpers/AfterCombatHelper';
import { runAssist } from 'helpers/AssistHelper';
// import { BattleCalc } from 'helpers/BattleCalculator';
import { assistInfo } from 'skills/assist';
import { weaponInfo } from 'skills/weapon';
import { specInfo } from 'skills/special';
import HealthBar from 'objects/HealthBar';

export default class Unit extends Phaser.Sprite {

    constructor({game, gridX, gridY, movementType, weapon, asset, type, id}) {
        super(game, 90 * gridX, 90 * gridY, asset);
        // this.game = game;
        this.name = asset; // Not unique!
        this.id = id;
        this.movementType = movementType;
        this.assistRange = 1;
        this.type = type;

        this.anchor.setTo(0.5, (this.height - 45.0) / this.height);
        // Move into a grid space after adjusting anchor point
        this.x += 45;
        this.y += 45;
        this.lastX = this.x;
        this.lastY = this.y;

        // Set up stats
        this.stats = {
            hp: 10,
            _lasthp: 0,
            atk: 0,
            spd: 0,
            def: 0,
            res: 0,
            // Tracks "hone" or visible bonuses, only one of which can be active at a time
            honeAtk: 0,
            honeSpd: 0,
            honeDef: 0,
            honeRes: 0,
            // Tracks penalties from threaten
            threatenAtk: 0,
            threatenSpd: 0,
            threatenDef: 0,
            threatenRes: 0,
            // Tracks in-combat bonuses (spur, initiate/defend bonuses)
            spurAtk: 0,
            spurSpd: 0,
            spurDef: 0,
            spurRes: 0
        };
        this.stats.totalhp = this.stats.hp;

        // Set up skills
        this.passiveA = null;
        this.passiveB = null;
        this.passiveC = null;
        this.passiveAData = {};
        this.passiveBData = {};
        this.passiveCData = {};

        // Weapon
        this.weapon = weapon;
        this.weaponData = weaponInfo[weapon];
        this.color = this.weaponData.color;

        // Assist
        this.assist = null;
        this.assistData = assistInfo[this.assist] || {};

        // Special
        this.special = null;
        this.specialData = specInfo[special] || {};
        this.specCurrCooldown = this.specialData.cooldown;

        // Bookkeeping
        this.dead = false;
        this.turnEnded = false;

        // Set up click/drag stuff
        this.inputEnabled = true;
        this.input.enableDrag();

        this.events.onDragStart.add(this.onDragStart, this);
        this.events.onDragStop.add(this.onDragStop, this);
        this.events.onInputDown.add(this.onClick, this);
        this.game.stage.addChild(this);

        this.hoverTarget = {x: null, y: null};

        this.dragging = false;

        // Creates the healthbar object, which will individually add all components as children of this unit
        this.healthbar = new HealthBar(this.game, this, this.isFriendly(), this.stats.hp);

        // Type Icon
        this.typeIcon = this.game.add.sprite(-35, -35, 'types', this.type);
        this.typeIcon.anchor.setTo(0.5);
        this.typeIcon.scale.setTo(0.5);
        this.addChild(this.typeIcon);

        // Special counter icon
        this.specialText = this.game.add.bitmapText(-35, -20, 'special', this.specCurrCooldown, 30);
        this.specialText.anchor.setTo(0.5);
        this.addChild(this.specialText);

        // Flip unit horizontally if on enemy team
        if (!this.isFriendly()) {
            this.scale.x = -1;
            this.healthbar.flip();
            this.typeIcon.scale.x = -0.5;

            this.specialText.scale.x = -1;
            // this.specialText.x *= -1;
        }
    }

    update() {
        // Handle hover effects when unit is being dragged
        if (this.dragging === true) {
            // If target has changed...
            if (this.hoverTarget.x !== toGrid(this.x) || this.hoverTarget.y !== toGrid(this.y)) {

                // If we drag off the map, reset
                if (toGrid(this.x) >= this.game.maxGridX ||
                    toGrid(this.x) < 0 ||
                    toGrid(this.y) >= this.game.maxGridY ||
                    toGrid(this.y) < 0) {
                    console.log('out of bounds!');
                    this.x = this.lastX;
                    this.y = this.lastY;
                    this.stopDrag();
                    this.onDragStop();
                }

                this.game.gridObj.hideSelectors();
                this.hoverTarget = {x: toGrid(this.x), y: toGrid(this.y)};

                // If we hover over an endable square, add this new target to the hover history list,
                // or move it to the front
                for (var i  = 0; i < this.validEndPositons.length; i++) {
                    if (this.hoverTarget.x === this.validEndPositons[i].x &&
                            this.hoverTarget.y === this.validEndPositons[i].y) {
                        this.hoverHistory = _.concat(
                            [this.hoverTarget],
                            _.filter(this.hoverHistory, (p) => !(p.x === this.hoverTarget.x && p.y === this.hoverTarget.y))
                        );
                    }
                }

                var hoverUnit = this.game.grid[toGrid(this.y)][toGrid(this.x)].unit;

                // Check if we're over an enemy and draw combat stats
                var attackPos = this.getAttackPos();
                if (attackPos !== null) {
                    var target = this.game.units[hoverUnit];

                    var battleResult = this.dryRunAttack(target, {x: fromGrid(attackPos.x), y: fromGrid(attackPos.y)});

                    this.game.grid[toGrid(this.y)][toGrid(this.x)].showAttack();
                    this.game.grid[attackPos.y][attackPos.x].showMove();
                    this.game.displayBattleText(this, target, battleResult);
                } else {
                    this.game.clearBattleText();
                    this.game.grid[toGrid(this.y)][toGrid(this.x)].showMove();
                }
            }
        }

        // Handle redrawing HP bar when health changes
        if (this.stats._lasthp !== this.stats.hp) {
            this.updateHP();

            if (this.stats.hp <= 0) {
                // Remove from game (set invisible and clear from grid)
                console.log(this.name + ' is dead!');
                this.visible = false;
                this.game.grid[toGrid(this.y)][toGrid(this.x)].unit = 0;
            }
        }
    }

    startTurn() {
        this.setTurnStart();

        // Calculate hone buffs
        NearbyUnitHelper.getNearbyHoneBuffs(this.game, this);

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
            NearbyUnitHelper.applyNearbyThreatenPenalties(this.game, this, this.passiveCData.threaten);
        }
    }

    setTurnStart() {
        // Resets the turn for this unit, skips running start of turn things
        this.turnEnded = false;
        // Undo grey
        this.tint = 0xffffff;
        this.input.enableDrag();
    }

    endTurn() {
        this.setTurnEnd();

        // Penalties wear off
        this.stats.threatenAtk = 0;
        this.stats.threatenSpd = 0;
        this.stats.threatenDef = 0;
        this.stats.threatenRes = 0;

        this.game.state.states[this.game.state.current].saveTurnState(
            this.name + ' moves'
        );
    }

    setTurnEnd() {
        // Ends the turn for this unit, skips running end of turn things
        this.turnEnded = true;
        // Grey out the sprite
        this.tint = 0x888888;
        this.input.disableDrag();
    }

    updateHP() {
        this.healthbar.redraw(this.stats.hp, this.stats.totalhp);
        this.stats._lasthp = this.stats.hp;
    }

    updateSpecCD(cd) {
        this.specCurrCooldown = cd;
        if (cd === undefined) {
            this.specialText.text = '';
        } else {
            this.specialText.text = cd;
        }

    }

    setMovementType() {
        switch(this.movementType) {
            case 'Infantry':
                this.game.pathfinder.setAcceptableTiles([1,2]);
                this.game.pathfinder.setTileCost(1, 1);
                this.game.pathfinder.setTileCost(2, 2);
                this.movement = 2;
                break;
            case 'Cavalry':
                this.game.pathfinder.setAcceptableTiles([1]);
                this.game.pathfinder.setTileCost(1, 1);
                this.movement = 3;
                break;
            case 'Armor':
                this.game.pathfinder.setAcceptableTiles([1,2]);
                this.game.pathfinder.setTileCost(1, 1);
                this.game.pathfinder.setTileCost(2, 1);
                this.movement = 1;
                break;
            case 'Flying':
                this.game.pathfinder.setAcceptableTiles([1,2,3]);
                this.game.pathfinder.setTileCost(1, 1);
                this.game.pathfinder.setTileCost(2, 1);
                this.game.pathfinder.setTileCost(3, 1);
                this.movement = 2;
                break;
        }
    }

    snapToGrid() {
        this.x = toGrid(this.x) * 90 + 45;
        this.y = toGrid(this.y) * 90 + 45;
    }

    dryRunAttack(target, attackPos) {
        // Calculate spur buffs on this unit and the target
        NearbyUnitHelper.getNearbySpurBuffs(this.game, this, attackPos);
        NearbyUnitHelper.getNearbySpurBuffs(this.game, target);

        var battleResult = BattleCalc.dryRun(this, target);
        return battleResult;
    }

    attack(target, attackPos) {
        // Calculate spur buffs on this unit and the target
        NearbyUnitHelper.getNearbySpurBuffs(this.game, this, attackPos);
        NearbyUnitHelper.getNearbySpurBuffs(this.game, target);

        let battleResult = BattleCalc.run(this, target);
        // Deal nonlethal pre-combat damage to nearby units
        if (this.specialData.hasOwnProperty("before_combat_aoe") && battleResult.aoeAtk > 0) {
            NearbyUnitHelper.damageNearbyUnits({
                game: this.game,
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
                    game: this.game,
                    attacker: this,
                    target: target,
                    range: 2,
                    dmg: this.passiveCData.after_combat_aoe
                });
            }
            // Heal nearby units after combat
            if (this.passiveCData.hasOwnProperty("after_combat_aoe_heal")) {
                NearbyUnitHelper.healNearbyUnits({
                    game: this.game,
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
                game: this.game,
                attacker: this,
                attackPos: attackPos,
                target: target
            });
        } else {
            return false;
        }
    }

    doAssist(target, assistPos) {
        // Return true if all the movement/repositioning effects for THIS UNIT happened during this method
        return runAssist(this.game, this, target, {x: fromGrid(assistPos.x), y: fromGrid(assistPos.y)});
    }

    onClick() {
        this.game.unitSelect(this.id);
    }

    onDragStart() {
        // Can't drag if not your turn
        if (this.game.isFriendlyTurn !== this.isFriendly()) {
            this.stopDrag();
            return;
        }

        this.dragging = true;
        this.hoverTarget = {x: toGrid(this.x), y: toGrid(this.y)};
        this.hoverHistory = [this.hoverTarget];

        this.bringToTop();

        this.validMoves = this.getValidMoves();
        this.validEndPositons = this.getValidEndPositions(this.validMoves);
        this.validAttacks = this.getValidAttacks(this.validMoves, this.validEndPositons);
        this.validAssists = this.getValidAssists(this.validMoves, this.validEndPositons);

        window.validMoves = this.validMoves;
        this.showMoveAttackOverlay();

        this.lastX = this.x;
        this.lastY = this.y;
    }

    onDragStop() {
        this.dragging = false;
        this.hoverTarget = {x: null, y: null};

        // If we drag off the map, reset (failsafe for if this check in update doesn't catch it)
        if (toGrid(this.x) >= this.game.maxGridX ||
            toGrid(this.x) < 0 ||
            toGrid(this.y) >= this.game.maxGridY ||
            toGrid(this.y) < 0) {
            this.x = this.lastX;
            this.y = this.lastY;
        }

        this.snapToGrid();
        // Hide all selectors and overlay
        this.game.gridObj.hideAll();

        // If we are back where we started, don't end the turn
        if (toGrid(this.x) === toGrid(this.lastX) && toGrid(this.y) === toGrid(this.lastY)) {
            return;
        }

        var attackPos = this.getAttackPos();
        var assistPos = this.getAssistPos();
        var target;
        // If we selected an attack or assist, run the battle/assist, then place us in the correct position
        if (attackPos !== null) {
            console.log('attacking!');
            target = this.game.grid[toGrid(this.y)][toGrid(this.x)].unit;
            console.log(this.name + ' is attacking ' + this.game.units[target].name);
            let handledMove = this.attack(this.game.units[target], {x: fromGrid(attackPos.x), y: fromGrid(attackPos.y)});
            if (!handledMove) {
                this.x = fromGrid(attackPos.x);
                this.y = fromGrid(attackPos.y);
            }
        }
        else if (assistPos !== null) {
            console.log('assisting!');
            target = this.game.grid[toGrid(this.y)][toGrid(this.x)].unit;
            console.log(this.name + ' is assisting ' + this.game.units[target].name);
            let handledMove = this.doAssist(this.game.units[target], assistPos);
            // Some assists reposition us. If that one did not, then move to assisting position
            if (!handledMove) {
                this.x = fromGrid(assistPos.x);
                this.y = fromGrid(assistPos.y);
            }
        }
        // If not an attack/assist and not a valid move, reset to last position, don't end turn
        else if (!this.checkAllowedPos(this.validEndPositons)) {
            console.log('Destination not allowed!');
            this.x = this.lastX;
            this.y = this.lastY;
            return;
        }

        // If we attacked, assisted, or moved, we need to update the unit's position in the grid, then end the turn
        this.updateUnitPosition();

        // Possible GC help?
        this.validEndPositons = null;
        this.validMoves = null;
        this.validAttacks = null;
        this.validAssists = null;

        this.endTurn();

        // DEBUG
        // this.game.gridObj.debugGridShowProp('unit');
    }


    updateUnitPosition() {
        // Check to make sure that the last position equals this unit's ID, and zero it out
        // This will NOT be true if another unit moves into this unit's previous space, which is OK
        if (this.game.grid[toGrid(this.lastY)][toGrid(this.lastX)].unit === this.id) {
            this.game.grid[toGrid(this.lastY)][toGrid(this.lastX)].unit = 0;
        }
        this.game.grid[toGrid(this.y)][toGrid(this.x)].unit = this.id;
        this.lastX = this.x;
        this.lastY = this.y;
        this.game.gridObj.debugGridShowProp('unit');
    }

    getAttackPos() {
        // Returns null if no attack is possible, otherwise returns the most recent
        // hovered endable position to make that attack

        // Can't attack if we're not over an enemy
        if (!this.isOpposingTeam(this.game.grid[toGrid(this.y)][toGrid(this.x)].unit)) {
            return null;
        }

        // Check if an attackable_from square is in this unit's hover history
        var attackableList = this.attackableFrom[toGrid(this.y)][toGrid(this.x)];
        // console.log(JSON.stringify(attackableList));
        for (var i = 0; i < this.hoverHistory.length; i++) {
            for (var j = 0; j < attackableList.length; j++) {
                if (this.hoverHistory[i].x === attackableList[j].x && this.hoverHistory[i].y === attackableList[j].y) {
                    // Found a square we can attack from!
                    return {x: attackableList[j].x, y: attackableList[j].y};
                }
            }
        }

        // No valid attackable squares for that enemy
        return null;
    }

    getAssistPos() {
        // Returns null if no assist is possible, otherwise returns the most recent
        // hovered endable position to make that assist

        // Can't assist if we're not over a friendly
        if (!this.isSameTeam(this.game.grid[toGrid(this.y)][toGrid(this.x)].unit)) {
            return null;
        }

        // Check if an attackable_from square is in this unit's hover history
        var assistableList = this.assistableFrom[toGrid(this.y)][toGrid(this.x)];
        // console.log(JSON.stringify(assistableList));
        for (var i = 0; i < this.hoverHistory.length; i++) {
            for (var j = 0; j < assistableList.length; j++) {
                if (this.hoverHistory[i].x === assistableList[j].x && this.hoverHistory[i].y === assistableList[j].y) {
                    // Found a square we can attack from!
                    return {x: assistableList[j].x, y: assistableList[j].y};
                }
            }
        }

        // No valid assistable squares for that enemy
        return null;
    }

    checkAllowedPos(moves) {
        // Checks that the current position is in a list of valid provided moves
        for (var i = 0, len = moves.length; i < len; i++) {
            if (moves[i].x === toGrid(this.x) && moves[i].y === toGrid(this.y)) {
                return true;
            }
        }
        return false;
    }

    preparePathfinder() {
        const unitCost = 10; // Some high number so we can't pass through other units
        // Add current player grid to game grid so that player tiles are impassable
        var tmpGrid = utils.createArray(this.game.maxGridY, this.game.maxGridX);
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                var spaceUnitCost = this.canPassUnit(this.game.grid[y][x].unit) ? 0 : unitCost;
                tmpGrid[y][x] = this.game.grid[y][x].terrain + spaceUnitCost;
            }
        }
        // Current position is always valid
        tmpGrid[toGrid(this.y)][toGrid(this.x)] = 1;
        this.game.pathfinder.setGrid(tmpGrid);
        this.setMovementType();
    }

    getValidMoves() {
        // Searches all possible tiles on the grid to determine whether there is a path to that tile
        // within the unit's movement range
        var posX = toGrid(this.x),
            posY = toGrid(this.y),
            validMoves = [];
        this.preparePathfinder();
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.pathCost = null;

                this.game.pathfinder.findPath(posX, posY, x, y, (path, cost) => {
                    this.pathCost = cost;
                    this.path = path;
                });

                // Only calculate if we didn't already find a trivial path
                if (this.pathCost === null) {
                    this.game.pathfinder.calculate();
                }

                // If the path found is within our movement, add it
                if (this.pathCost <= this.movement) {
                    validMoves.push({x: x, y: y});
                }
            }
        }
        return validMoves;
    }

    getValidEndPositions(moves) {
        // We can end in any space we can move to, but not those occupied by units (self is ok)
        var endPositions = [];
        moves.forEach((move) => {
            if (this.game.grid[move.y][move.x].unit === 0 || this.game.grid[move.y][move.x].unit === this.id) {
                endPositions.push({x: move.x, y: move.y});
            }
        });
        return endPositions;
    }

    getValidAttacks(validMoves, validEndPositons) {
        let moveableGrid = utils.gridFromList(validMoves, this.game.maxGridX, this.game.maxGridY, 1);
        let endableGrid = utils.gridFromList(validEndPositons, this.game.maxGridX, this.game.maxGridY, 1);

        // Ok, this might be a big hacky solution but here it is
        // We're going to build a grid where each element is a list of "attackable from" nodes
        // That is, if we can attack (1, 1) from (0, 1), we push {x: 0, y: 1} to a list at element [1][1]
        // That way, when we go to check an attack, we check if the user last hovered over an "attackable from" square
        // If so, then that's the square we place the character in after the attack

        // Note that there is an assumption here that a space CANNOT be both attackable and endable
        this.attackableFrom = utils.createArray(this.game.maxGridY, this.game.maxGridX);

        // console.log('moveable');
        // utils.printGrid(moveableGrid);
        // console.log('endable');
        // utils.printGrid(endableGrid);

        // Displays attack overlay at the edge of possible movements
        var validAttacks = [];
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.attackableFrom[y][x] = [];

                // Get all squares within range of current, check whether it is a movable
                if (endableGrid[y][x] !== 1) {
                    var candidates = utils.pairsWithinNSpaces(x, y, this.game.maxGridX, this.game.maxGridY,
                                                              this.weaponData.range);
                    var foundAttack = false;
                    for (var i = 0, len = candidates.length; i < len; i++) {
                        // If we can move to a spot that this spot is attackable from...
                        if (endableGrid[candidates[i].y][candidates[i].x] === 1) {
                            this.attackableFrom[y][x].push(candidates[i]);

                            // Don't show an attack overlay on any moveable square
                            // (i.e. ones we can move to/through, but not end on)
                            // Only push attackable space on first valid candidate
                            if (moveableGrid[y][x] !== 1 && !foundAttack) {
                                validAttacks.push({x: x, y: y});
                                foundAttack = true;
                            }
                        }
                    }
                }
            }
        }

        // console.log('attackable');
        // utils.printGrid(utils.gridFromList(validAttacks, this.game.maxGridX, this.game.maxGridY, 1));
        return validAttacks;
    }

    getValidAssists(validMoves, validEndPositons) {
        // Assists only show up if we have an assist skill equipped
        if (this.assist === null) {
            return [];
        }

        let moveableGrid = utils.gridFromList(validMoves, this.game.maxGridX, this.game.maxGridY, 1);
        let endableGrid = utils.gridFromList(validEndPositons, this.game.maxGridX, this.game.maxGridY, 1);

        var validAssists = [];
        this.assistableFrom = utils.createArray(this.game.maxGridY, this.game.maxGridX);
        // Assists only show up on valid FRIENDLY targets
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.assistableFrom[y][x] = [];

                // Get all squares within range of current, check whether it is a movable
                if (this.isSameTeam(this.game.grid[y][x].unit) === true) {
                    var candidates = utils.pairsWithinNSpaces(x, y, this.game.maxGridX, this.game.maxGridY,
                                                              this.assistRange);
                    var foundAssist = false;
                    for (var i = 0, len = candidates.length; i < len; i++) {
                        // If we can move to a spot that this spot is assistable from...
                        if (endableGrid[candidates[i].y][candidates[i].x] === 1) {
                            this.assistableFrom[y][x].push(candidates[i]);

                            // Don't show an attack overlay on any moveable square
                            // (i.e. ones we can move to/through, but not end on)
                            // Only push attackable space on first valid candidate
                            if (!foundAssist) {
                                validAssists.push({x: x, y: y});
                                foundAssist = true;
                            }
                        }
                    }
                }
            }
        }

        return validAssists;

        // EXCEPT when a unit has no attack equipped, then their assist range shows up as assist-colored
    }

    showMoveAttackOverlay() {
        this.validMoves.forEach((move) => {
            this.game.grid[move.y][move.x].showBlue();
        });
        this.validAttacks.forEach((attack) => {
            this.game.grid[attack.y][attack.x].showRed();
        });
        this.validAssists.forEach((attack) => {
            this.game.grid[attack.y][attack.x].showGreen();
        });
    }

    stopDrag() {
        // Forceably stops a drag
        this.input.disableDrag();
        this.input.enableDrag();
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

function toGrid(i) {
    return Math.floor(i / 90);
}

function fromGrid(i) {
    return (i * 90) + 45;
}