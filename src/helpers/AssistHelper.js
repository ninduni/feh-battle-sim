import { MoveAssistHelper } from 'helpers/assists/MoveAssistHelper';
import { HealingHelper } from 'helpers/assists/HealingHelper';
import { MiscAssistHelper } from 'helpers/assists/MiscAssistHelper';

export function runAssist(game, assister, target, assistPos) {
    if (assister.assist === '') return false;
    switch (assister.assistData.type) {
        case 'movement':
            let move = new MoveAssistHelper(game, assister, target, assistPos);
            // Depending on the movement assist, assister pos might change
            return move.movementAssist();
        case 'heal':
            let heal = new HealingHelper(game, assister, target);
            heal.healAssist();
            return false;
        default:
            let misc = new MiscAssistHelper(game, assister, target);
            misc.miscAssist();
            return false;
    }
}
