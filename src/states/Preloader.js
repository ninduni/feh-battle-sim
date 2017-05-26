class Preloader extends Phaser.State {

	preload() {
		this.game.stage.backgroundColor = '#cecece';
		this.game.load.spritesheet('maps', 'images/map_compressed.jpg', 540, 720, 92, 5, 5);
		this.game.load.image('blue', 'images/blue.png');
		this.game.load.image('red', 'images/red.png');
		this.game.load.image('green', 'images/green.png');
		this.game.load.image('anna', 'images/anna_small.png');
		this.game.load.image('zach', 'images/zach_small.png');
		this.game.load.image('draug', 'images/draug_small.png');
		this.game.load.image('caeda', 'images/caeda_small.png');

		// UI Stuff
		this.game.load.image('bottom_bar', 'images/bottom-bar.png');
		this.game.load.spritesheet('end_turn', 'images/end-turn.png', 70, 59);
		this.game.load.image('player_phase', 'images/player_phase.png');
		this.game.load.image('enemy_phase', 'images/enemy_phase.png');

		this.game.load.bitmapFont('redfont', 'images/redfont.png', 'images/redfont.xml');
		this.game.load.bitmapFont('bluefont', 'images/bluefont.png', 'images/bluefont.xml');
		this.game.load.bitmapFont('special', 'images/special.png', 'images/special.xml');

		this.game.load.atlasXML('types', 'images/types.png', 'images/types.xml');
		this.game.load.atlas('selectors', 'images/selectors.png', 'images/selectors.js');

		this.game.load.atlas('wall', 'images/wall.png', 'images/wall.js');

		this.game.load.image('border', 'images/border.png');
	}

	create() {

		//	Once the load has finished we disable the crop because we're going to sit in the update loop for a short while as the music decodes
		// this.preloadBar.cropEnabled = false;

		this.game.state.start('GameState');
		// this.game.text = 'hello';
		// var txt = game.add.text(game.world.centerX, game.world.centerY, this.game.text, { font: "65px Arial", fill: "#ff0044", align: "center" });
		// this.game.updateText = _.curry(this.updateText)(txt);
	}

	updateText(obj, newText) {
		console.log('updated');
		obj.text = newText;
	}

}

export default Preloader;
