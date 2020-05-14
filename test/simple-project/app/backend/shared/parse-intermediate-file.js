
module.exports = function ({dataset}) {
	const contents = dataset.annotations.map(annotation => {
		return JSON.parse(annotation.annotationData.content);
	});

	const workerIds = dataset.annotations.map(annotation => {
		return annotation.workerId;
	});

	return {
		contents,
		workerIds
	};
};
