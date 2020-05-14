const boxKeys = ['left', 'top', 'width', 'height'];
const mAP = require('mean-average-precision');
const contentToMapCompatible = require('./content-to-map-compatible');
const uniq = require('./uniq');
module.exports = function ({nWorkers, boxes}) {
	if (typeof (nWorkers) !== 'number') {
		throw (new TypeError('nWorkers is mandatory'));
	}

	if (boxes.length > nWorkers) {
		console.log({boxes});
		throw (new Error(`boxes ${boxes.length} should be less than nWorkers ${3}`));
	}

	if (uniq(boxes.map(b => b.workerId)).length !== boxes.length) {
		throw (new Error('workerIds should be uniques'));
	}

	if (boxes.length === 0) {
		throw (new Error('boxes should not be empty'));
	}

	if (!Array.isArray(boxes)) {
		throw (new TypeError('boxes should be an array'));
	}

	if (boxes.length === 1) {
		const r = Object.assign({}, boxes[0], {confidence: 1 / nWorkers});
		delete r.workerId;
		delete r.boxIndex;
		return r;
	}

	const getWeight = function (me, others) {
		if (others.length === 0) {
			return 1;
		}

		const meMap = contentToMapCompatible(me);
		return others.map(o => contentToMapCompatible(o)).map(c => mAP.iou(c, meMap)).reduce((a, b) => a + b) / others.length;
	};

	const weights = boxes.map((b, index) => getWeight(b, boxes.slice(0, index).concat(boxes.slice(index + 1))));

	const sumBox = boxes
		.map((box, index) => {
			const result = {weight: weights[index]};
			boxKeys.forEach(k => {
				result[k] = box[k] * weights[index];
			});
			return result;
		})
		.reduce((a, b) => {
			const result = {weight: a.weight + b.weight};
			result.label = a.label;
			boxKeys.forEach(k => {
				result[k] = a[k] + b[k];
			});
			return result;
		});
	if (typeof (boxes[0].label) !== 'string') {
		throw (new TypeError('Label must be a string'));
	}

	const avBox = {
		label: boxes[0].label
	};
	boxKeys.forEach(k => {
		if (sumBox.weight === 0) {
			avBox[k] = sumBox[k];
		} else {
			avBox[k] = sumBox[k] / sumBox.weight;
		}
	});
	const mapCompatibleAv = contentToMapCompatible(avBox);

	const ious = boxes.map(o => contentToMapCompatible(o)).map(mAPBox => mAP.iou(mapCompatibleAv, mAPBox));

	const confidence = ious.reduce((a, b) => a + b, 0) / nWorkers;
	if (Number.isNaN(confidence)) {
		throw (new TypeError('confidence should not be NaN'));
	}

	return Object.assign({}, avBox, {confidence});
};
