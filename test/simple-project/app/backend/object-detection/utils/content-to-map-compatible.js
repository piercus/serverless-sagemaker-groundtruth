module.exports = function (o) {
	if (typeof (o.left) !== 'number' || typeof (o.width) !== 'number') {
		throw (new TypeError('left and right should be defined'));
	}

	return {
		left: o.left,
		top: o.top,
		right: o.left + o.width,
		bottom: o.top + o.height
	};
};
