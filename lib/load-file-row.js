const loadFile = require('./load-file');

module.exports = function ({s3Uri, rowIndex = 0}) {
	return loadFile({s3Uri}).then(r => r.toString().split('\n')[rowIndex]);
};
