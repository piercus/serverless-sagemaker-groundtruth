module.exports = function (o) {
	if (typeof (o.left) !== 'number' || typeof (o.right) !== 'number') {
		throw (new TypeError('left and right should be defined'));
	}

	return {
		left: o.left,
		top: o.top,
		width: o.right - o.left,
		height: o.bottom - o.top
	};
};
