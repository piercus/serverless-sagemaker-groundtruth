/**
* @callback ConsolidationCallback
* @param {Array.<Any>} contents data from each worker
* @param {Array.<String>} workerIds name of the workers
* @param {Any} dataObject
*/

/**
* @param consolidationRequest see https://docs.aws.amazon.com/sagemaker/latest/dg/sms-custom-templates-step3.html#sms-custom-templates-step3-postlambda
* @param {String} labelAttributeName
* @param {ConsolidationCallback} fn
* @returns {Object} see https://docs.aws.amazon.com/sagemaker/latest/dg/sms-custom-templates-step3.html#sms-custom-templates-step3-postlambda
*/
const parseIntermediateFile = require('./parse-intermediate-file');

module.exports = function ({consolidationRequest, labelAttributeName, fn, intermediateS3Uri}) {
	return Promise.all(consolidationRequest.map((dataset, index) => {
		return Promise.resolve(fn(
			Object.assign(
				parseIntermediateFile({dataset}),
				{
					intermediateS3Uri,
					intermediateS3Index: index,
					dataObject: dataset.dataObject
				}
			)
		)).then(consolidated => {
			const label = {
				datasetObjectId: dataset.datasetObjectId,
				consolidatedAnnotation: {
					content: {
						[labelAttributeName]: consolidated
					}
				}
			};
			return label;
		});
	}));
};
