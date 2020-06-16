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

module.exports = function (options) {
	const {
		preLambda,
		postLambda,
		manifestRow
	} = options;

	return invokePreLambda(Object.assign({}, options, {lambda: preLambda}))
		.then(prelambdaOutput => {
			return startServer(Object.assign({}, options, {prelambdaOutput}));
		})
		.then(({server, url}) => {
			return simulateAllWorkers(Object.assign({}, options, {url}))
				.finally(() => { // eslint-disable-line promise/no-return-in-finally
					console.log('Close server');
					return new Promise((resolve, reject) => server.close(err => {
						if (err) {
							return reject(err);
						}

						return resolve();
					}));
				});
		})
		.then(consolidationRequestData => {
			return invokePostLambda(Object.assign({}, options, {lambda: postLambda, consolidationRequestData, manifestRows: [manifestRow]})).then(r => r[0]);
		});
};
