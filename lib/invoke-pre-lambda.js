const invokeLamba = require('./invoke-lambda');

module.exports = function ({lambda, manifestRow, labelingJobArn, context}) {
	return invokeLamba({lambda, event: {dataObject: manifestRow, labelingJobArn}, context}).then(r => {
		return {task: {input: r.taskInput}};
	});
};
