
const retrieveS3File = require('./retrieve-s3-file');
const parseIntermediateFile = require('./parse-intermediate-file');

module.exports = function ({intermediateS3Uri, intermediateS3Index}) {
	return retrieveS3File({s3Uri: intermediateS3Uri}).then(filecont => {
		const consolidationRequest = JSON.parse(filecont.toString());
		const index = Number.parseInt(intermediateS3Index, 10);
		if (Number.isNaN(index)) {
			throw (new TypeError(`Invalid intermediateS3Index : ${intermediateS3Index}`));
		}

		if (index >= consolidationRequest.length || !Array.isArray(consolidationRequest)) {
			throw (new Error(`Cannot find index ${intermediateS3Index} in ${intermediateS3Uri}`));
		}

		const dataset = consolidationRequest[index];
		return Object.assign(parseIntermediateFile({
			dataset
		}), {intermediateS3Uri, intermediateS3Index});
	});
};
