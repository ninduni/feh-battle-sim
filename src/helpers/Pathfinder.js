import { game } from 'index';
import * as utils from 'helpers/utils';

export default class Pathfinder {
    constructor() {
        // The pathfinder object that allows units to path around the map
        // Since we only check unit movement serially, we can just use a single
        // object to save some memory.
        this.pathfinder = new EasyStar.js();
    }

    setTileCosts(type) {
        let tileCosts = {1: 1, 5: 1, 9: 1};
        switch(type) {
            case 'Infantry':
                tileCosts[2] = 2;
                break;
            case 'Cavalry':
                // No special movement tiles
                break;
            case 'Armor':
                tileCosts[2] = 1;
                break;
            case 'Flying':
                tileCosts[2] = 1;
                tileCosts[3] = 1;
                tileCosts[4] = 1;
                break;
        }
        let acceptableTiles = _.map(_.keys(tileCosts), (k) => parseInt(k));
        this.pathfinder.setAcceptableTiles(acceptableTiles);
        _.forIn(tileCosts, (value, key) => {
            this.pathfinder.setTileCost(key, value);
        });
    }

    prepare(sprite) {
        const unitCost = 10; // Some high number so we can't pass through other units
        // Add current player grid to game grid so that player tiles are impassable
        var tmpGrid = utils.createArray(game.maxGridY, game.maxGridX);
        for (var x = 0; x < game.maxGridX; x++) {
            for (var y = 0; y < game.maxGridY; y++) {
                let spaceUnitCost = sprite.unit.canPassUnit(game.grid[y][x].unit) ? 0 : unitCost;
                tmpGrid[y][x] = game.grid[y][x].terrain + spaceUnitCost;
            }
        }
        // Current position is always valid
        tmpGrid[sprite.unit.y][sprite.unit.x] = 1;
        this.pathfinder.setGrid(tmpGrid);
        this.setTileCosts(sprite.unit.movementType);
    }

    findPath(startX, startY, endX, endY, callback) {
        this.pathfinder.findPath(startX, startY, endX, endY, callback);
    }

    calculate() {
        this.pathfinder.calculate();
    }
}