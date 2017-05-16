import * as utils from 'helpers/utils';

export class MovementAssister {
    constructor(game, assister, target, assistPos) {
        this.game = game;
        this.assister = assister;
        this.target = target;
        this.assistPos = assistPos;
    }

    movementAssist() {
        switch(this.assister.assist) {
            case 'Draw Back':
                return this.drawBack();
            case 'Pivot':
                return this.pivot();
            case 'Reposition':
                return this.reposition();
            case 'Shove':
                return this.shove();
            case 'Smite':
                return this.smite();
            case 'Swap':
                return this.swap();
            default:
                return false;
        }
    }

    drawBack() {
        // Assister pulls the target back one space
        let vec = utils.movementVector(this.assistPos, this.target, true);
        let assisterDestPos = {
            x: utils.toGrid(this.assistPos.x) + vec.x,
            y: utils.toGrid(this.assistPos.y) + vec.y
        };
        let assisterDest = this.game.grid[assisterDestPos.y][assisterDestPos.x];
        let targetDestPos = {
            x: utils.toGrid(this.assistPos.x),
            y: utils.toGrid(this.assistPos.y)
        };
        let targetDest = this.game.grid[targetDestPos.y][targetDestPos.x];

        // Check that both spaces are movable by the units
        // Ignore units for the target, since it'll be moving into the space
        //   currently occupied by the assister
        if ( utils.isMovable(this.assister, assisterDest) &&
             utils.isMovable(this.target, targetDest, true) ) {

            this.setUnitPos(this.assister, assisterDest);
            this.setUnitPos(this.target, targetDest);
            return true;
        } else {
            return false;
        }
    }

    pivot() {
        // Moves the assister to the space on the other side of the target
        let vec = utils.movementVector(this.assistPos, this.target, false);
        let assisterDestPos = {
            x: utils.toGrid(this.target.x) + vec.x,
            y: utils.toGrid(this.target.y) + vec.y
        };
        let assisterDest = this.game.grid[assisterDestPos.y][assisterDestPos.x];

        if (utils.isMovable(this.assister, assisterDest)) {
            this.setUnitPos(this.assister, assisterDest);
            return true;
        } else {
            return false;
        }
    }

    reposition() {
        // Suplex the target
        let vec = utils.movementVector(this.assistPos, this.target, true);
        let targetDestPos = {
            x: utils.toGrid(this.assistPos.x) + vec.x,
            y: utils.toGrid(this.assistPos.y) + vec.y
        };
        let targetDest = this.game.grid[targetDestPos.y][targetDestPos.x];

        if (utils.isMovable(this.target, targetDest)) {
            this.setUnitPos(this.target, targetDest);
        }
        return false;
    }

    smite() {
        // Pushes the target two spaces along the vector between the assister and the target
        // Stops early if the second space is not movable, but the first is
        let vec = utils.movementVector(this.assistPos, this.target, false);

        let targetDestPos = {
            x: utils.toGrid(this.target.x) + vec.x,
            y: utils.toGrid(this.target.y) + vec.y
        };
        let targetDest = this.game.grid[targetDestPos.y][targetDestPos.x];

        let targetDestPos2Squares = {
            x: utils.toGrid(this.target.x) + (2 * vec.x),
            y: utils.toGrid(this.target.y) + (2 * vec.y)
        };
        let targetDest2Squares = this.game.grid[targetDestPos2Squares.y][targetDestPos2Squares.x];

        // If the first space is a wall, not moving anywhere
        if (targetDest.isWall()) return false;

        // If the second space is not a wall, move to it if it is movable
        if (utils.isMovable(this.target, targetDest2Squares)) {
            this.setUnitPos(this.target, targetDest2Squares);
        }
        // Otherwise, move to the first space if it is movable
        else if (utils.isMovable(this.target, targetDest)) {
            this.setUnitPos(this.target, targetDest);
        }

        return false;
    }

    shove() {
        // Pushes the target one space along the vector between the assister and the target
        let vec = utils.movementVector(this.assistPos, this.target, false);
        let targetDestPos = {
            x: utils.toGrid(this.target.x) + vec.x,
            y: utils.toGrid(this.target.y) + vec.y
        };
        let targetDest = this.game.grid[targetDestPos.y][targetDestPos.x];
        if (utils.isMovable(this.target, targetDest)) {
            this.setUnitPos(this.target, targetDest);
        }
        return false;
    }

    swap() {
        // Set the target's position to the unit's, and the unit's to the target's
        let assisterDest = this.game.grid[utils.toGrid(this.target.y)][utils.toGrid(this.target.x)];
        let targetDest = this.game.grid[utils.toGrid(this.assistPos.y)][utils.toGrid(this.assistPos.x)];

        if ( utils.isMovable(this.assister, assisterDest, true) &&
             utils.isMovable(this.target, targetDest, true) ) {
            this.setUnitPos(this.assister, assisterDest);
            this.setUnitPos(this.target, targetDest);
            return true;
        } else {
            return false;
        }
    }

    setUnitPos(unit, gridPoint) {
        unit.x = utils.fromGrid(gridPoint.x);
        unit.y = utils.fromGrid(gridPoint.y);
        unit.updateUnitPosition();
    }
}