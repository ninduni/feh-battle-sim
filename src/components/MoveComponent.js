import { game } from 'index';
import * as utils from 'helpers/utils';

export default class MoveComponent extends Phaser.Sprite {
    // Since this class will control the actual x/y position of the sprite, it
    // will call the phaser sprite super constructor and actually instantiate
    // the visual component of the unit

    // This class will also be responsible for converting between canvas pixels
    // and grid x/y, such that the parent unit never sees absolute pixels

    constructor(unit, asset, gridX, gridY) {
        let x = fromGrid(gridX);
        let y = fromGrid(gridY);
        super(game, x, y, asset);

        this.anchor.setTo(0.5, (this.height - 45.0) / this.height);

        this.x = x;
        this.y = y;

        this.unit = unit;

        this.dragging = false;
        this.hoverTarget = {x: null, y: null};

        this.attackRange = null;
        this.assistRange = null;
        this.movement = null;
        this.movementType = null;

        // Set up click/drag stuff
        this.inputEnabled = true;
        this.input.enableDrag();

        this.events.onDragStart.add(this.onDragStart, this);
        this.events.onDragStop.add(this.onDragStop, this);
        this.events.onInputDown.add(this.onClick, this);
        this.game.stage.addChild(this);
    }

    flip() {
        // Mirrors the sprite
        this.scale.x = -1;
    }

    setMovementType(type) {
        this.movementType = type;

        var tileCosts = {1: 1, 5: 1, 9: 1};
        switch(this.movementType) {

            case 'Infantry':
                tileCosts[2] = 2;
                this.movement = 2;
                break;
            case 'Cavalry':
                this.movement = 3;
                break;
            case 'Armor':
                tileCosts[2] = 1;
                this.movement = 1;
                break;
            case 'Flying':
                tileCosts[3] = 1;
                tileCosts[4] = 1;
                this.movement = 2;
                break;
        }
        let acceptableTiles = _.map(_.keys(tileCosts), (k) => parseInt(k));
        game.pathfinder.setAcceptableTiles(acceptableTiles);
        _.forIn(tileCosts, (value, key) => {
            game.pathfinder.setTileCost(key, value);
        });
    }

