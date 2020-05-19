const BbPromise = require('bluebird');

module.exports = function ({event, lambda, context = {}}) {

	return new BbPromise((resolve, reject) => {
		const response = lambda(event, context, err => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
		if (typeof (response) !== 'undefined') {
			return BbPromise.resolve(response).then(r => resolve(r)).catch(error => reject(error));
		}
	});
};
