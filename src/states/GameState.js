import { game } from 'index';
import Unit from 'objects/Unit';
import Wall from 'objects/Wall';
import Grid from 'objects/Grid';
import { createArray } from 'helpers/utils';
import { mapInfo } from 'data/maps';
import * as utils from 'helpers/utils';
import Pathfinder from 'helpers/Pathfinder';

class GameState extends Phaser.State {

    create() {
        // Instantiate the pathfinder
        game.pathfinder = new Pathfinder();

        // Set up map and virtual grid
        game.map = this.add.sprite(0, 0, 'maps', mapInfo.start.frame);
        game.maxGridX = 540 / 90;
        game.maxGridY = 720 / 90;

        // Lookup table for unit ID -> unit object
        game.units = {};

        // Initialize game grid
        game.terrainGrid = mapInfo.start.terrain;
        // Global grid object stores data about many things related to each square
        game.gridObj = new Grid(game, this.add, game.terrainGrid, game.maxGridX, game.maxGridY);
        // Slightly shorter lookup function
        game.grid = game.gridObj.map;

        // Save turn history
        game.history = [];

        // End-turn UI setup
        this.initEndTurnUI();

        // DEMO STUFF
        // this.populateDemoUnits();

        // Flag whether we're currently placing a unit
        this.placingUnit = null;

        // Fire off initial game state
        this.saveTurnState('-- Beginning of match --');
    }

