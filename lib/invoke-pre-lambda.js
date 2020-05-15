const invokeLamba = require('./invoke-lambda');

module.exports = function ({lambda, manifestRow}) {
	return invokeLamba({lambda, event: {dataObject: manifestRow}}).then(r => {
		return {task: {input: r.taskInput}};
	});
};
