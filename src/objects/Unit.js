import * as utils from 'helpers/utils';
import { BattleCalc } from 'helpers/BattleCalculator';
import { assistInfo } from 'skills/assist';

export default class Unit extends Phaser.Sprite {

    constructor({game, gridX, gridY, movementType, attackRange, asset, type, id}) {
        super(game, 90 * gridX, 90 * gridY, asset);
        this.game = game;
        this.name = asset; // Not unique!
        this.id = id;
        this.movementType = movementType;
        this.attackRange = attackRange;
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
        }
        this.stats.totalhp = this.stats.hp;

        // Set up skills
        this.skills = {
            weapon: null,
            assist: null,
            special: null,
            Askill: null,
            Bskill: null,
            Cskill: null
        }

        this.dead = false;
        this.turnEnded = false;

        // Set up click/drag stuff
        this.inputEnabled = true;
        this.input.enableDrag();

        this.events.onDragStart.add(this.onDragStart, this);
        this.events.onDragStop.add(this.onDragStop, this);
        this.events.onInputDown.add(this.onClick, this);
        this.game.stage.addChild(this);

        this.hoverTarget = {x: null, y: null}

        this.dragging = false;

        // Healthbar
        var hbBG = this.game.add.graphics(-25.5, 40);
        hbBG.anchor.setTo(0.5);
        this.addChild(hbBG);
        hbBG.beginFill(0x000000);
        hbBG.lineStyle(6.5, 0x000000, 1);
        hbBG.moveTo(0,-5);
        hbBG.lineTo(51, -5);
        hbBG.endFill();

        this.healthbar = this.game.add.graphics(-25, 40);
        this.healthbar.anchor.setTo(0.5);
        this.addChild(this.healthbar);

        // Health text
        var style = { font: "12px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 }
        // this.healthbarText = this.game.add.text(-35, 37, this.stats.hp, style);
        var font = (this.isFriendly()) ? 'bluefont' : 'redfont';
        this.healthbarText = this.game.add.bitmapText(-35, 25, font, this.stats.hp, 30);
        this.healthbarText.anchor.setTo(0.5);
        this.addChild(this.healthbarText);

        // Type Icon
        this.typeIcon = this.game.add.sprite(-35, -35, 'types', this.type);
        this.typeIcon.anchor.setTo(0.5);
        this.typeIcon.scale.setTo(0.5);
        this.addChild(this.typeIcon);

        // Flip unit horizontally if on enemy team
        if (!this.isFriendly()) {
            this.scale.x = -1;
            this.healthbarText.scale.x = -1;
            this.healthbarText.x *= -1;
            this.healthbar.scale.x = -1;
            this.healthbar.x *= -1;
            hbBG.scale.x = -1;
            hbBG.x *= -1;
        }
    }

