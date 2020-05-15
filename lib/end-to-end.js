const invokePreLambda = require('./invoke-pre-lambda');
const startServer = require('./start-server');
const invokePostLambda = require('./invoke-post-lambda');
const simulateAllWorkers = require('./simulate-all-workers');

/**
* @param {String} template path to the liquid template file
* @param {Object} manifestRow js object reproesnting the manifest row
* @param {Function} preLambda js function to use as pre lambda function
* @param {Number} [port=3000]  port to use to serve the web page
* @param {Function} postLambda js function to use as post lambda function
* @param {String} labelAttributeName labelAttributeName to use as output of the postLambda function
* @param {Array.<String>} workerIds js function to use as post lambda function
* @param {PuppeteerModule} puppeteerMod module that simulate the behavior of a worker
* @returns {Promise.<PostLambdaOutput>}
*/

module.exports = function ({
	template,
	labelAttributeName,
	manifestRow,
	preLambda,
	postLambda,
	workerIds,
	puppeteerMod,
	port = 3000
}) {
	return invokePreLambda({manifestRow, lambda: preLambda})
		.then(prelambdaOutput => {
			return startServer({
				template,
				prelambdaOutput,
				port
			});
		})
		.then(({server, url}) => {
			return simulateAllWorkers({
				workerIds,
				manifestRow,
				puppeteerMod,
				url
			})
				.then(consolidationRequestData => {
					return new Promise((resolve, reject) => server.close(err => {
						if (err) {
							return reject(err);
						}

						return resolve();
					}))
						.then(() => consolidationRequestData);
				});
		})
		.then(consolidationRequestData => {
			return invokePostLambda({
				lambda: postLambda,
				labelAttributeName,
				manifestRows: [manifestRow],
				consolidationRequestData
			}).then(r => r[0]);
		});
};
