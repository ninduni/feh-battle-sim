export default class HealthBar {
    constructor(game, parent, isFriendly, hp) {
        this.game = game;
        this.parent = parent;
        this.isFriendly = isFriendly;

        // Healthbar background
        this.background = this.game.add.graphics(-25.5, 40);
        this.background.anchor.setTo(0.5);
        this.background.beginFill(0x000000);
        this.background.lineStyle(6.5, 0x000000, 1);
        this.background.moveTo(0,-5);
        this.background.lineTo(51, -5);
        this.background.endFill();

        parent.addChild(this.background);

        this.healthbar = this.game.add.graphics(-25, 40);
        this.healthbar.anchor.setTo(0.5);

        parent.addChild(this.healthbar);

        // Health text
        var style = { font: "12px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 };
        // this.healthbarText = this.game.add.text(-35, 37, this.stats.hp, style);
        var font = (isFriendly) ? 'bluefont' : 'redfont';
        this.healthbarText = this.game.add.bitmapText(-35, 25, font, hp, 30);
        this.healthbarText.anchor.setTo(0.5);

        parent.addChild(this.healthbarText);
    }

    flip() {
        // Flips the healthbar horizontally while correcting text
        this.healthbarText.scale.x = -1;
        this.healthbarText.x *= -1;

        this.healthbar.scale.x = -1;
        this.healthbar.x *= -1;

        this.background.scale.x = -1;
        this.background.x *= -1;
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

        // this.stats._lasthp = curHP;
        this.healthbarText.text = curHP;
    }
}