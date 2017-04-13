import GameState from 'states/GameState';
import Preloader from 'states/Preloader';
import { assistInfo } from 'skills/assist';
import { weaponInfo } from 'skills/weapon';

var _ = require('lodash');
window._ = _;

class Game extends Phaser.Game {

	constructor() {
		super(540, 782, Phaser.AUTO, 'canvas', null);
		this.state.add('Preloader', Preloader, false);
		this.state.add('GameState', GameState, false);
		this.state.start('Preloader');
	}

	displayBattleText(attacker, defender, battleResult) {
		$('#battle-preview').show();
		$('#attacker-name').text(_.upperFirst(attacker.name));
		$('#attacker-hp-start').text(attacker.stats.hp);
		$('#attacker-hp-end').text(battleResult.attackerHP);

		$('#defender-name').text(_.upperFirst(defender.name));
		$('#defender-hp-start').text(defender.stats.hp);
		$('#defender-hp-end').text(battleResult.defenderHP);

		$('#attacker-dmg-strike').text(battleResult.attackerDmg);
		$('#defender-dmg-strike').text(battleResult.defenderDmg);
		// Only display multipliers if they're relevant
		if (battleResult.attackerMult > 1) $('#attacker-dmg-mult').text('x ' + battleResult.attackerMult);
		if (battleResult.defenderMult > 1) $('#defender-dmg-mult').text('x ' + battleResult.defenderMult);
	}

	clearBattleText() {
		$('#battle-preview').hide();
		$('#attacker-hp-start').text('');
		$('#attacker-hp-end').text('');
		$('#defender-hp-start').text('');
		$('#defender-hp-end').text('');
		$('#attacker-dmg-strike').text('');
		$('#defender-dmg-strike').text('');
		$('#attacker-dmg-mult').text('');
		$('#defender-dmg-mult').text('');
	}

	unitSelect(unitID) {
		// Deselect old button
		var oldSelect = $('#selected-character').val();
		if (oldSelect !== '') {
			$('button[data-idx=' + $('#selected-character').val() + ']').button('toggle');
		}

		// Select new button, update selected-char
		$('.char-select[data-idx=' + unitID + ']').button('toggle');
		$('#selected-character').val(unitID);

		// Fetch stats from inside game
		var unit = this.getStats(unitID);
		var stats = unit.stats || {};
		$('#unit-name').text(_.upperFirst(unit.name));
		$('#hp').val(stats.totalhp);
		$('#atk').val(stats.atk);
		$('#spd').val(stats.spd);
		$('#def').val(stats.def);
		$('#res').val(stats.res);

		$('#type').val(unit.type);
	}

    getStats(char) {
        return this.units[char] || {};
    }
}

var game = new Game();
window.game = game;
$('#battle-preview').hide();


$('#stats-form').on('focusout', function() {
	var hp = $('#hp').val(),
		atk = $('#atk').val(),
		spd = $('#spd').val(),
		def = $('#def').val(),
		res = $('#res').val(),
		char = $('#selected-character').val();

	var state = game.state.getCurrentState();
	state.setStats({ char: char, hp: hp, atk: atk, spd: spd, def: def, res: res });
});

$('#type-form').on('change', function() {
	var type = $('#type').val(),
		char = $('#selected-character').val();

	var state = game.state.getCurrentState();
	state.setType(char, type);

	updateSkillLists();
});

$('.char-select').click(function() {
	game.unitSelect($(this).attr('data-idx'));
});

// Updates the skill list based on type restrictions
function updateSkillLists() {

	var newWeapons = _.keys(_.pickBy(weaponInfo, (w) => w['type'] === $('#type').val()))
	$('#weapon').empty();
	newWeapons.forEach((w) => {
		$('#weapon').append($("<option></option>")
			.attr('value', w).text(w));
	});
}