const url = require('url');
const fs = require('fs').promises;
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports = function ({s3Uri}) {
	let promise;
	try {
		const urlObject = new url.URL(s3Uri);
		const parameters = {
			Bucket: urlObject.host,
			Key: urlObject.pathname.replace(/^\//, '')
		};
		promise = s3.getObject(parameters).promise().then(response => {
			return response.Body.toString();
		});
	} catch (error) {
		if (error.message.match(/Invalid URL/)) {
			// Test local
			promise = fs.readFile(s3Uri).catch(error_ => {
				console.log(`Fallback on local fs system failed for ${s3Uri}`);
				throw (error_);
			});
		} else {
			console.log(error.message);
			throw (error);
		}
	}

	return promise;
};
