import GameState from 'states/GameState';
import Preloader from 'states/Preloader';
import { assistInfo } from 'skills/assist';
import { weaponInfo } from 'skills/weapon';
import { skillInfo } from 'skills/skills';
import { specInfo } from 'skills/special';
import { BattleCalc } from 'helpers/BattleCalculator';

var _ = require('lodash');
window._ = _;
window.bc = BattleCalc;

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

        $('#bonus-atk').text((stats.bonusAtk) ? '+' + stats.bonusAtk : '');
        $('#bonus-spd').text((stats.bonusSpd) ? '+' + stats.bonusSpd : '');
        $('#bonus-def').text((stats.bonusDef) ? '+' + stats.bonusDef : '');
        $('#bonus-res').text((stats.bonusRes) ? '+' + stats.bonusRes : '');

        $('#type').val(unit.type);

        updateSkillLists();
        $('#weapon').val(unit.weapon || '');
        $('#assist').val(unit.assist || '');
        $('#special').val(unit.special || '');
        $('#a-skill').val(unit.passiveA || '');
        $('#b-skill').val(unit.passiveB || '');
        $('#c-skill').val(unit.passiveC || '');
    }

    getStats(char) {
        return this.units[char] || {};
    }

    updateTurnHistory() {
        $('#turn-history').empty();
        this.history.forEach((h, idx) => {
            $('#turn-history').append($("<option></option>")
                .attr('value', idx).text(h.string));
        });
    }

    setMap(mapID) {
        this.map.frame = mapID;
    }

    setStats({ char, hp, atk, spd, def, res }) {
        var unit = this.units[char];
        unit.stats.totalhp = parseInt(hp);
        unit.stats.hp = parseInt(hp);
        unit.stats.atk = parseInt(atk);
        unit.stats.spd = parseInt(spd);
        unit.stats.def = parseInt(def);
        unit.stats.res = parseInt(res);
        unit.updateHP();
    }

    setType(char, type) {
        var unit = this.units[char];
        unit.type = type;
        unit.typeIcon.frameName = type;
        unit.weapon = null; // Unset weapon
    }

    setWeapon(char, weapon) {
        var unit = this.units[char];
        unit.weapon = weapon;
        unit.weaponData = weaponInfo[weapon];
        unit.color = unit.weaponData.color;
    }

    setSpecial(char, special) {
        var unit = this.units[char];
        unit.special = special;
        unit.specialData = specInfo[special] || {};
        unit.updateSpecCD(unit.specialData.cooldown);
    }

    setSkill(char, skill, slot) {
        console.log(skill, slot);
        var unit = this.units[char];
        unit['passive' + slot] = skill;
        unit['passive' + slot + 'Data'] = skillInfo[slot.toLowerCase()][skill] || {};
    }
}

var game = new Game();
window.game = game;
// window.skillInfo = skillInfo;

$(document).ready(function() {
    $('#battle-preview').hide();

    $('#assist').empty();
    $('#assist').append($("<option></option>").text('---').attr('value', ''));
    _.keys(assistInfo).forEach((a) => {
        $('#assist').append($("<option></option>").attr('value', a).text(a));
    });

    $('#special').empty();
    $('#special').append($("<option></option>").text('---').attr('value', ''));
    _.keys(specInfo).forEach((s) => {
        $('#special').append($("<option></option>").attr('value', s).text(s));
    });

    $('#a-skill').empty();
    $('#a-skill').append($("<option></option>").text('---').attr('value', ''));
    _.keys(skillInfo.a).forEach((s) => {
        $('#a-skill').append($("<option></option>").attr('value', s).text(s));
    });
    $('#b-skill').empty();
    $('#b-skill').append($("<option></option>").text('---').attr('value', ''));
    _.keys(skillInfo.b).forEach((s) => {
        $('#b-skill').append($("<option></option>").attr('value', s).text(s));
    });
    $('#c-skill').empty();
    $('#c-skill').append($("<option></option>").text('---').attr('value', ''));
    _.keys(skillInfo.c).forEach((s) => {
        $('#c-skill').append($("<option></option>").attr('value', s).text(s));
    });

    // $('#arena-map-select-rot-1').empty();

});

$('#goto-turn').click(function() {
    var state = game.state.getCurrentState();
    state.loadTurnState($('#turn-history').val());
});

$('#place-marker').click(function() {
    var state = game.state.getCurrentState();
    state.saveTurnState('-- Marker --');
});

$('#turn-history').on('change', function() {
    // Enable the GOTO button if something is selected
    $('#goto-turn').prop('disabled', false);
});

$('#arena-map-select-rot-1').on('change', function() {
    game.setMap(parseInt($(this).val()));
});

$('#arena-map-select-rot-2').on('change', function() {
    game.setMap(parseInt($(this).val()));
});

$('#stats-form').on('focusout', function() {
    var hp = $('#hp').val(),
        atk = $('#atk').val(),
        spd = $('#spd').val(),
        def = $('#def').val(),
        res = $('#res').val(),
        char = $('#selected-character').val();

    game.setStats({ char: char, hp: hp, atk: atk, spd: spd, def: def, res: res });
});

$('#type-form').on('change', function() {
    var type = $('#type').val(),
        char = $('#selected-character').val();

    game.setType(char, type);
    updateSkillLists();
});

$('#weapon').on('change', function() {
    var weapon = $('#weapon').val(),
        char = $('#selected-character').val();

    game.setWeapon(char, weapon);
});

$('#special').on('change', function() {
    var special = $('#special').val(),
        char = $('#selected-character').val();

    game.setSpecial(char, special);
});

$('.passive-skill-form').on('change', function() {
    var skill = $(this).val(),
        char = $('#selected-character').val(),
        slot = $(this).attr('data-slot');

    game.setSkill(char, skill, slot);
});

$('.char-select').click(function() {
    game.unitSelect($(this).attr('data-idx'));
});

// Updates the skill list based on type restrictions
function updateSkillLists() {
    var newWeapons = _.keys(_.pickBy(weaponInfo, (w) => w.type === $('#type').val()));
    $('#weapon').empty();
    $('#weapon').append($("<option></option>"));
    newWeapons.forEach((w) => {
        $('#weapon').append($("<option></option>")
            .attr('value', w).text(w));
    });
}