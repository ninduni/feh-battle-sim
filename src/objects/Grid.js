/**
* The master GRID class
*
* Contains a bunch of methods for interacting with the game grid, or objects that appear repeated on each tile,
* such as overlays and selectors.
*
* Also handles some pathfinding functionality.
*
**/
import Tile from 'objects/Tile';
import { createArray } from 'helpers/utils';

export default class Grid {
    constructor(game, add, terrainMap, maxGridX, maxGridY) {
        this.game = game;
        this.add = add; // The game object factory
        this.maxGridX = maxGridX;
        this.maxGridY = maxGridY;

        this.map = createArray(this.game.maxGridY, this.game.maxGridX);

        // Create sprites that live on every grid square
        // We're doing it this way so that we don't have to create/destroy new sprites all the time, but it may
        // cost more to place them all at once like this.

        this.overlays = {
            blueOverlayGroup: add.group(),
            redOverlayGroup: add.group(),
            greenOverlayGroup: add.group(),
            attackSelectorGroup: add.group(),
            moveSelectorGroup: add.group(),
            assistSelectorGroup: add.group(),
            debugGridGroup: add.group()
        };

        this.terrainMap = this.parseTerrainMap(terrainMap);
        console.log(this.terrainMap);

        for (var x = 0; x < this.maxGridX; x++) {
            for (var y = 0; y < this.maxGridY; y++) {
                this.map[y][x] = new Tile(game, x, y, this.terrainMap[y][x], this.overlays);
            }
        }

        this.typeLookup = {
            0: 'wall', // Impassible wall
            1: 'plains',
            2: 'forest',
            3: 'mountain',
            4: 'water',
            5: 'fort',
            // Instantiates a wall, afterwards broken behaves as plains
            8: 'breakable1', // 1 HP
            9: 'breakable2'  // 2 HP
        };
        this.reverseLookup = {
            'wall': 0, // Impassible wall
            'plains': 1,
            'forest': 2,
            'mountain': 3,
            'water': 4,
            'fort': 5,
            // Instantiates a wall, afterwards broken behaves as plains
            'breakable1': 8, // 1 HP
            'breakable2': 9  // 2 HP
        };
    }

    parseTerrainMap(terrainMap) {
        // Turns an easy-to-write list of digit strings into a 2D array
        return terrainMap.map((row) => row.split('').map((x) => parseInt(x)));
    }

    hideAll() {
        this.applyToGrid((tile) => {
            tile.hideOverlay();
            tile.hideSelectors();
        });
    }

    hideOverlay() {
        this.applyToGrid((tile) => tile.hideOverlay());
    }

    hideSelectors() {
        this.applyToGrid((tile) => tile.hideSelectors());
    }

    debugGridShowProp(prop) {
        this.applyToGrid((tile) => tile.showDebugText(tile[prop]));
        this.game.world.bringToTop(this.overlays.debugGridGroup);
    }

    debugGridShow(grid) {
        this.applyToGrid((tile, x, y) => tile.showDebugText(grid[y][x]));
        this.game.world.bringToTop(this.overlays.debugGridGroup);
    }

    debugGridOff() {
        this.applyToGrid((tile) => tile.hideDebugText());
    }

    borderGridToggle() {
        this.applyToGrid((tile) => tile.border.visible = !tile.border.visible);
    }

    applyToGrid(func) {
        // Applies a func that takes a tile as an argument to each tile in the grid
        for (var x = 0; x < this.maxGridX; x++) {
            for (var y = 0; y < this.maxGridY; y++) {
                func(this.map[y][x], x, y);
            }
        }
    }
}