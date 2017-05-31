// command skill data
export const assistInfo =
{
    "Ardent Sacrifice" : {
        "description" : "Heals adjacent ally 10 HP. Unit loses 10 HP.",
        "weapon_restrict" : "Staff",
        "type" : "heal"
    },
    "Dance" : {
        "description" : "Enables target to take another action. Cannot be used on units with Sing or Dance.",
        "char_unique" : true
    },
    "Draw Back" : {
        "description" : "Unit moves 1 space away from target ally, who moves to unit's former position.",
        "weapon_restrict" : "Staff",
        "type" : "movement"
    },
    "Harsh Command" : {
        "description" : "Converts penalties on target into bonuses.",
        "weapon_restrict" : "Staff"
    },
    "Heal" : {
        "description" : "Restores 5 HP.",
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Martyr" : {
        "description" : "Restores 7 HP plus this unit's suffered damage. Unit heals 50% of suffered damage. Slows Special trigger (cooldown count+1).",
        "spec_cooldown_mod" : 1,
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Mend" : {
        "description" : "Restores 10 HP.",
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Physic" : {
        "description" : "Restores 8 HP to target 2 spaces away.",
        "range": 2,
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Pivot" : {
        "description" : "Unit moves to opposite side of adjacent ally.",
        "weapon_restrict" : "Staff",
        "type" : "movement"
    },
    "Rally Attack" : {
        "description" : "Grants Atk+4 to an adjacent ally until the end of the turn.",
        "weapon_restrict" : "Staff"
    },
    "Rally Defense" : {
        "description" : "Grants Def+4 to an adjacent ally until the end of the turn.",
        "weapon_restrict" : "Staff"
    },
    "Rally Resistance" : {
        "description" : "Grants Res+4 to an adjacent ally until the end of the turn.",
        "weapon_restrict" : "Staff"
    },
    "Rally Speed" : {
        "description" : "Grants Spd+4 to an adjacent ally until the end of the turn.",
        "weapon_restrict" : "Staff"
    },
    "Reciprocal Aid" : {
        "description" : "Swap HP with adjacent ally (neither unit can go above their max HP).",
        "weapon_restrict" : "Staff",
        "type" : "heal"
    },
    "Reconcile" : {
        "description" : "Restores 7 HP each to target and this unit.",
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Recover" : {
        "description" : "Restores 15 HP. Slows Special trigger (cooldown count +1).",
        "spec_cooldown_mod" : 1,
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Rehabilitate" : {
        "description" : "Restores 7 HP or more the further below 50% the target's HP is. Slows Special trigger (cooldown count+1).",
        "spec_cooldown_mod" : 1,
        "weapon_unique" : "Staff",
        "type" : "heal"
    },
    "Reposition" : {
        "description" : "Moves adjacent ally to opposite side of unit.",
        "weapon_restrict" : "Staff",
        "type" : "movement"
    },
    "Shove" : {
        "description" : "Push adjacent ally 1 space away.",
        "weapon_restrict" : "Staff",
        "type" : "movement"
    },
    "Sing" : {
        "description" : "Enables target to take another action. Cannot be used on units with Sing or Dance.",
        "char_unique" : true
    },
    "Smite" : {
        "description" : "Push adjacent ally 2 spaces away.",
        "weapon_restrict" : "Staff",
        "type" : "movement"
    },
    "Swap" : {
        "description" : "Swap places with adjacent ally.",
        "weapon_restrict" : "Staff",
        "type" : "movement"
    }
};