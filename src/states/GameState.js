import Unit from 'objects/Unit';
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
        this.game.grid = createArray(this.game.maxGridY, this.game.maxGridX);

        // Create sprites that live on every grid square
        // We're doing it this way so that we don't have to create/destroy new sprites all the time, but it may
        // cost more to place them all at once like this.
        var blueOverlayGroup = this.add.group(),
            redOverlayGroup = this.add.group(),
            greenOverlayGroup = this.add.group(),
            attackSelectorGroup = this.add.group(),
            moveSelectorGroup = this.add.group(),
            assistSelectorGroup = this.add.group();
        this.debugGridGroup = this.add.group();
        var style = { font: "25px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 };
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                var r = redOverlayGroup.create(90 * x, 90 * y, 'red'),
                    b = blueOverlayGroup.create(90 * x, 90 * y, 'blue'),
                    g = greenOverlayGroup.create(90 * x, 90 * y, 'green'),
                    a = attackSelectorGroup.create(90 * x, 90 * y, 'selectors', 'selector-attack'),
                    m = moveSelectorGroup.create(90 * x, 90 * y, 'selectors', 'selector-move'),
                    s = assistSelectorGroup.create(90 * x, 90 * y, 'selectors', 'selector-assist'),
                    d = this.add.text(90 * x, 90 * y, '', style, this.debugGridGroup); // Mandatory for adding text to group

                r.visible = b.visible = g.visible = a.visible = m.visible = s.visible = d.visible = false;
                r.alpha = b.alpha = 0.5;
                a.alpha = m.alpha = s.alpha = 0.75;

                this.game.grid[y][x] = {
                    terrain: this.game.terrainGrid[y][x],
                    unit: 0, // Will contain the ID of the unit at this position
                    redOverlay: r,
                    blueOverlay: b,
                    greenOverlay: g,
                    attackSelector: a,
                    moveSelector: m,
                    assistSelector: s,
                    debugGrid: d
                };
            }
        }

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

    debugGridShow(grid) {
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.game.grid[y][x].debugGrid.text = grid[y][x];
                this.game.grid[y][x].debugGrid.visible = true;
            }
        }
        this.game.world.bringToTop(this.debugGridGroup);
    }

    debugGridOff() {
        for (var x = 0; x < this.game.maxGridX; x++) {
            for (var y = 0; y < this.game.maxGridY; y++) {
                this.game.grid.debugGrid[y][x].visible = false;
            }
        }
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
