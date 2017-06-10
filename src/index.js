import GameState from 'states/GameState';
import Preloader from 'states/Preloader';
import { assistInfo } from 'data/assist';
import { weaponInfo } from 'data/weapon';
import { skillInfo } from 'data/skills';
import { specInfo } from 'data/special';

var _ = require('lodash');
window._ = _;

class Game extends Phaser.Game {

    constructor() {
        super(540, 782, Phaser.AUTO, 'canvas', null);
        this.state.add('Preloader', Preloader, false);
        this.state.add('GameState', GameState, false);
        this.state.start('Preloader');

        this.friendlyID = 1;
        this.enemyID = 5;
    }

    addUnit(side) {
        // Add a character select button
        let html = $('<button type="button" class="char-select btn btn-secondary"></button>');
        let idx;
        let charAddBtn = $('.char-add[data-side=' + side + ']');
        if (side === 'friendly') {
            idx = this.friendlyID++;
            if (this.friendlyID > 4) {
                charAddBtn.hide();
            }
        } else {
            idx = this.enemyID++;
            if (this.enemyID > 8) {
                charAddBtn.hide();
            }
        }
        html.attr('data-idx', idx).text(idx);
        charAddBtn.before(html);

        // Add unit to game
        var state = game.state.getCurrentState();
        state.addUnit(idx);
    }

    displayBattleText(attacker, defender, battleResult) {
        $('#battle-preview').show();
        $('#attacker-name').text(attacker.name);
        $('#attacker-hp-start').text(attacker.stats.hp);
        $('#attacker-hp-end').text(battleResult.attackerHP);

        $('#defender-name').text(defender.name);
        $('#defender-hp-start').text(defender.stats.hp);
        $('#defender-hp-end').text(battleResult.defenderHP);

        // If attacker is going to do some pre-combat damage, show it too
        let aoeDmgString = '';
        if (battleResult.aoeDmgToTarget > 0) {
            aoeDmgString = battleResult.aoeDmgToTarget + '+';
        }
        $('#attacker-dmg-strike').text(aoeDmgString + battleResult.attackerDmg);
        // Only display defender damage if they can counter
        if (battleResult.defenderMult >= 1) {
            $('#defender-dmg-strike').text(battleResult.defenderDmg);
        } else {
            $('#defender-dmg-strike').text('--');
        }
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
        console.log('selected');
        $('.unit-form').removeClass('invisible');

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
        $('#unit-name').val(unit.name);
        $('#hp').val(stats.totalhp);
        $('#atk').val(stats.atk);
        $('#spd').val(stats.spd);
        $('#def').val(stats.def);
        $('#res').val(stats.res);

        var buffs = {
            atk: stats.honeAtk - stats.threatenAtk,
            spd: stats.honeSpd - stats.threatenSpd,
            def: stats.honeDef - stats.threatenDef,
            res: stats.honeRes - stats.threatenRes
        };
        for (var stat in buffs) {
            if (buffs[stat] > 0) {
                $('#hone-' + stat).addClass('buff').removeClass('penalty');
                $('#hone-' + stat).text('+' + buffs[stat]);
            } else if (buffs[stat] < 0) {
                $('#hone-' + stat).addClass('penalty').removeClass('buff');
                $('#hone-' + stat).text(buffs[stat]);
            } else {
                $('#hone-' + stat).text('');
            }
        }

        $('#type').val(unit.type);
        $('#movement').val(unit.movementType);

        updateSkillLists();
        $('#weapon').val(unit.weapon || '');
        $('#assist').val(unit.assist || '');
        $('#special').val(unit.special || '');
        $('#a-skill').val(unit.passiveA || '');
        $('#b-skill').val(unit.passiveB || '');
        $('#c-skill').val(unit.passiveC || '');
    }

    getStats(unitID) {
        return this.units[unitID] || {};
    }

    updateTurnHistory() {
        $('#turn-history').empty();
        this.history.forEach((h, idx) => {
            $('#turn-history').append($("<option></option>")
                .attr('value', idx).text(h.string));
        });
    }

    setMap(newMap) {
        var state = game.state.getCurrentState();
        state.resetMap(newMap);
    }

    setStats({ unitID, hp, atk, spd, def, res }) {
        var unit = this.units[unitID];
        unit.stats.totalhp = parseInt(hp);
        unit.stats.hp = parseInt(hp);
        unit.stats.atk = parseInt(atk);
        unit.stats.spd = parseInt(spd);
        unit.stats.def = parseInt(def);
        unit.stats.res = parseInt(res);
        unit.updateHP();
    }

    setName(unitID, name) {
        this.units[unitID].name = name;
    }

    setType(unitID, type) {
        this.units[unitID].type = type;
    }

    setMovement(unitID, movement) {
        this.units[unitID].movementType = movement;
    }

    setWeapon(unitID, weapon) {
        this.units[unitID].weapon = weapon;
    }

    setSpecial(unitID, special) {
        this.units[unitID].special = special;
    }

    setAssist(unitID, assist) {
        this.units[unitID].assist = assist;
    }

    setSkill(unitID, skill, slot) {
        var unit = this.units[unitID];
        unit['passive' + slot] = skill;
        unit['passive' + slot + 'Data'] = skillInfo[slot.toLowerCase()][skill] || {};
    }
}

export const game = new Game();
window.game = game;
// window.skillInfo = skillInfo;

$(document).ready(function() {

$('#battle-preview').hide();

///////////////
// Load data //
///////////////
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

//////////////////
// Map Controls //
//////////////////
$('.chg-map-btn').click(function() {
    let mapVal = $($(this).attr('data-select')).val();
    console.log(mapVal);
    changeMap(mapVal);
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

///////////////////
// Unit Controls //
///////////////////
$('#unit-name').on('blur', function() {
    let char = $('#selected-character').val();
    game.setName(char, $(this).val());
});

$('#type-form').on('change', function() {
    var type = $('#type').val(),
        char = $('#selected-character').val();

    game.setType(char, type);
    updateSkillLists();
});

$('#movement-form').on('change', function() {
    var movement = $('#movement').val(),
        char = $('#selected-character').val();

    game.setMovement(char, movement);
});

$('#weapon').on('change', function() {
    var weapon = $('#weapon').val(),
        char = $('#selected-character').val();

    game.setWeapon(char, weapon);
});

$('#assist').on('change', function() {
    var assist = $('#assist').val(),
        char = $('#selected-character').val();

    game.setAssist(char, assist);
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

$('.char-add').click(function() {
    let side = $(this).attr('data-side');
    game.addUnit(side);
});

$('.char-select-group').on('click', '.char-select', function() {
    game.unitSelect($(this).attr('data-idx'));
});

///////////////////
// Turn Controls //
///////////////////
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

}); // End on document ready

/////////////
// Helpers //
/////////////
function updateSkillLists() {
    // Updates the skill list based on type restrictions
    var newWeapons = _.keys(_.pickBy(weaponInfo, (w) => w.type === $('#type').val()));
    $('#weapon').empty();
    $('#weapon').append($("<option></option>"));
    newWeapons.forEach((w) => {
        $('#weapon').append($("<option></option>")
            .attr('value', w).text(w));
    });
}

function changeMap(newMap) {
    if (confirm("Are you sure you want to reset the map? This will clear all units.") === true) {
        game.setMap(newMap);
    }
}