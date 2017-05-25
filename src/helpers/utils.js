export function createArray(length) {
    var arr = new Array(length || 0).fill(0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

export function pairsWithinNSpaces(x, y, maxX, maxY, N) {
	// Given a grid of size maxX, maxY, return a list of points that are
	// exactly N spaces from the point (x,y)
	var range = _.range(-N, N + 1);
	var permutes = getPermutation([range, range]);
	var result = [];
	permutes.forEach(function(p) {
		var split = p.split(',');
		var offsetX = parseInt(split[0]),
			offsetY = parseInt(split[1]);

		var newX = _.clamp(offsetX + x, 0, maxX - 1),
			newY = _.clamp(offsetY + y, 0, maxY - 1);

		if (d({x: newX, y: newY}, {x: x, y: y}) === N) {
			result.push({x: newX, y: newY});
		}
	});
	return unique2D(result);
}

function d(p1, p2) {
	return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

export function unique2D(arr) {
	return _.uniqBy(arr, function(item) {
		return JSON.stringify(item);
	});
}

export function getPermutation(array, prefix) {
    prefix = prefix || '';
    if (!array.length) {
        return prefix;
    }

    var result = array[0].reduce(function (result, value) {
    	var div = (prefix) ? ',' : '';
        return result.concat(getPermutation(array.slice(1), prefix + div + value));
    }, []);
    return result;
}

export function rgbToHex(r, g, b) {
	return "0x" + ((1 << 24) + (r << 16) + (g << 8) + (b)).toString(16).slice(1);
}

export function printGrid(grid) {
	for (var y = 0; y < grid.length; y++) {
    	console.log(JSON.stringify(grid[y]) + ' ' + y);
    }
    console.log('');
}

export function gridFromList(list, maxX, maxY) {
	// Given a list of {x, y} objects, return a grid with items in the list marked with 1s
	var grid = createArray(maxY, maxX);
	list.forEach(function(item) {
		grid[item.y][item.x] = 1;
	});
	return grid;
}

// rounds numbers up or down, rounds to closest int if the difference is less than 0.01
// unrounded is the number to round, roundUp is true if we need to round up
export function roundNum(unrounded, roundUp) {
    if (roundUp) {
        if (unrounded - Math.floor(unrounded) < 0.01) {
            return Math.floor(unrounded);
        } else {
            return Math.ceil(unrounded);
        }
    } else if (Math.ceil(unrounded) - unrounded < 0.01) {
        return Math.ceil(unrounded);
    }

    return Math.floor(unrounded);
}

export function isMovable(unit, unitDest, ignoreUnit=false) {
    // Checks whether a unit can move onto a square
    switch(unit.movementType) {
        case 'Infantry':
        case 'Armor':
            if (![1, 2].includes(unitDest.terrain)) return false;
            break;
        case 'Cavalry':
            if (![1].includes(unitDest.terrain)) return false;
            break;
        case 'Flying':
            if (![1, 2, 3].includes(unitDest.terrain)) return false;
            break;
    }
    if (unitDest.unit !== 0 && !ignoreUnit) return false;
    return true;
}

export function movementVector(attacker, target, away) {
    // Returns a vector representing which direction moves towards (or away from) enemy
    var xDiff = target.x - attacker.x,
        yDiff = target.y - attacker.y,
        vec;
    if (xDiff && yDiff) {
        // Something's wrong, not adjacent, movement skills not allowed on range
        console.log('MOVEMENT SKILL NOT ALLOWED ON RANGE UNIT');
    } else if (xDiff > 0) {
        vec = {x: 1, y: 0};
    } else if (xDiff < 0) {
        vec = {x: -1, y: 0};
    } else if (yDiff > 0) {
        vec = {x: 0, y: 1};
    } else if (yDiff < 0) {
        vec = {x: 0, y: -1};
    }
    return {x: vec.x * Math.pow(-1, away), y: vec.y * Math.pow(-1, away)};
}

export function isOutsideGrid(game, gridX, gridY) {
    return (gridX < 0 || gridX >= game.maxGridX || gridY < 0 || gridY >= game.maxGridY);
}

export function toGrid(i) {
    return Math.floor(i / 90);
}

export function fromGrid(i) {
    return (i * 90) + 45;
}

export function distance(unitA, unitB) {
    return Math.abs(toGrid(unitA.x) - toGrid(unitB.x)) + Math.abs(toGrid(unitA.y) - toGrid(unitB.y));
}
