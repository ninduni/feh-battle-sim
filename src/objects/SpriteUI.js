import { game } from 'index';

export default class SpriteUI extends Phaser.Group {
    constructor(unit, isFriendly, type) {
        super(game);

        this.unit = unit;
        this.isFriendly = isFriendly;

        // Initialize so we redraw once
        this.lasthp = 0;

        // Healthbar background
        this.background = game.add.graphics(-25.5, 40);
        this.background.anchor.setTo(0.5);
        this.background.beginFill(0x000000);
        this.background.lineStyle(6.5, 0x000000, 1);
        this.background.moveTo(0,-5);
        this.background.lineTo(51, -5);
        this.background.endFill();
        this.addChild(this.background);

        // Healthbar
        this.healthbar = game.add.graphics(-25, 40);
        this.healthbar.anchor.setTo(0.5);
        this.addChild(this.healthbar);

        // Health text
        var style = { font: "12px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 };
        var font = (isFriendly) ? 'bluefont' : 'redfont';
        this.healthbarText = game.add.bitmapText(-35, 25, font, this.unit.stats.hp, 30);
        this.healthbarText.anchor.setTo(0.5);
        this.addChild(this.healthbarText);

        // Type Icon
        this.typeIcon = game.add.sprite(-35, -35, 'types', this.unit.type);
        this.typeIcon.anchor.setTo(0.5);
        this.typeIcon.scale.setTo(0.5);
        this.addChild(this.typeIcon);

        // Special counter icon
        this.specialText = game.add.bitmapText(-35, -20, 'special', this.unit.specCurrCooldown, 30);
        this.specialText.anchor.setTo(0.5);
        this.addChild(this.specialText);
    }

    update() {
        // Detects HP changes on the unit and redraws the healthbar
        if (this.lasthp !== this.unit.stats.hp) {
            this.redraw(this.unit.stats.hp, this.unit.stats.totalhp);
            this.lasthp = this.unit.stats.hp;
        }
    }

    flip() {
        // Flips the healthbar horizontally while correcting text
        this.healthbarText.scale.x = -1;
        this.healthbarText.x *= -1;

        this.healthbar.scale.x = -1;
        this.healthbar.x *= -1;

        this.background.scale.x = -1;
        this.background.x *= -1;

        this.typeIcon.scale.x = -0.5;
        this.specialText.scale.x = -1;
    }

    redraw(curHP, totalHP) {
        this.healthbar.clear();
        var x = (curHP / totalHP) * 100;
        // var colour = utils.rgbToHex((x > 50 ? 1-2*(x-50)/100.0 : 1.0) * 255, (x > 50 ? 1.0 : 2*x/100.0) * 255, 0);
        var colour = (this.isFriendly) ? 0x64d2ea : 0xcf5568;
        this.healthbar.beginFill(colour);
        this.healthbar.lineStyle(5, colour, 1);
        this.healthbar.moveTo(0,-5);
        this.healthbar.lineTo(50 * curHP / totalHP, -5);
        this.healthbar.endFill();

        // this.unit.stats.lasthp = curHP;
        this.healthbarText.text = curHP;
    }
}