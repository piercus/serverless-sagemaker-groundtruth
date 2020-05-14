const connect = require('connect');
const Liquid = require('liquid');
const http = require('http');
const loadFile = require('./load-file');
const amazonS3URI = require('amazon-s3-uri');
const AWS = require('aws-sdk');

module.exports = function ({template, prelambdaOutput, port = 3000, region}) {
	const engine = new Liquid.Engine();

	const s3 = new AWS.S3({region});

	engine.registerFilters({
		grant_read_access: input => { // eslint-disable-line camelcase
			const {bucket, key} = amazonS3URI(input);
			return s3.getSignedUrl('getObject', {Bucket: bucket, Key: key});
		}
	});

	if (!template) {
		throw (new Error('template is mandatory'));
	}

	const app = connect();

	app.use((request, response) => {
		loadFile({s3Uri: template}).then(tmpl => {
			return engine
				.parseAndRender(
					tmpl,
					prelambdaOutput
				);
		})
			.then(result => response.end(result))
			.catch(error => {
				response.end('ERROR: ' + error);
			});
	});
	return new Promise((resolve, reject) => {
		const server = http.createServer(app).listen(port, err => {
			if (err) {
				return reject(err);
			}

			console.log(`Listening on port ${port}!`);
			resolve(server);
		});
	});
};