    initEndTurnUI() {
        this.add.sprite(0, 720, 'bottom_bar');
        let endTurnBtn = this.add.button(50, 723, 'end_turn', this.endTurnBtnClickHandler, this, 0, 1, 1);

        game.isPlayerTurn = true; // Friendly here just refers to blue team
        game.enemyPhaseBanner = this.add.sprite(0, 0, 'enemy_phase');
        game.playerPhaseBanner = this.add.sprite(0, 0, 'player_phase');
        game.enemyPhaseBanner.alpha = 0;
        game.playerPhaseBanner.alpha = 0;

        let style = { font: "25px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 };
        game.turnText = game.add.text(200, 735, 'Player Phase', style);
    }

    update() {

    }

    addUnit(idx, manual=true, pos=null) {
        // If manual = true, we allow manual placement of the new unit
        if (manual) {
            console.log('placing unit');
            this.placingUnit = idx;
            game.input.onTap.add(this.manualPlace, this);
        } else {
            this.placeUnit(idx, pos);
        }
    }

    manualPlace(pointer) {
        // Validate click location
        let pointerGridX = utils.toGrid(pointer.position.x);
        let pointerGridY = utils.toGrid(pointer.position.y);
        if ((pointerGridX > 0) && (pointerGridX < game.maxGridX) &&
                (pointerGridX > 0) && (pointerGridY < game.maxGridY)) {
            game.input.onTap.remove(this.manualPlace, this);
            this.placeUnit(this.placingUnit, {x: pointerGridX, y: pointerGridY});
            this.placingUnit = null;
        } else {
            console.log('Invalid unit placement');
        }
    }

    placeUnit(idx, pos) {
        let unit = new Unit({gridX: pos.x, gridY: pos.y,
                 movementType: 'Infantry',
                 name: 'Unit ' + idx,
                 asset: 'anna',
                 type: 'sword',
                 id: idx});
        game.grid[pos.y][pos.x].unit = unit.id;
        game.units[unit.id] = unit;
        unit.stats = _.extend(unit.stats, { hp: 10, totalhp: 10, atk: 0, spd: 0, def: 0, res: 0 });
    }

    resetMap(mapName) {
        // Remove all units
        _.values(game.units).forEach((unit) => {
            if (unit instanceof Wall) {
                unit.destroy();
            } else {
                unit.sprite.destroy();
            }
        });
        game.units = {};
        // Reset history
        game.history = [];
        // Fetch the terrain grid and generate a new grid object
        game.terrainGrid = mapInfo[mapName].terrain;
        game.map.frame = mapInfo[mapName].frame;
        game.gridObj = new Grid(game, this.add, game.terrainGrid, game.maxGridX, game.maxGridY);
        game.grid = game.gridObj.map;
    }

    populateDemoUnits() {
        // Add units
        let anna = new Unit({gridX: 1, gridY: 6,
                             movementType: 'Infantry',
                             name: 'Anna',
                             asset: 'anna',
                             type: 'axe',
                             id: 1});
        anna.weapon = 'Silver Axe';
        anna.assist = 'Swap';
        anna.special = 'Rising Light';
        game.anna = anna;
        game.grid[6][1].unit = anna.id;
        game.units[anna.id] = anna;
        anna.stats = _.extend(anna.stats, { hp: 41, totalhp: 41, atk: 45, spd: 38, def: 22, res: 28 });

        let zach = new Unit({gridX: 2, gridY: 6,
                             movementType: 'Cavalry',
                             name: 'Zach',
                             asset: 'zach',
                             type: 'blueTome',
                             id: 2});
        zach.weapon = 'Thoron';
        game.zach = zach;
        game.grid[6][2].unit = zach.id;
        game.units[zach.id] = zach;
        zach.stats = _.extend(zach.stats, { hp: 35, totalhp:35, atk: 39, spd: 32, def: 19, res: 30 });

        let draug = new Unit({gridX: 3, gridY: 4,
                             movementType: 'Armor',
                             name: 'Draug',
                             asset: 'draug',
                             type: 'sword',
                             id: 5});
        draug.weapon = 'Brave Sword';
        game.draug = draug;
        game.grid[4][3].unit = draug.id;
        game.units[draug.id] = draug;
        draug.stats = _.extend(draug.stats, { hp: 50, totalhp: 50, atk: 38, spd: 27, def: 39, res: 18 });

        let caeda = new Unit({gridX: 2, gridY: 5,
                             movementType: 'Flying',
                             name: 'Caeda',
                             asset: 'caeda',
                             type: 'sword',
                             id: 6});
        caeda.weapon = 'Armorslayer+';
        game.caeda = caeda;
        game.grid[5][2].unit = caeda.id;
        game.units[caeda.id] = caeda;
        caeda.stats = _.extend(caeda.stats, { hp: 36, totalhp: 36, atk: 37, spd: 37, def: 24, res: 34 });
    }

    endTurnBtnClickHandler() {
        this.endTurn();
    }

    endTurn() {
        game.isPlayerTurn = !game.isPlayerTurn;
        let banner = (game.isPlayerTurn) ? game.playerPhaseBanner : game.enemyPhaseBanner;
        banner.bringToTop();
        // Show phase change banner
        game.add.tween(banner).to( { alpha: 1 }, 200, Phaser.Easing.Exponential.Out, true, 0, 0, true);

        // Reset all units on the given team
        _.values(game.units).forEach((unit) => {
            if (unit.isPlayer() === game.isPlayerTurn) {
                unit.startTurn();
            }
        });

        game.turnText.text = (game.isPlayerTurn) ? 'Player Phase' : 'Enemy Phase';

        this.saveTurnState('-- ' + game.turnText.text + ' --');
    }

    saveTurnState(string) {
        // Saves the state of a turn, so that it can be rewound to later
        // For this we need:
        //   1. The HP of all units
        //   2. The (bonus) stats of all units
        //   3. The position of all units
        //   4. The turn state of all units
        //   5. The special charge status of all units
        // Given ONLY these, we can recreate the board state at a previous time
        // This method saves the state of all units on the board, and is meant to be called when something would
        //  update one of these, such as a unit moving.

        var histObj = {
            units: {},
            string: string,
            isPlayerTurn: game.isPlayerTurn
        };

        _.keys(game.units).sort().forEach((k) => {
            histObj.units[k] = {
                stats: _.clone(game.units[k].stats),
                x: game.units[k].x,
                y: game.units[k].y,
                turnEnded: game.units[k].turnEnded
            };
        });

        game.history.push(histObj);
        game.updateTurnHistory();
    }

    loadTurnState(idx) {
        var histObj = game.history[idx];

        // Reload all the things from the history object
        _.forOwn(histObj.units, (histUnit, key) => {
            var unit = game.units[key];
            unit.stats = _.clone(histUnit.stats);
            unit.lastX = unit.x;
            unit.lastY = unit.y;
            unit.x = histUnit.x;
            unit.y = histUnit.y;
            unit.updateUnitPosition();

            if (histUnit.turnEnded) {
                unit.setTurnEnd();
            } else if (histUnit.turnEnded !== undefined) {
                unit.setTurnStart();
            }
        });

        // Sets the current turn correctly
        game.isPlayerTurn = histObj.isPlayerTurn;

        // Deletes all history after the selected one
        game.history = _.dropRight(game.history, game.history.length - idx - 1);
        game.updateTurnHistory();

        // DEBUG
        // game.gridObj.debugGridShowProp('unit');
    }
}

export default GameState;
