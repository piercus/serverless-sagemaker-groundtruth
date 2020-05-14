const groupBoxesFromCouples = require('./group-boxes-from-couples');
const matchCoupleBoxes = require('./match-couple-boxes');
const mergeBoxes = require('./merge-boxes');
const boxIndexesToId = require('./box-indexes-to-id');
const duplicated = require('./duplicated');
const getCouples = function (length) {
	const result = [];
	for (let i = 0; i < length; i++) {
		for (let j = i + 1; j < length; j++) {
			result.push([i, j]);
		}
	}

	return result;
};

const uniq = array => array.filter((a, i) => array.indexOf(a) === i);

module.exports = function ({contents, dataObject, workerIds, iouThreshold = 0.5}) {
	if (iouThreshold < 0.5) {
		// MergeBoxes of 2 boxes with iouThreshold < 0.5 might lead to confidence score < each boxes confidences
		throw (new Error('iouThreshold should be greater than 0.5 to garantee algorithm consistency'));
	}

	const nWorkers = contents.length;
	const labels = uniq(contents.map(c => c.boundingBoxes.map(t => t.label)).reduce((a, b) => a.concat(b)));
	const couplesIndexes = getCouples(contents.length);
	// Console.log({labels})
	let allLabelsResult = [];

	labels.forEach(l => {
		const totalBoxes = contents.map(c => c.boundingBoxes.filter(t => t.label === l).length).reduce((a, b) => a + b, 0);
		let allCouplesBoxesSorted;
		if (nWorkers === 1) {
			const preds = contents[0].boundingBoxes.filter(t => t.label === l);
			const localWorkerIds = [workerIds[0]];
			const matched = matchCoupleBoxes(preds, [], {iouThreshold});
			matched.forEach(({boxes}) => boxes.forEach(b => {
				b.workerId = localWorkerIds[b.workerId];
			}));
			allCouplesBoxesSorted = matched.map(a => a.boxes);
		} else {
			allCouplesBoxesSorted = couplesIndexes
				.map(([i0, i1]) => {
					const preds0 = contents[i0].boundingBoxes.filter(t => t.label === l);
					const preds1 = contents[i1].boundingBoxes.filter(t => t.label === l);

					const localWorkerIds = [workerIds[i0], workerIds[i1]];
					const matched = matchCoupleBoxes(preds0, preds1, {iouThreshold});
					matched.forEach(({boxes}) => boxes.forEach(b => {
						b.workerId = localWorkerIds[b.workerId];
					}));
					// Console.log([i0,i1], preds0.length, preds1.length, matched)
					return matched;
				})
				.reduce((a, b) => a.concat(b), [])
				.sort((a, b) => a.dist - b.dist)
				.map(a => a.boxes);
		}

		const aloneBoxes = allCouplesBoxesSorted.filter(boxes => boxes.length === 1);
		const coupleBoxes = allCouplesBoxesSorted.filter(boxes => boxes.length === 2);
		// Console.log(coupleBoxes.filter(c => c.filter(({workerId, boxIndex}) => workerId === 3 && boxIndex === 3).length > 0))
		// console.log(`alone is ${aloneBoxes.length}, couples is ${coupleBoxes.length} (${coupleBoxes.length*2})`)
		const groups = groupBoxesFromCouples({
			coupleBoxes,
			nWorkers
		});
		// Console.log('alone boxes', groups.filter(b=> b.boxes.length === 1).map(b => b.boxes[0]))

		const boxIds = groups.map(g => g.boxes.map(o => boxIndexesToId(o))).reduce((a, b) => a.concat(b), []);
		const dups = duplicated(boxIds);
		if (dups.length > 0) {
			console.log({dups, groups: groups.map(g => g.boxes.map(o => boxIndexesToId(o)))});
			throw (new Error('should not output any duplicated box'));
		}

		const aloneBoxesIds = aloneBoxes.map(b => boxIndexesToId(b[0]));
		const remainingAlone = uniq(aloneBoxesIds)
			.filter(bId => !boxIds.includes(bId))
			.map(bId => {
				const boxes = aloneBoxes[aloneBoxesIds.indexOf(bId)];
				return {boxes, merged: mergeBoxes({boxes, nWorkers})};
			});

		// Console.log(`${remainingAlone.length} remains alone`)

		const result = groups.concat(remainingAlone);

		// Uncomment for logging
		//
		// const byNumber = new Array(nWorkers).fill(1).map((_,i) => ({
		// 	count: res.filter(({boxes}) => boxes.length === i+1).length,
		// 	nWorkers: i+1
		// }));
		// console.log(`${res.length} groups of total (${res.map(r => r.boxes.length).reduce((a,b) => a+b, 0)}) (${byNumber.map(({count, nWorkers}) => nWorkers+': '+count).join(', ')})`);

		const totalBoxesEnd = result.map(r => r.boxes.length).reduce((a, b) => a + b, 0);
		if (totalBoxesEnd !== totalBoxes) {
			console.log(groups, aloneBoxes, aloneBoxesIds, contents, nWorkers, remainingAlone);
			throw (new Error(`Cannot find expected number of boxes expecting ${totalBoxes} but got ${totalBoxesEnd}`));
		}

		allLabelsResult = allLabelsResult.concat(result.map(r => Object.assign({}, r, {label: l})));
	});
	return Object.assign({}, {annotations: allLabelsResult}, {dataObject});
};
