
const consolidateRequest = require('./consolidate-request');
const retrieveS3File = require('./retrieve-s3-file');

module.exports = function ({consolidateFn}) {
	return function (event, context) { // eslint-disable-line no-unused-vars
		const {s3Uri} = event.payload;
		return retrieveS3File({s3Uri}).then(filecont => {
			const consolidationRequest = JSON.parse(filecont);
			return consolidateRequest({consolidationRequest, labelAttributeName: event.labelAttributeName, fn: consolidateFn, intermediateS3Uri: s3Uri});
		});
	};
};
