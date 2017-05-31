import { game } from 'index';
import * as utils from 'helpers/utils';

export default class Wall extends Phaser.Sprite {
    // A wall is an immovable, breakable object with a max of 2 hp
    constructor(startHP, gridX, gridY) {
        let x = utils.fromGrid(gridX);
        let y = utils.fromGrid(gridY);
        super(game, x, y, 'wall', 'wall' + startHP);

        this.stats = {hp: startHP};
        this.gridX = gridX;
        this.gridY = gridY;
        this.name = 'Wall';

        // I didn't scale the sprite correctly. do it here
        this.scale.x = 0.7;
        this.scale.y = 0.7;
        this.anchor.setTo(0.5, (this.height - 45.0) / this.height);
    }

    setHP(hp) {
        this.stats.hp = hp;
        this.frameName = 'wall' + this.stats.hp;
    }

    damage() {
        if (this.stats.hp > 0) {
            this.setHP(this.stats.hp - 1);
            if (this.stats.hp === 0) {
                // Update grid to no longer have a block
                this.clear();
            }
        }
    }

    clear() {
        game.grid[this.gridY][this.gridX].unit = 0;
    }

    wallBattleResult(attacker) {
        console.log(attacker);
        // Fakes a battle result object for combat with a wall
        return {
            attackerHP: attacker.stats.hp,
            defenderHP: this.stats.hp - 1,
            attackerHPAfterNonlethal: attacker.stats.hp,
            defenderHPAfterNonlethal: this.stats.hp - 1,
            attackerDmg: 1,
            defenderDmg: 0,
            attackerMult: 1,
            defenderMult: 0,
            aoeAtk: 0,
            aoeMod: 0,
            aoeDmgToTarget: 0
        };
    }

    isOpposingTeam() {
        // wall against all
        return true;
    }

    isPlayer() {
        return null;
    }
}