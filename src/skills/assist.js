// command skill data
export const assistInfo =
{
    "ardent_sacrifice" : {
        "description" : "Heals adjacent ally 10 HP. Unit loses 10 HP.",
        "weaponRestrict" : "Staff",
        "fullName": "Ardent Sacrifice"
    },
    "dance" : {
        "description" : "Enables target to take another action. Cannot be used on units with Sing or Dance.",
        "charUnique" : true,
        "fullName": "Dance"
    },
    "draw_back" : {
        "description" : "Unit moves 1 space away from target ally, who moves to unit's former position.",
        "weaponRestrict" : "Staff",
        "fullName": "Draw Back"
    },
    "harsh_command" : {
        "description" : "Converts penalties on target into bonuses.",
        "weaponRestrict" : "Staff",
        "fullName": "Harsh Command"
    },
    "heal" : {
        "description" : "Restores 5 HP.",
        "weaponUnique" : "Staff",
        "fullName": "Heal"
    },
    "martyr" : {
        "description" : "Restores 7 HP plus this unit's suffered damage. Unit heals 50% of suffered damage. Slows Special trigger (cooldown count+1).",
        "specCooldownMod" : 1,
        "weaponUnique" : "Staff",
        "fullName": "Martyr"
    },
    "mend" : {
        "description" : "Restores 10 HP.",
        "weaponUnique" : "Staff",
        "fullName": "Mend"
    },
    "physic" : {
        "description" : "Restores 8 HP to target 2 spaces away.",
        "weaponUnique" : "Staff",
        "fullName": "Physic"
    },
    "pivot" : {
        "description" : "Unit moves to opposite side of adjacent ally.",
        "weaponRestrict" : "Staff",
        "fullName": "Pivot"
    },
    "rally_attack" : {
        "description" : "Grants Atk+4 to an adjacent ally until the end of the turn.",
        "weaponRestrict" : "Staff",
        "fullName": "Rally Attack"
    },
	"rally_defense" : {
	    "description" : "Grants Def+4 to an adjacent ally until the end of the turn.",
        "weaponRestrict" : "Staff",
        "fullName": "Rally Defense"
	},
    "rally_resistance" : {
        "description" : "Grants Res+4 to an adjacent ally until the end of the turn.",
        "weaponRestrict" : "Staff",
        "fullName": "Rally Resistance"
    },
    "rally_speed" : {
        "description" : "Grants Spd+4 to an adjacent ally until the end of the turn.",
        "weaponRestrict" : "Staff",
        "fullName": "Rally Speed"
    },
    "reciprocal_aid" : {
        "description" : "Swap HP with adjacent ally (neither unit can go above their max HP).",
        "weaponRestrict" : "Staff",
        "fullName": "Reciprocal Aid"
    },
	"reconcile" : {
	    "description" : "Restores 7 HP each to target and this unit.",
        "weaponUnique" : "Staff",
        "fullName": "Reconcile"
	},
    "recover" : {
        "description" : "Restores 15 HP. Slows Special trigger (cooldown count +1).",
        "specCooldownMod" : 1,
        "weaponUnique" : "Staff",
        "fullName": "Recover"
    },
    "rehabilitate" : {
        "description" : "Restores 7 HP or more the further below 50% the target's HP is. Slows Special trigger (cooldown count+1).",
        "specCooldownMod" : 1,
        "weaponUnique" : "Staff",
        "fullName": "Rehabilitate"
    },
    "reposition" : {
        "description" : "Moves adjacent ally to opposite side of unit.",
        "weaponRestrict" : "Staff",
        "fullName": "Reposition"
    },
    "shove" : {
        "description" : "Push adjacent ally 1 space away.",
        "weaponRestrict" : "Staff",
        "fullName": "Shove"
    },
    "sing" : {
        "description" : "Enables target to take another action. Cannot be used on units with Sing or Dance.",
        "charUnique" : true,
        "fullName": "Sing"
    },
    "smite" : {
        "description" : "Push adjacent ally 2 spaces away.",
        "weaponRestrict" : "Staff",
        "fullName": "Smite"
    },
    "swap" : {
        "description" : "Swap places with adjacent ally.",
        "weaponRestrict" : "Staff",
        "fullName": "Swap"
    }
};