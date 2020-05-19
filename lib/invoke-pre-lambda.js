const invokeLamba = require('./invoke-lambda');

module.exports = function ({lambda, manifestRow, context}) {
	return invokeLamba({lambda, event: {dataObject: manifestRow}, context}).then(r => {
		return {task: {input: r.taskInput}};
	});
};
