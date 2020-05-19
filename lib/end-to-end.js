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

module.exports = function (opts) {
	
	const {
		preLambda,
		postLambda,
		manifestRow
	} = opts;
	
	return invokePreLambda(Object.assign({}, opts, {lambda: preLambda}))
		.then(prelambdaOutput => {
			return startServer(Object.assign({}, opts, {prelambdaOutput}));
		})
		.then(({server, url}) => {
			return simulateAllWorkers(Object.assign({}, opts, {url}))
				.finally(() => {
					console.log('Close server')
					return new Promise((resolve, reject) => server.close(err => {
						if (err) {
							return reject(err);
						}
						return resolve();
					}))
				})
		})
		.then(consolidationRequestData => {
			return invokePostLambda(Object.assign({}, opts, {lambda: postLambda, consolidationRequestData, manifestRows: [manifestRow]})).then(r => r[0]);
		});
};
