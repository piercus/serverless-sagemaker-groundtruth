const fs = require('fs').promises;
const tmp = require('tmp-promise');
const BbPromise = require('bluebird');
const loadFile = require('./load-file');
const invokeLamba = require('./invoke-lambda');

/**
* @typedef {Object} PostLambdaOutput
*/
/**
* @param {Array.<Object>} manifestRows js object reproesnting the manifest row
* @param {Function} lambda js function to use as post lambda function
* @param {String} labelAttributeName labelAttributeName to use as output of the postLambda function
* @param {String} [consolidationRequest=null] consolidationRequest or consolidationRequestData or eventFile must be defined
* @param {Object} [consolidationRequestData=null] consolidationRequest or consolidationRequestData or eventFile must be defined
* @param {String} [eventFile=null] consolidationRequest or consolidationRequestData or eventFile must be defined
* @returns {Promise.<Array.<PostLambdaOutput>>}
*/
module.exports = function ({
	manifestRows,
	consolidationRequest = null,
	consolidationRequestData = null,
	tmpConsolidationRequestFilename: temporaryConsolidationRequestFilename = null,
	eventFile = null,
	labelAttributeName = 'test',
	lambda,
	context
}) {
	let promiseBefore = BbPromise.resolve();

	if (consolidationRequestData) {
		consolidationRequest = true;

		if (temporaryConsolidationRequestFilename) {
			promiseBefore = promiseBefore.then(() => tmp.file().then(({path}) => path));
		} else {
			promiseBefore = promiseBefore.then(() => temporaryConsolidationRequestFilename);
		}

		promiseBefore = promiseBefore.then(path => {
			return fs.writeFile(path, JSON.stringify(consolidationRequestData))
				.then(() => {
					consolidationRequest = path;
				});
		});
	}

	let promiseEvent;

	if (consolidationRequest) {
		promiseEvent = promiseBefore.then(() => {
			return {
				labelAttributeName,
				roleArn: 'arn:aws:iam::<account_id>:role/service-role/<Exec_role>',
				version: '2018-10-06',
				outputConfig: '',
				labelingJobArn: '<job_arn>',
				payload: {
					s3Uri: consolidationRequest
				}
			};
		});
	} else if (eventFile) {
		promiseEvent = loadFile(eventFile).then(f => JSON.parse(f));
	} else {
		throw (new Error('consolidationRequestData or consolidationRequest or eventFile must be defined'));
	}

	return promiseEvent.then(event => {
		return invokeLamba({lambda, event, context}).then(result => {
			if (manifestRows.length !== result.length) {
				throw (new Error(`manifestRows and results should match (${manifestRows.length} vs ${result.length})`));
			}

			return manifestRows.map((r, index) => {
				return Object.assign({}, r, result[index].consolidatedAnnotation.content);
			});
		});
	});
};
