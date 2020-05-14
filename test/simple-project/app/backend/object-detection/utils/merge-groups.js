const mergeBoxes = require('./merge-boxes');
const duplicated = require('./duplicated');

module.exports = function ({groups, nWorkers}) {
	if (groups.length !== 2) {
		throw (new Error('not implemented ! yet ?!'));
	}

	const allBoxes = groups.map(l => l.boxes).reduce((a, b) => a.concat(b));

	return findBestGroupsFromBoxes({boxes: allBoxes.concat(), nWorkers});
};

const findBestGroupsFromBoxes = function ({boxes, nWorkers}) {
	const existing = boxes.map(b => {
		return {merged: mergeBoxes({boxes: [b], nWorkers}), boxes: [b]};
	});
	return findBestGroupsFromGroups({
		groups: existing,
		nWorkers
	});
};

const findBestGroupsFromGroups = function ({groups, cache = null, nWorkers}) {
	if (groups.length === 1) {
		return groups;
	}

	let max = 0;
	let maxIndexes = null;

	cache = groups.map((b1, i1) => groups.map((b2, i2) => {
		if (cache && cache[i1] && cache[i1][i2]) {
			return cache[i1][i2];
		}

		if (i2 > i1) {
			const allWorkerIds = b1.boxes.map(({workerId}) => workerId).concat(b2.boxes.map(({workerId}) => workerId));
			const dup = duplicated(allWorkerIds);
			if (dup.length === 0) {
				const boxes = b1.boxes.concat(b2.boxes);
				const m = {
					merged: mergeBoxes({boxes, nWorkers}),
					boxes
				};
				// Console.log('here it is', m.merged.confidence, m.boxes.length)
				if (m.merged.confidence > max && m.merged.confidence > b1.merged.confidence && m.merged.confidence > b2.merged.confidence) {
					maxIndexes = [i1, i2];
					max = m.merged.confidence;
				}

				return m;
			}

			return null;
		}

		return null;
	}));

	if (!maxIndexes) {
		// Console.log('no maxIndexes', cache, max, groups.map(g=> g.merged.confidence))
		return groups;
	}

	groups.splice(maxIndexes[1], 1);
	groups.splice(maxIndexes[0], 1);
	groups.push(cache[maxIndexes[0]][maxIndexes[1]]);

	cache.forEach(row => {
		row.splice(maxIndexes[1], 1);
		row.splice(maxIndexes[0], 1);
	});
	cache.splice(maxIndexes[1], 1);
	cache.splice(maxIndexes[0], 1);

	return findBestGroupsFromGroups({
		groups,
		cache,
		nWorkers
	});
};
