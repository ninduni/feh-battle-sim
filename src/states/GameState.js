import Unit from 'objects/Unit';
import Wall from 'objects/Wall';
import Grid from 'objects/Grid';
import { createArray } from 'helpers/utils';
import { assistInfo } from 'skills/assist';
import { weaponInfo } from 'skills/weapon';
import { skillInfo } from 'skills/skills';
import { mapInfo } from 'helpers/maps';

window.weaponInfo = weaponInfo;
window.Wall = Wall;
class GameState extends Phaser.State {

    create() {
        // Instantiate the pathfinder
        var pathfinder = new EasyStar.js();
        this.game.pathfinder = pathfinder;

        // Set up map and virtual grid
        this.game.map = this.add.sprite(0, 0, 'maps', 3);
        this.game.maxGridX = 540 / 90;
        this.game.maxGridY = 720 / 90;
        // Numerical representation of map terrain
        // 1 = normal; 2 = forest; 3 = mountain/ocean; 0 = impassible
        this.game.terrainGrid = [
            [1,1,1,1,1,1],
            [2,0,2,1,1,1],
            [0,0,0,1,1,1],
            [2,0,1,1,1,1],
            [1,0,1,1,0,1],
            [1,1,4,1,0,2],
            [1,1,1,0,0,0],
            [1,1,1,2,0,2]
        ];
        this.game.terrainGrid = mapInfo.start;

        // Global grid object stores data about many things related to each square
        this.game.gridObj = new Grid(game, this.add, this.game.terrainGrid, this.game.maxGridX, this.game.maxGridY);
        // Slightly shorter lookup function
        this.game.grid = this.game.gridObj.map;

        // Save turn history
        this.game.history = [];

        // Add units
        this.game.units = {};
        // this.game.unitsGroup = this.game.add.group();

        let anna = new Unit({gridX: 1, gridY: 6,
                             movementType: 'Infantry',
                             weapon: 'Silver Axe',
                             asset: 'anna',
                             type: 'axe',
                             id: 1});
        anna.assist = 'Swap';
        anna.special = 'Rising Light';
        this.game.anna = anna;
        this.game.grid[6][1].unit = anna.id;
        this.game.units[anna.id] = anna;
        anna.stats = _.extend(anna.stats, { hp: 41, totalhp: 41, atk: 45, spd: 38, def: 22, res: 28 });

        let zach = new Unit({gridX: 2, gridY: 6,
                             movementType: 'Cavalry',
                             weapon: 'Thoron',
                             asset: 'zach',
                             type: 'blueTome',
                             id: 2});
        this.game.zach = zach;
        this.game.grid[6][2].unit = zach.id;
        this.game.units[zach.id] = zach;
        zach.stats = _.extend(zach.stats, { hp: 35, totalhp:35, atk: 39, spd: 32, def: 19, res: 30 });

        let draug = new Unit({gridX: 3, gridY: 4,
                             movementType: 'Armor',
                             weapon: 'Brave Sword',
                             asset: 'draug',
                             type: 'sword',
                             id: 5});
        this.game.draug = draug;
        this.game.grid[4][3].unit = draug.id;
        this.game.units[draug.id] = draug;
        draug.stats = _.extend(draug.stats, { hp: 50, totalhp: 50, atk: 38, spd: 27, def: 39, res: 18 });

        let caeda = new Unit({gridX: 2, gridY: 5,
                             movementType: 'Flying',
                             weapon: 'Armorslayer+',
                             asset: 'caeda',
                             type: 'sword',
                             id: 6});
        this.game.caeda = caeda;
        this.game.grid[5][2].unit = caeda.id;
        this.game.units[caeda.id] = caeda;
        caeda.stats = _.extend(caeda.stats, { hp: 36, totalhp: 36, atk: 37, spd: 37, def: 24, res: 34 });

        let wall = new Wall(2, 3, 2);
        game.world.addChild(wall);
        game.wall = wall;
        this.game.grid[2][3].unit = 100;
        this.game.units[100] = wall;


        // End-turn UI setup
        this.add.sprite(0, 720, 'bottom_bar');
        var endTurnBtn = this.add.button(50, 723, 'end_turn', this.endTurnBtnClickHandler, this, 0, 1, 1);

        this.game.isFriendlyTurn = true; // Friendly here just refers to blue team
        this.game.enemyPhaseBanner = this.add.sprite(0, 0, 'enemy_phase');
        this.game.playerPhaseBanner = this.add.sprite(0, 0, 'player_phase');
        this.game.enemyPhaseBanner.alpha = 0;
        this.game.playerPhaseBanner.alpha = 0;

        var style = { font: "25px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 };
        this.game.turnText = this.game.add.text(200, 735, 'Player Phase', style);

        // Fire off initial game state
        this.saveTurnState('-- Beginning of match --');
    }

    update() {

    }

    endTurnBtnClickHandler() {
        this.endTurn();
    }

    endTurn() {
        this.game.isFriendlyTurn = !this.game.isFriendlyTurn;
        let banner = (this.game.isFriendlyTurn) ? this.game.playerPhaseBanner : this.game.enemyPhaseBanner;
        banner.bringToTop();
        // Show phase change banner
        this.game.add.tween(banner).to( { alpha: 1 }, 200, Phaser.Easing.Exponential.Out, true, 0, 0, true);

        // Reset all units on the given team
        _.values(this.game.units).forEach((unit) => {
            if (unit.isFriendly() === this.game.isFriendlyTurn) {
                unit.startTurn();
            }
        });

        this.game.turnText.text = (this.game.isFriendlyTurn) ? 'Player Phase' : 'Enemy Phase';

        this.saveTurnState('-- ' + this.game.turnText.text + ' --');
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
            isFriendlyTurn: this.game.isFriendlyTurn
        };

        _.keys(this.game.units).sort().forEach((k) => {
            histObj.units[k] = {
                stats: copyStats(this.game.units[k].stats),
                x: this.game.units[k].x,
                y: this.game.units[k].y,
                turnEnded: this.game.units[k].turnEnded
            };
        });

        this.game.history.push(histObj);
        this.game.updateTurnHistory();
    }

    loadTurnState(idx) {
        var histObj = this.game.history[idx];

        // Reload all the things from the history object
        _.forOwn(histObj.units, (histUnit, key) => {
            var unit = this.game.units[key];
            unit.stats = copyStats(histUnit.stats);
            unit.lastX = unit.x;
            unit.lastY = unit.y;
            unit.x = histUnit.x;
            unit.y = histUnit.y;
            unit.updateUnitPosition();

            if (histUnit.turnEnded) {
                unit.setTurnEnd();
            } else {
                unit.setTurnStart();
            }
        });

        // Sets the current turn correctly
        this.game.isFriendlyTurn = histObj.isFriendlyTurn;

        // Deletes all history after the selected one
        this.game.history = _.dropRight(this.game.history, this.game.history.length - idx - 1);
        this.game.updateTurnHistory();

        // DEBUG
        // this.game.gridObj.debugGridShowProp('unit');
    }
}

function copyStats(statsObj) {
    // Creates a copy of a stats object
    return {
        hp: statsObj.hp,
        totalhp: statsObj.totalhp,
        // _lasthp: statsObj._lasthp,
        atk: statsObj.atk,
        spd: statsObj.spd,
        def: statsObj.def,
        res: statsObj.res,
        bonusHP: statsObj.bonusHP,
        bonusAtk: statsObj.bonusAtk,
        bonusSpd: statsObj.bonusSpd,
        bonusDef: statsObj.bonusDef,
        bonusRes: statsObj.bonusRes
    };
}

export default GameState;