    stopDrag() {
        // Forceably stops a drag
        this.input.disableDrag();
        this.input.enableDrag();
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

                // this.clearSelectors(this.hoverTarget.x, this.hoverTarget.y);
                this.clearAllSelectors();
                this.hoverTarget = {x: toGrid(this.x), y: toGrid(this.y)}

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
                // if (this.isOpposingTeam(hoverUnit)) {
                if (attackPos !== null) {
                    var target = this.game.units[hoverUnit];
                    var battleResult = BattleCalc.dryRun(this, target);
                    this.game.grid[toGrid(this.y)][toGrid(this.x)].attackSelector.visible = true;
                    this.game.grid[attackPos.y][attackPos.x].moveSelector.visible = true;
                    this.game.displayBattleText(this, target, battleResult);
                } else {
                    this.game.clearBattleText();
                    this.game.grid[toGrid(this.y)][toGrid(this.x)].moveSelector.visible = true;
                }
            }
        }

        // Handle redrawing HP bar when health changes
        if (this.stats._lasthp !== this.stats.hp) {
            this.redrawHPBar();

            if (this.stats.hp <= 0) {
                // Remove from game (set invisible and clear from grid)
                console.log(this.name + ' is dead!');
                this.visible = false;
                this.game.grid[toGrid(this.y)][toGrid(this.x)].unit = 0;
            }
        }
    }

    endTurn() {
        this.turnEnded = true;
        // Grey out the sprite
        this.tint = 0x888888;
        this.input.disableDrag();
    }

    startTurn() {
        this.turnEnded = false;
        // Undo grey
        this.tint = 0xffffff;
        this.input.enableDrag();
    }

    clearSelectors(x, y) {
        this.game.grid[y][x].attackSelector.visible = false;
        this.game.grid[y][x].moveSelector.visible = false;
        this.game.grid[y][x].assistSelector.visible = false;
    }

    clearAllSelectors() {
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.game.grid[y][x].attackSelector.visible = false;
                this.game.grid[y][x].moveSelector.visible = false;
                this.game.grid[y][x].assistSelector.visible = false;
            }
        }
    }

    redrawHPBar() {
        this.healthbar.clear();
        var x = (this.stats.hp / this.stats.totalhp) * 100;
        var colour = utils.rgbToHex((x > 50 ? 1-2*(x-50)/100.0 : 1.0) * 255, (x > 50 ? 1.0 : 2*x/100.0) * 255, 0);
        colour = (this.isFriendly()) ? 0x64d2ea : 0xcf5568
        this.healthbar.beginFill(colour);
        this.healthbar.lineStyle(5, colour, 1);
        this.healthbar.moveTo(0,-5);
        this.healthbar.lineTo(50 * this.stats.hp / this.stats.totalhp, -5);
        this.healthbar.endFill();

        this.stats._lasthp = this.stats.hp;
        this.healthbarText.text = this.stats.hp;
    }

    setMovementType() {
        switch(this.movementType) {
            case 'infantry':
                this.game.pathfinder.setAcceptableTiles([1,2]);
                this.game.pathfinder.setTileCost(1, 1);
                this.game.pathfinder.setTileCost(2, 2);
                this.movement = 2;
                break;
            case 'cavalry':
                this.game.pathfinder.setAcceptableTiles([1]);
                this.game.pathfinder.setTileCost(1, 1);
                this.movement = 3;
                break;
            case 'armor':
                this.game.pathfinder.setAcceptableTiles([1,2]);
                this.game.pathfinder.setTileCost(1, 1);
                this.game.pathfinder.setTileCost(2, 1);
                this.movement = 1;
                break;
            case 'flying':
                this.game.pathfinder.setAcceptableTiles([1,2,3]);
                this.game.pathfinder.setTileCost(1, 1);
                this.game.pathfinder.setTileCost(2, 1);
                this.game.pathfinder.setTileCost(3, 1);
                this.movement = 2;
                break;
        }
    }

    setAttackRange() {
        this.attackRange = utils.attackRangeLookup(this.type);
    }

    snapToGrid() {
        this.x = toGrid(this.x) * 90 + 45;
        this.y = toGrid(this.y) * 90 + 45;
    }

    attack(target) {
        BattleCalc.run(this, target);
    }

    assist(target, assistPos) {
        // Return true if all the movement/repositioning effects for THIS UNIT happened during this method
        switch(this.skills.assist) {
            case 'swap':
                console.log('swapping');
                // Set the target's position to the unit's, and the unit's to the target's
                var targetPos = {x: target.x, y: target.y}
                target.x = fromGrid(assistPos.x);
                target.y = fromGrid(assistPos.y);
                target.updateUnitPosition();

                this.x = targetPos.x;
                this.y = targetPos.y;
                this.updateUnitPosition();
                return true;
            default:
                return false;
        }
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
        this.hoverTarget = {x: toGrid(this.x), y: toGrid(this.y)}
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
        this.hoverTarget = {x: null, y: null}

        // If we drag off the map, reset (failsafe for if this check in update doesn't catch it)
        if (toGrid(this.x) >= this.game.maxGridX ||
            toGrid(this.x) < 0 ||
            toGrid(this.y) >= this.game.maxGridY ||
            toGrid(this.y) < 0) {
            this.x = this.lastX;
            this.y = this.lastY;
        }

        this.snapToGrid();
        this.hideMoves();
        this.clearAllSelectors();

        // If we are back where we started, don't end the turn
        if (toGrid(this.x) === toGrid(this.lastX) && toGrid(this.y) === toGrid(this.lastY)) {
            return;
        }

        // If we selected an attack, run the battle, then place us in the correct attack position
        var attackPos = this.getAttackPos();
        if (attackPos !== null) {
            console.log('attacking!')
            var target = this.game.grid[toGrid(this.y)][toGrid(this.x)].unit;
            console.log(this.name + ' is attacking ' + this.game.units[target].name);
            this.attack(this.game.units[target]);

            this.x = fromGrid(attackPos.x);
            this.y = fromGrid(attackPos.y);
        }
        var assistPos = this.getAssistPos();
        if (assistPos !== null) {
            console.log('assisting!');
            var target = this.game.grid[toGrid(this.y)][toGrid(this.x)].unit;
            console.log(this.name + ' is assisting ' + this.game.units[target].name);
            var handledMove = this.assist(this.game.units[target], assistPos);

            // Some assists reposition us. If that one did not, then move to assisting position
            if (handledMove === false) {
                this.x = fromGrid(assistPos.x);
                this.y = fromGrid(assistPos.y);
            }
        }
        // If not an attack and not a valid move, reset to last position, don't end turn
        else if (!this.checkAllowedPos(this.validEndPositons)) {
            console.log('Destination not allowed!');
            this.x = this.lastX;
            this.y = this.lastY;
            return;
        }

        // If we attacked, assisted, or moved, we need to update the unit's position in the grid, then end the turn
        this.updateUnitPosition();
        this.validMoves = null;
        this.validEndPositons = null;
        this.validAttacks = null;
        this.endTurn();

        // DEBUG
        // this.debugGameGrid('unit');
    }

    updateUnitPosition() {
        // Check to make sure that the last position equals this unit's ID, and zero it out
        // This will NOT be true if another unit moves into this unit's previous space, which is OK
        if (this.game.grid[toGrid(this.lastY)][toGrid(this.lastX)].unit === this.id) {
            this.game.grid[toGrid(this.lastY)][toGrid(this.lastX)].unit = 0;
        }
        this.game.grid[toGrid(this.y)][toGrid(this.x)].unit = this.id;
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
                    return {x: attackableList[j].x, y: attackableList[j].y}
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
                    return {x: assistableList[j].x, y: assistableList[j].y}
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

    canPassUnit(unitID) {
        return !this.isOpposingTeam(unitID);
    }

    getValidMoves() {
        // Searches all possible tiles on the grid to determine whether ther eis a path to that tile
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
                                                              this.attackRange);
                    var foundAttack = false;
                    for (var i = 0, len = candidates.length; i < len; i++) {
                        // If we can move to a spot that this spot is attackable from...
                        if (endableGrid[candidates[i].y][candidates[i].x] === 1) {
                            this.attackableFrom[y][x].push(candidates[i]);

                            // Don't show an attack overlay on any moveable square
                            // (i.e. ones we can move to/through, but not end on)
                            // Only push attackable space on first valid candidate
                            if (moveableGrid[y][x] !== 1 && !foundAttack) {
                                validAttacks.push({x: x, y: y})
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
        if (this.skills.assist == null) {
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
                                validAssists.push({x: x, y: y})
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
            this.game.grid[move.y][move.x].blueOverlay.visible = true;
        });
        this.validAttacks.forEach((attack) => {
            this.game.grid[attack.y][attack.x].redOverlay.visible = true;
        });
        this.validAssists.forEach((attack) => {
            this.game.grid[attack.y][attack.x].greenOverlay.visible = true;
        });
    }

    hideMoves() {
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.game.grid[y][x].blueOverlay.visible = false
                this.game.grid[y][x].redOverlay.visible = false
                this.game.grid[y][x].greenOverlay.visible = false
            }
        }
    }

    debugGridShow(grid) {
        var state = game.state.getCurrentState();
        state.debugGridShow(grid);
    }

    debugGameGrid(prop) {
        var tmpGrid = utils.createArray(this.game.maxGridY, this.game.maxGridX);
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                tmpGrid[y][x] = this.game.grid[y][x][prop];
            }
        }
        this.debugGridShow(tmpGrid);
    }

    debugGridOff() {
        var state = game.state.getCurrentState();
        state.debugGridOff();
    }
}

function toGrid(i) {
    return Math.floor(i / 90);
}

function fromGrid(i) {
    return (i * 90) + 45;
}