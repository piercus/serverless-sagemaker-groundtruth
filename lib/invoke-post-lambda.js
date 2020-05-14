const fs = require('fs').promises;
const tmp = require('tmp-promise');
const BbPromise = require('bluebird');
const loadFile = require('./load-file');
const invokeLamba = require('./invoke-lambda');

module.exports = function ({
	consolidationRequest = null,
	consolidationRequestData = null,
	eventFile = null,
	labelAttributeName = 'test',
	lambda
}) {
	let promiseBefore = BbPromise.resolve();

	if (consolidationRequestData) {
		consolidationRequest = true;
		promiseBefore = tmp.file().then(o => {
			return fs.writeFile(o.path, JSON.stringify(consolidationRequestData))
				.then(() => {
					consolidationRequest = o.path;
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
		return invokeLamba({lambda, event});
	});
};
