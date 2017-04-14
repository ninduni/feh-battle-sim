import Unit from 'objects/Unit';
import Grid from 'objects/Grid';
import { createArray } from 'helpers/utils';
import { assistInfo } from 'skills/assist';
import { weaponInfo } from 'skills/weapon';

window.weaponInfo = weaponInfo;

class GameState extends Phaser.State {

    create() {
        // Instantiate the pathfinder
        var pathfinder = new EasyStar.js();
        this.game.pathfinder = pathfinder;

        // Set up map and virtual grid
        var map = this.add.sprite(0, 0, 'maps', 3);
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
            [1,1,1,1,0,2],
            [1,1,1,0,0,0],
            [1,1,1,2,0,2]
        ];

        // Global grid object stores data about many things related to each square
        this.game.gridObj = new Grid(game, this.add, this.game.terrainGrid, this.game.maxGridX, this.game.maxGridY);
        // Slightly shorter lookup function
        this.game.grid = this.game.gridObj.map;

        // Add units
        this.game.units = [];
        this.game.unitsGroup = this.game.add.group();

        let anna = new Unit({game: this.game, gridX: 1, gridY: 6,
                             movementType: 'infantry',
                             attackRange: 1,
                             asset: 'anna',
                             type: 'axe',
                             id: 1});
        anna.skills.weapon = 'Silver Axe';
        anna.skills.assist = 'swap';
        this.game.anna = anna;
        this.game.grid[6][1].unit = anna.id;
        this.game.units[anna.id] = anna;
        this.game.unitsGroup.add(anna);

        let zach = new Unit({game: this.game, gridX: 2, gridY: 6,
                             movementType: 'cavalry',
                             attackRange: 2,
                             asset: 'zach',
                             type: 'blueTome',
                             id: 2});
        zach.skills.weapon = 'Thoron';
        this.game.zach = zach;
        this.game.grid[6][2].unit = zach.id;
        this.game.units[zach.id] = zach;
        this.game.unitsGroup.add(zach);

        let draug = new Unit({game: this.game, gridX: 5, gridY: 2,
                             movementType: 'armor',
                             attackRange: 1,
                             asset: 'draug',
                             type: 'sword',
                             id: 5});
        draug.skills.weapon = 'Brave Sword';
        this.game.draug = draug;
        this.game.grid[2][5].unit = draug.id;
        this.game.units[draug.id] = draug;
        this.game.unitsGroup.add(draug);

        let caeda = new Unit({game: this.game, gridX: 2, gridY: 5,
                             movementType: 'flying',
                             attackRange: 1,
                             asset: 'caeda',
                             type: 'sword',
                             id: 6});
        caeda.skills.weapon = 'Silver Sword';
        this.game.caeda = caeda;
        this.game.grid[5][2].unit = caeda.id;
        this.game.units[caeda.id] = caeda;
        this.game.unitsGroup.add(caeda);


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
    }

    update() {

    }

    endTurnBtnClickHandler() {
        this.endTurn();
    }

    endTurn() {
        this.game.isFriendlyTurn = !this.game.isFriendlyTurn;
        var banner = (this.game.isFriendlyTurn) ? this.game.playerPhaseBanner : this.game.enemyPhaseBanner;

        // Show phase change banner
        this.game.add.tween(banner).to( { alpha: 1 }, 750, Phaser.Easing.Exponential.Out, true, 0, 0, true);

        // Reset all units on the given team
        this.game.units.forEach((unit) => {
            if (unit.isFriendly() === this.game.isFriendlyTurn) {
                unit.startTurn();
            }
        });

        this.game.turnText.text = (this.game.isFriendlyTurn) ? 'Player Phase' : 'Enemy Phase';
    }

    setStats({ char, hp, atk, spd, def, res }) {
        var unit = this.game.units[char];
        unit.stats.totalhp = parseInt(hp);
        unit.stats.hp = parseInt(hp);
        unit.stats.atk = parseInt(atk);
        unit.stats.spd = parseInt(spd);
        unit.stats.def = parseInt(def);
        unit.stats.res = parseInt(res);
        unit.redrawHPBar();
    }

    setType(char, type) {
        var unit = this.game.units[char];
        unit.type = type;
        unit.typeIcon.frameName = type;
        unit.setAttackRange();
    }
}

var Stats = function(hp, atk, spd, def, res) {
    this.hp = hp;
    this.atk = atk;
    this.spd = spd;
    this.def = def;
    this.res = res;
};

export default GameState;
