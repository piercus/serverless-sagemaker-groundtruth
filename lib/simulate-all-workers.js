const simulateOneWorker = require('./simulate-one-worker');
const BbPromise = require('bluebird');

module.exports = function (opts) {
	const {workerIds, manifestRow} = opts;
	return BbPromise.map(workerIds, workerId => {
		return simulateOneWorker(Object.assign({} , opts, {workerId}));
	}, {concurrency: 1})
		.then(annotations => {
			// Currently it only works one row per one row
			return [{
				datasetObjectId: '0',
				dataObject: {
					s3Uri: manifestRow['source-ref']
				},
				annotations
			}];
		});
};
