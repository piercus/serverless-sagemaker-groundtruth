const simulateOneWorker = require('./simulate-one-worker');
const BbPromise = require('bluebird');

module.exports = function ({workerIds, prelambdaOutput, manifestRow, puppeteerMod, url}) {
	return BbPromise.map(workerIds, workerId => {
		return simulateOneWorker({workerId, prelambdaOutput, manifestRow, puppeteerMod, url});
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