    onDragStart() {
        // Can't drag if not your turn
        if (game.isFriendlyTurn !== this.unit.isFriendly()) {
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

        this.showMoveAttackOverlay();

        this.lastX = this.x;
        this.lastY = this.y;
    }

    onDragStop() {
        this.dragging = false;
        this.hoverTarget = {x: null, y: null};

        // If we drag off the map, reset (failsafe for if this check in update doesn't catch it)
        if (toGrid(this.x) >= game.maxGridX ||
            toGrid(this.x) < 0 ||
            toGrid(this.y) >= game.maxGridY ||
            toGrid(this.y) < 0) {
            this.x = this.lastX;
            this.y = this.lastY;
        }

        this.snapToGrid();
        // Hide all selectors and overlay
        game.gridObj.hideAll();

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
            target = game.grid[toGrid(this.y)][toGrid(this.x)].unit;
            console.log(this.name + ' is attacking ' + game.units[target].name);
            // Move to attack position first
            this.x = fromGrid(attackPos.x);
            this.y = fromGrid(attackPos.y);

            this.unit.attack(game.units[target], attackPos);
        }
        else if (assistPos !== null) {
            console.log('assisting!');
            target = game.grid[toGrid(this.y)][toGrid(this.x)].unit;
            console.log(this.name + ' is assisting ' + game.units[target].name);

            this.x = fromGrid(assistPos.x);
            this.y = fromGrid(assistPos.y);

            this.unit.doAssist(game.units[target], assistPos);
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
        console.log(this.validAttacks);
        // Possible GC help?
        this.validEndPositons = null;
        this.validMoves = null;
        this.validAttacks = null;
        this.validAssists = null;

        this.unit.endTurn();

        // DEBUG
        // game.gridObj.debugGridShowProp('unit');
    }

    snapToGrid() {
        // Moves from current x/y to nearest grid square
        this.x = toGrid(this.x) * 90 + 45;
        this.y = toGrid(this.y) * 90 + 45;
    }

    update() {
        // Handle hover effects when unit is being dragged
        if (this.dragging === true) {
            // If target has changed...
            if (this.hoverTarget.x !== toGrid(this.x) || this.hoverTarget.y !== toGrid(this.y)) {

                // If we drag off the map, reset
                if (toGrid(this.x) >= game.maxGridX ||
                    toGrid(this.x) < 0 ||
                    toGrid(this.y) >= game.maxGridY ||
                    toGrid(this.y) < 0) {
                    console.log('out of bounds!');
                    this.x = this.lastX;
                    this.y = this.lastY;
                    this.stopDrag();
                    this.onDragStop();
                }

                game.gridObj.hideSelectors();
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

                var hoverUnit = game.grid[toGrid(this.y)][toGrid(this.x)].unit;

                // Check if we're over an enemy and draw combat stats
                var attackPos = this.getAttackPos();
                console.log(attackPos);
                if (attackPos !== null) {
                    var target = game.units[hoverUnit];

                    this.combatPos = attackPos;
                    // target.combatPos = {x: toGrid(target.x), y: toGrid(target.y)};

                    this.unit.dryRunAttack(target, attackPos);

                    game.grid[toGrid(this.y)][toGrid(this.x)].showAttack();
                    game.grid[attackPos.y][attackPos.x].showMove();

                } else {
                    this.unit.clearBattleText();
                    game.grid[toGrid(this.y)][toGrid(this.x)].showMove();
                }
            }
        }

        // We're going to add some more UI components to this, so call update on our children
        _.forEach(this.children, (c) => c.update());
    }

    onClick() {
        game.unitSelect(this.unit.id);
    }

    setUnitPos(x, y) {
        // Given grid coords, set absolute coords
        this.x = fromGrid(x);
        this.y = fromGrid(y);
        this.updateUnitPosition();
    }

    updateUnitPosition() {
        // Set superclass x/y
        this.unit.x = toGrid(this.x);
        this.unit.y = toGrid(this.y);
        this.unit.updateUnitPosition();
    }

    getAttackPos() {
        // Returns null if no attack is possible, otherwise returns the most recent
        // hovered endable position to make that attack

        // Can't attack if we're not over an enemy
        if (!this.unit.isOpposingTeam(game.grid[toGrid(this.y)][toGrid(this.x)].unit)) {
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
        if (!this.unit.isSameTeam(game.grid[toGrid(this.y)][toGrid(this.x)].unit)) {
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
        var tmpGrid = utils.createArray(game.maxGridY, game.maxGridX);
        for (var x = 0; x < game.maxGridX; x++) {
            for (var y = 0; y < game.maxGridY; y++) {
                var spaceUnitCost = this.unit.canPassUnit(game.grid[y][x].unit) ? 0 : unitCost;
                tmpGrid[y][x] = game.grid[y][x].terrain + spaceUnitCost;
            }
        }
        // Current position is always valid
        tmpGrid[toGrid(this.y)][toGrid(this.x)] = 1;
        game.pathfinder.setGrid(tmpGrid);
        this.setMovementType(this.movementType);
    }

    getValidMoves() {
        // Searches all possible tiles on the grid to determine whether there is a path to that tile
        // within the unit's movement range
        var posX = toGrid(this.x),
            posY = toGrid(this.y),
            validMoves = [];
        this.preparePathfinder();
        for (var x = 0; x < game.maxGridX; x++) {
            for (var y = 0; y < game.maxGridY; y++) {
                this.pathCost = null;

                game.pathfinder.findPath(posX, posY, x, y, (path, cost) => {
                    this.pathCost = cost;
                    this.path = path;
                });

                // Only calculate if we didn't already find a trivial path
                if (this.pathCost === null) {
                    game.pathfinder.calculate();
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
            if (game.grid[move.y][move.x].unit === 0 || game.grid[move.y][move.x].unit === this.unit.id) {
                endPositions.push({x: move.x, y: move.y});
            }
        });
        return endPositions;
    }

    getValidAttacks(validMoves, validEndPositons) {
        let moveableGrid = utils.gridFromList(validMoves, game.maxGridX, game.maxGridY, 1);
        let endableGrid = utils.gridFromList(validEndPositons, game.maxGridX, game.maxGridY, 1);

        // Ok, this might be a big hacky solution but here it is
        // We're going to build a grid where each element is a list of "attackable from" nodes
        // That is, if we can attack (1, 1) from (0, 1), we push {x: 0, y: 1} to a list at element [1][1]
        // That way, when we go to check an attack, we check if the user last hovered over an "attackable from" square
        // If so, then that's the square we place the character in after the attack

        // Note that there is an assumption here that a space CANNOT be both attackable and endable
        this.attackableFrom = utils.createArray(game.maxGridY, game.maxGridX);

        // console.log('moveable');
        // utils.printGrid(moveableGrid);
        // console.log('endable');
        // utils.printGrid(endableGrid);

        // Displays attack overlay at the edge of possible movements
        var validAttacks = [];
        for (var x = 0; x < game.maxGridX; x++) {
            for (var y = 0; y < game.maxGridY; y++) {
                this.attackableFrom[y][x] = [];

                // Get all squares within range of current, check whether it is a movable
                if (endableGrid[y][x] !== 1) {
                    var candidates = utils.pairsWithinNSpaces(x, y, game.maxGridX, game.maxGridY,
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
                                validAttacks.push({x: x, y: y});
                                foundAttack = true;
                            }
                        }
                    }
                }
            }
        }

        // console.log('attackable');
        // utils.printGrid(utils.gridFromList(validAttacks, game.maxGridX, game.maxGridY, 1));
        return validAttacks;
    }

    getValidAssists(validMoves, validEndPositons) {
        // Assists only show up if we have an assist skill equipped
        if (!this.assistRange) {
            return [];
        }

        let moveableGrid = utils.gridFromList(validMoves, game.maxGridX, game.maxGridY, 1);
        let endableGrid = utils.gridFromList(validEndPositons, game.maxGridX, game.maxGridY, 1);

        var validAssists = [];
        this.assistableFrom = utils.createArray(game.maxGridY, game.maxGridX);
        // Assists only show up on valid FRIENDLY targets
        for (var x = 0; x < game.maxGridX; x++) {
            for (var y = 0; y < game.maxGridY; y++) {
                this.assistableFrom[y][x] = [];

                // Get all squares within range of current, check whether it is a movable
                if (this.unit.isSameTeam(game.grid[y][x].unit) === true) {
                    var candidates = utils.pairsWithinNSpaces(x, y, game.maxGridX, game.maxGridY,
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
            game.grid[move.y][move.x].showBlue();
        });
        this.validAttacks.forEach((attack) => {
            game.grid[attack.y][attack.x].showRed();
        });
        this.validAssists.forEach((attack) => {
            game.grid[attack.y][attack.x].showGreen();
        });
    }

    stopDrag() {
        // Forceably stops a drag
        this.input.disableDrag();
        this.input.enableDrag();
    }
}

function toGrid(i) {
    return Math.floor(i / 90);
}

function fromGrid(i) {
    return (i * 90) + 45;
}