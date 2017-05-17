import * as utils from 'helpers/utils';

export class HealingHelper {
    constructor(game, assister, target) {
        this.game = game;
        this.assister = assister;
        this.target = target;
    }

    healAssist() {
        switch(this.assister.assist) {
            case 'Ardent Sacrifice':
                this.ardentSac();
                break;
            case 'Heal':
                this.healBy(this.target, 5);
                break;
            case 'Martyr':
                this.martyr();
                break;
            case 'Mend':
                this.healBy(this.target, 10);
                break;
            case 'Physic':
                this.healBy(this.target, 8);
                break;
            case 'Reciprocal Aid':
                this.reciprocalAid();
                break;
            case 'Reconcile':
                this.healBy(this.target, 7);
                this.healBy(this.assister, 7);
                break;
            case 'Recover':
                this.healBy(this.target, 15);
                break;
            case 'Rehabilitate':
                this.rehab();
                break;
        }
    }

    ardentSac() {
        if (this.assister.stats.hp > 10) {
            this.assister.stats.hp -= 10;
            this.healBy(this.target, 10);
        }
    }

    martyr() {
        let dmgSuffered = this.assister.stats.totalhp - this.assister.stats.hp;
        this.healBy(this.target, 7 + dmgSuffered);
        this.healBy(this.assister, dmgSuffered * 0.5);
    }

    reciprocalAid() {
        let assisterHP = this.assister.stats.hp;
        let targetHP = this.target.stats.hp;
        this.target.stats.hp = Math.min(assisterHP, this.target.stats.totalhp);
        this.assister.stats.hp = Math.min(targetHP, this.assister.stats.totalhp);
    }

    rehab() {
        // Heals 7 + twice the amount the target is below 50% hp
        let amt = 7 + (2 * Math.max(0, this.target.stats.totalhp * 0.5 - this.target.stats.hp));
        this.healBy(this.target, amt);
    }

    healBy(unit, amt) {
        unit.stats.hp = Math.min(unit.stats.hp + amt, unit.stats.totalhp);
    }
}
