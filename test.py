atk = 10
eff = 1
adv = 0
mit = 5
mit_mod = 0
classmod = 1

spec_boost = 0

off_mult = 0
def_mult = 0

eff_atk = int(atk * eff)
modded_mit = mit + int(mit * mit_mod)
dmg = eff_atk + int(eff_atk * adv) + spec_boost - modded_mit
total_damage = int(dmg * classmod) * (1 + off_mult)

print max(0, int(total_damage) + int(def_mult * total_damage))