const munkres = require('munkres-js');
const mAP = require('mean-average-precision');
const contentToMapCompatible = require('./content-to-map-compatible');

const squarify = function (mat1, fullfill = 0) {
	let newColIndexes = [];
	let newRowIndexes = [];

	const mat = mat1.concat().map(r => r.concat());
	if (mat.length > mat[0].length) {
		const colstoAdd = mat.length - mat[0].length;
		newColIndexes = new Array(colstoAdd).fill(1).map((_, i) => i + mat[0].length);
		mat.forEach(r => {
			r.push(...(new Array(colstoAdd).fill(fullfill)));
		});
	} else if (mat.length < mat[0].length) {
		const rowsToAdd = mat[0].length - mat.length;
		newRowIndexes = new Array(rowsToAdd).fill(1).map((_, i) => i + mat.length);

		mat.push(...new Array(rowsToAdd).fill(1).map(() => new Array(mat[0].length).fill(fullfill)));
	}

	return {
		newColIndexes,
		newRowIndexes,
		matrix: mat
	};
};

module.exports = function (preds0, preds1, {iouThreshold}) {
	if (preds0.length === 0) {
		return preds1.map((p, index) => ({
			boxes: [Object.assign({}, {workerId: 1, boxIndex: index}, preds1[index])],
			dist: 1
		}));
	}

	if (preds1.length === 0) {
		return preds0.map((p, index) => ({
			boxes: [Object.assign({}, {workerId: 0, boxIndex: index}, preds0[index])],
			dist: 1
		}));
	}

	const m1 = preds1.map(o => contentToMapCompatible(o));
	const inverseIouMatrix = preds0.map(o => contentToMapCompatible(o)).map(p0 => m1.map(p1 => (1 - mAP.iou(p0, p1))));
	const {matrix, newColIndexes, newRowIndexes} = squarify(inverseIouMatrix);

	const matches = munkres(matrix);

	const matchingTest = ([row, col]) => (!newColIndexes.includes(col) && !newRowIndexes.includes(row) && matrix[row][col] <= (1 - iouThreshold));

	const matched = matches
		.filter(o => matchingTest(o))
		.map(([row, col]) => {
			return {
				boxes: [Object.assign({}, {workerId: 0, boxIndex: row}, preds0[row]), Object.assign({}, {workerId: 1, boxIndex: col}, preds1[col])],
				dist: inverseIouMatrix[row][col]
			};
		});

	const nonMatched = matches.filter(o => !matchingTest(o))
		.map(([row, col]) => {
			const result = [];
			if (!newColIndexes.includes(col)) {
				result.push({
					boxes: [Object.assign({}, {workerId: 1, boxIndex: col}, preds1[col])],
					dist: 1
				});
			}

			if (!newRowIndexes.includes(row)) {
				result.push({
					boxes: [Object.assign({}, {workerId: 0, boxIndex: row}, preds0[row])],
					dist: 1
				});
			}

			return result;
		}).reduce((a, b) => a.concat(b), []);

	return matched.sort((a, b) => a.dist - b.dist).concat(nonMatched);
};
