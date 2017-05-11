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

export function attackRangeLookup(weaponType) {
	switch(weaponType) {
		case 'sword':
		case 'axe':
		case 'lance':
		case 'redDragon':
		case 'blueDragon':
		case 'greenDragon':
			return 1;
		case 'bow':
		case 'dagger':
		case 'redTome':
		case 'blueTome':
		case 'greenTome':
		case 'staff':
			return 2;
	}
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
