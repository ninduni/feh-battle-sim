import * as utils from 'helpers/utils';

export class MiscAssistHelper {
    constructor(game, assister, target, assistPos) {
        this.game = game;
        this.assister = assister;
        this.target = target;
        this.assistPos = assistPos;
    }

    miscAssist() {
        switch(this.assister.assist) {
            case 'Dance':
            case 'Sing':
                this.dance();
                break;
            case 'Harsh Command':
                this.harshCommand();
                break;
            case 'Rally Attack':
                this.rally('atk');
                break;
            case 'Rally Defense':
                this.rally('def');
                break;
            case 'Rally Resistance':
                this.rally('res');
                break;
            case 'Rally Speed':
                this.rally('spd');
                break;
        }
    }

    dance() {
        // Allows a unit to move again
        if (!['Dance', 'Sing'].includes(this.target.assist)) {
            this.target.setTurnStart();
        }
    }

    harshCommand() {
        // Harsh command turns penalties into hone buffs
        _.forEach(['Atk', 'Spd', 'Def', 'Res'], (stat) => {
            let penalty = this.target.stats['threaten' + stat];
            this.target.stats['threaten' + stat] = 0;
            this.target.stats['hone' + stat] = Math.max(this.target.stats['hone' + stat], penalty);
        });
    }

    rally(stat) {
        // Rallys are a "hone" buff - only highest takes effect
        // Rally is always for a flat amount of 4
        let honestat = _.camelCase('hone-' + stat);
        this.target.stats[honestat] = Math.max(this.target.stats[honestat], 4);
    }
}
