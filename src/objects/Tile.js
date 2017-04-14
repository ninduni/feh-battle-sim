export default class Tile {
    constructor(game, x, y, terrain, overlays) {
        this.game = game;
        this.x = x;
        this.y = y;

        var style = { font: "25px Arial", fill: "#ffffff", align: "left",
                      stroke: "#000000", strokeThickness: 2 };

        var r = overlays.redOverlayGroup.create(90 * x, 90 * y, 'red'),
            b = overlays.blueOverlayGroup.create(90 * x, 90 * y, 'blue'),
            g = overlays.greenOverlayGroup.create(90 * x, 90 * y, 'green'),
            a = overlays.attackSelectorGroup.create(90 * x, 90 * y, 'selectors', 'selector-attack'),
            m = overlays.moveSelectorGroup.create(90 * x, 90 * y, 'selectors', 'selector-move'),
            s = overlays.assistSelectorGroup.create(90 * x, 90 * y, 'selectors', 'selector-assist'),
            d = game.add.text(90 * x, 90 * y, '', style, overlays.debugGridGroup); // Mandatory for adding text to group

        r.visible = b.visible = g.visible = a.visible = m.visible = s.visible = d.visible = false;
        r.alpha = b.alpha = 0.5;
        a.alpha = m.alpha = s.alpha = 0.75;

        this.unit = 0; // Will contain the ID of the unit at this position
        this.terrain = terrain;
        this.redOverlay = r;
        this.blueOverlay = b;
        this.greenOverlay = g;
        this.attackSelector = a;
        this.moveSelector = m;
        this.assistSelector = s;
        this.debugGrid = d;
    }

    showBlue() {
        this.blueOverlay.visible = true;
    }
    hideBlue() {
        this.blueOverlay.visible = false;
    }

    showGreen() {
        this.greenOverlay.visible = true;
    }
    hideGreen() {
        this.greenOverlay.visible = false;
    }

    showRed() {
        this.redOverlay.visible = true;
    }
    hideRed() {
        this.redOverlay.visible = false;
    }

    showAttack() {
        this.attackSelector.visible = true;
    }
    hideAttack() {
        this.attackSelector.visible = false;
    }

    showMove() {
        this.moveSelector.visible = true;
    }
    hideMove() {
        this.moveSelector.visible = false;
    }

    showAssist() {
        this.assistSelector.visible = true;
    }
    hideAssist() {
        this.assistSelector.visible = false;
    }

    hideOverlay() {
        this.hideBlue();
        this.hideRed();
        this.hideGreen();
    }

    hideSelectors() {
        this.hideAttack();
        this.hideAssist();
        this.hideMove();
    }

    showDebugText(text) {
        this.debugGrid.text = text;
        this.debugGrid.visible = true;
    }

    hideDebugText() {
        this.debugGrid.text = '';
        this.debugGrid.visible = false;
    }
}
