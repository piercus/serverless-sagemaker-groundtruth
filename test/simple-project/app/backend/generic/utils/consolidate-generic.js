
module.exports = function ({contents, dataObject, workerIds}) {
	return Object.assign({}, {
		annotations: contents.map((c, index) => Object.assign({}, c, {workerId: workerIds[index]}))
	}, {dataObject});
};
